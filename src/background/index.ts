import {
  CDPExtractor,
  type CDPCSSRule,
  type CDPCSSProperty,
  type CDPKeyframeRule,
  type CDPInteractionState,
} from '../lib/cdpExtractor'
import { formatForLLM } from '../lib/llmFormatter'
import { saveDecomposition } from '../lib/storage'
import type { PageDecomposition, ComponentCSS } from '../lib/pageDecomposer'

console.log('Sneaky Rat background script is running')

interface ExtractionOptions {
  includeAnimations?: boolean
  includeHoverStates?: boolean
}

/**
 * Extract element using CDP
 * This runs in the background script because CDP debugger can only be used here
 */
async function extractElementWithCDP(
  tabId: number,
  elementPath: string,
  html: string,
  options: ExtractionOptions = {}
) {
  const extractor = new CDPExtractor(tabId)

  try {
    // Attach debugger
    await extractor.attach()

    // Enable domains
    await extractor.enableDOM()
    await extractor.enableCSS()

    // Get document root
    const { nodeId: rootNodeId } = await extractor.getDocument()

    // Find the target element
    const nodeId = await extractor.querySelector(rootNodeId, elementPath)

    if (!nodeId) {
      console.error('Element not found with path:', elementPath)
      return null
    }

    // Extract styles for the root element
    const rootResult = await extractor.getMatchedStylesForNode(nodeId)
    console.log(`Root element has ${rootResult.matchedRules.length} CSS rules`)

    // Get ALL descendant node IDs
    const allNodeIds = await extractor.getAllDescendantNodeIds(nodeId)
    console.log(`Found ${allNodeIds.length} descendant nodes to process`)

    // Track stats
    let processedNodes = 0
    let failedNodes = 0
    let rulesAdded = 0

    // Extract styles for all descendants and merge
    for (const descendantNodeId of allNodeIds) {
      try {
        const descendantResult = await extractor.getMatchedStylesForNode(descendantNodeId)
        processedNodes++

        // Merge matched rules (avoid duplicates)
        for (const rule of descendantResult.matchedRules) {
          const exists = rootResult.matchedRules.find(
            r => r.selectorText === rule.selectorText && r.styleSheetId === rule.styleSheetId
          )
          if (!exists) {
            rootResult.matchedRules.push(rule)
            rulesAdded++
          }
        }

        // Merge pseudo-elements
        for (const pseudo of descendantResult.pseudoElements) {
          const exists = rootResult.pseudoElements.find(p => p.pseudoType === pseudo.pseudoType)
          if (!exists) {
            rootResult.pseudoElements.push(pseudo)
          }
        }
      } catch {
        // Skip nodes that fail (e.g., text nodes, comments)
        failedNodes++
        continue
      }
    }

    console.log(`✅ Extraction complete:`)
    console.log(`  - Processed: ${processedNodes}/${allNodeIds.length} nodes`)
    console.log(`  - Failed: ${failedNodes} nodes`)
    console.log(`  - Total CSS rules: ${rootResult.matchedRules.length} (added ${rulesAdded} from descendants)`)
    console.log(`  - Pseudo-elements: ${rootResult.pseudoElements.length}`)

    // Extract keyframe animations if enabled
    if (options.includeAnimations) {
      console.log('  - Extracting keyframe animations...')
      const keyframes = await extractor.extractKeyframesForElement(
        rootResult.matchedRules,
        rootResult.inlineStyles
      )
      rootResult.keyframeRules = keyframes
      console.log(`  - Found ${keyframes.length} keyframe animations`)
    }

    // Extract interaction states if enabled
    if (options.includeHoverStates) {
      console.log('  - Extracting interaction states (:hover, :focus, :active, :focus-visible)...')
      const interactionStates = await extractor.extractInteractionStates(nodeId)
      rootResult.interactionStates = interactionStates
      console.log(`  - Found ${interactionStates.length} interaction states`)
    }

    // Format for LLM
    const formatted = formatForLLM(html, rootResult)

    return formatted
  } catch (error) {
    console.error('CDP extraction failed:', error)
    return null
  } finally {
    // Always detach debugger
    await extractor.detach()
  }
}

/**
 * Extract CSS for all components in a page decomposition
 */
async function extractCSSForDecomposition(
  tabId: number,
  decomposition: PageDecomposition
): Promise<PageDecomposition | null> {
  const extractor = new CDPExtractor(tabId)

  try {
    await extractor.attach()
    await extractor.enableDOM()
    await extractor.enableCSS()

    const { nodeId: rootNodeId } = await extractor.getDocument()

    // Extract CSS for significant components (limit to avoid timeout)
    const componentsToExtract = Object.values(decomposition.components)
      .filter(c => c.depth <= 4) // Only extract up to depth 4
      .slice(0, 100) // Limit to 100 components

    const total = componentsToExtract.length
    console.log(`Extracting CSS for ${total} components...`)

    let extracted = 0
    let processed = 0

    for (const component of componentsToExtract) {
      processed++

      // Send progress update every 5 components
      if (processed % 5 === 0 || processed === total) {
        void chrome.tabs.sendMessage(tabId, {
          type: 'DECOMPOSITION_PROGRESS',
          current: processed,
          total: total,
        })
      }

      try {
        const nodeId = await extractor.querySelector(rootNodeId, component.selector)
        if (!nodeId) continue

        const result = await extractor.getMatchedStylesForNode(nodeId)

        // Convert to ComponentCSS format
        const css: ComponentCSS = {
          rules: result.matchedRules.map(rule => ({
            selector: rule.selectorText,
            properties: Object.fromEntries(
              rule.cssProperties.map(p => [p.name, p.value])
            ),
          })),
          pseudoElements: result.pseudoElements.map(pseudo => ({
            type: pseudo.pseudoType,
            properties: Object.fromEntries(
              pseudo.rules.flatMap(r => r.cssProperties.map(p => [p.name, p.value]))
            ),
          })),
          keyframes: [],
          interactionStates: [],
        }

        // Update component in decomposition
        decomposition.components[component.id].css = css
        decomposition.components[component.id].cssExtracted = true
        extracted++
      } catch {
        // Skip components that fail
        continue
      }
    }

    console.log(`✅ Extracted CSS for ${extracted}/${total} components`)

    // Update stats
    decomposition.stats.extractedWithCSS = extracted

    return decomposition
  } catch (error) {
    console.error('CSS extraction for decomposition failed:', error)
    return null
  } finally {
    await extractor.detach()
  }
}

interface MultiElementResult {
  html: string
  matchedRules: CDPCSSRule[]
  pseudoElements: { pseudoType: string; rules: CDPCSSRule[] }[]
  inlineStyles: CDPCSSProperty[]
  keyframeRules: CDPKeyframeRule[]
  interactionStates: CDPInteractionState[]
}

/**
 * Extract multiple elements using CDP
 */
async function extractMultipleElementsWithCDP(
  tabId: number,
  elements: { selector: string; html: string }[],
  options: ExtractionOptions = {}
) {
  const extractor = new CDPExtractor(tabId)

  try {
    // Attach debugger
    await extractor.attach()

    // Enable domains
    await extractor.enableDOM()
    await extractor.enableCSS()

    // Get document root
    const { nodeId: rootNodeId } = await extractor.getDocument()

    // Collect all extraction results
    const allResults: MultiElementResult[] = []

    for (const element of elements) {
      console.log(`Extracting element: ${element.selector}`)

      // Find the target element
      const nodeId = await extractor.querySelector(rootNodeId, element.selector)

      if (!nodeId) {
        console.warn('Element not found:', element.selector)
        continue
      }

      // Extract styles for the root element
      const result = await extractor.getMatchedStylesForNode(nodeId)

      // Get ALL descendant node IDs
      const allNodeIds = await extractor.getAllDescendantNodeIds(nodeId)

      // Extract styles for all descendants and merge
      for (const descendantNodeId of allNodeIds) {
        try {
          const descendantResult = await extractor.getMatchedStylesForNode(descendantNodeId)

          // Merge matched rules (avoid duplicates)
          for (const rule of descendantResult.matchedRules) {
            const exists = result.matchedRules.find(
              (r) => r.selectorText === rule.selectorText && r.styleSheetId === rule.styleSheetId
            )
            if (!exists) {
              result.matchedRules.push(rule)
            }
          }

          // Merge pseudo-elements
          for (const pseudo of descendantResult.pseudoElements) {
            const exists = result.pseudoElements.find((p) => p.pseudoType === pseudo.pseudoType)
            if (!exists) {
              result.pseudoElements.push(pseudo)
            }
          }
        } catch {
          continue
        }
      }

      // Extract keyframe animations if enabled
      if (options.includeAnimations) {
        const keyframes = await extractor.extractKeyframesForElement(
          result.matchedRules,
          result.inlineStyles
        )
        result.keyframeRules = keyframes
      }

      // Extract interaction states if enabled
      if (options.includeHoverStates) {
        const interactionStates = await extractor.extractInteractionStates(nodeId)
        result.interactionStates = interactionStates
      }

      allResults.push({
        html: element.html,
        ...result,
      })
    }

    console.log(`✅ Multi-element extraction complete: ${allResults.length} elements`)

    // Format combined results for LLM
    const formatted = formatMultipleForLLM(allResults)

    return formatted
  } catch (error) {
    console.error('Multi-element CDP extraction failed:', error)
    return null
  } finally {
    // Always detach debugger
    await extractor.detach()
  }
}

/**
 * Format multiple extraction results for LLM output
 */
function formatMultipleForLLM(
  results: MultiElementResult[]
): { markdown: string; standaloneHTML: string } {
  let markdown = `# Extracted UI Elements (${results.length} components)\n\n`

  // Merge all CSS rules (deduplicated)
  const allRules = new Map<string, CDPCSSRule>()
  const allPseudo: { pseudoType: string; rules: CDPCSSRule[] }[] = []
  const allKeyframes = new Map<string, CDPKeyframeRule>()
  const allInteractionStates: CDPInteractionState[] = []

  for (const result of results) {
    for (const rule of result.matchedRules) {
      const key = `${rule.selectorText}|${rule.styleSheetId || ''}`
      if (!allRules.has(key)) {
        allRules.set(key, rule)
      }
    }

    for (const pseudo of result.pseudoElements) {
      const exists = allPseudo.find((p) => p.pseudoType === pseudo.pseudoType)
      if (!exists) {
        allPseudo.push(pseudo)
      }
    }

    for (const kf of result.keyframeRules) {
      if (!allKeyframes.has(kf.name)) {
        allKeyframes.set(kf.name, kf)
      }
    }

    for (const state of result.interactionStates) {
      const exists = allInteractionStates.find((s) => s.state === state.state)
      if (!exists) {
        allInteractionStates.push(state)
      }
    }
  }

  // Build markdown
  markdown += `## Elements\n\n`
  results.forEach((result, index) => {
    markdown += `### Element ${index + 1}\n\n`
    markdown += '```html\n'
    markdown += result.html + '\n'
    markdown += '```\n\n'
  })

  // CSS Rules section
  if (allRules.size > 0) {
    markdown += '## Combined CSS Rules\n\n'
    markdown += '```css\n'

    for (const rule of allRules.values()) {
      if (rule.cssProperties.length === 0) continue
      markdown += `${rule.selectorText} {\n`
      for (const prop of rule.cssProperties) {
        markdown += `  ${prop.name}: ${prop.value};\n`
      }
      markdown += `}\n\n`
    }

    markdown += '```\n\n'
  }

  // Generate standalone HTML
  let standaloneHTML = '<!DOCTYPE html>\n'
  standaloneHTML += '<html lang="en">\n'
  standaloneHTML += '<head>\n'
  standaloneHTML += '  <meta charset="UTF-8">\n'
  standaloneHTML += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
  standaloneHTML += '  <title>Extracted UI Components</title>\n'
  standaloneHTML += '  <script src="https://cdn.tailwindcss.com"></script>\n'
  standaloneHTML += '  <style>\n'
  standaloneHTML += '    html { color-scheme: dark; }\n'
  standaloneHTML += '    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: #1a1b1e; color: #ececec; }\n'
  standaloneHTML += '    .component-wrapper { margin-bottom: 40px; padding: 20px; border: 1px solid #333; border-radius: 8px; }\n'
  standaloneHTML += '    .component-label { font-size: 12px; color: #888; margin-bottom: 16px; }\n\n'

  // Add all CSS rules
  for (const rule of allRules.values()) {
    if (rule.cssProperties.length === 0) continue
    standaloneHTML += `    ${rule.selectorText} {\n`
    for (const prop of rule.cssProperties) {
      standaloneHTML += `      ${prop.name}: ${prop.value};\n`
    }
    standaloneHTML += '    }\n\n'
  }

  // Add keyframes
  for (const kf of allKeyframes.values()) {
    standaloneHTML += `    @keyframes ${kf.name} {\n`
    for (const frame of kf.keyframes) {
      standaloneHTML += `      ${frame.offset} {\n`
      for (const prop of frame.properties) {
        standaloneHTML += `        ${prop.name}: ${prop.value};\n`
      }
      standaloneHTML += '      }\n'
    }
    standaloneHTML += '    }\n\n'
  }

  // Add interaction states
  for (const state of allInteractionStates) {
    for (const rule of state.rules) {
      if (rule.cssProperties.length === 0) continue
      standaloneHTML += `    ${rule.selectorText} {\n`
      for (const prop of rule.cssProperties) {
        standaloneHTML += `      ${prop.name}: ${prop.value};\n`
      }
      standaloneHTML += '    }\n\n'
    }
  }

  standaloneHTML += '  </style>\n'
  standaloneHTML += '</head>\n'
  standaloneHTML += '<body>\n'

  // Add each component wrapped
  results.forEach((result, index) => {
    standaloneHTML += `  <div class="component-wrapper">\n`
    standaloneHTML += `    <div class="component-label">Component ${index + 1}</div>\n`
    standaloneHTML += `    ${result.html}\n`
    standaloneHTML += `  </div>\n\n`
  })

  standaloneHTML += '</body>\n'
  standaloneHTML += '</html>\n'

  return { markdown, standaloneHTML }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (request.type === 'EXTRACT_MULTIPLE_WITH_CDP') {
    // Handle multi-element CDP extraction
    const tabId = sender.tab?.id
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID' })
      return true
    }

    const extractionOptions: ExtractionOptions = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      includeAnimations: (request.includeAnimations as boolean | undefined) ?? false,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      includeHoverStates: (request.includeHoverStates as boolean | undefined) ?? false,
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    void extractMultipleElementsWithCDP(tabId, request.elements, extractionOptions).then(
      (result) => {
        if (result) {
          sendResponse({ success: true, data: result })
        } else {
          sendResponse({ success: false, error: 'Multi-element extraction failed' })
        }
      }
    )

    return true // Keep channel open for async response
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (request.type === 'EXTRACT_WITH_CDP') {
    // Handle CDP extraction
    const tabId = sender.tab?.id
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID' })
      return true
    }

    const extractionOptions: ExtractionOptions = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      includeAnimations: (request.includeAnimations as boolean | undefined) ?? false,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      includeHoverStates: (request.includeHoverStates as boolean | undefined) ?? false,
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    void extractElementWithCDP(tabId, request.elementPath, request.html, extractionOptions).then((result) => {
      if (result) {
        sendResponse({ success: true, data: result })
      } else {
        sendResponse({ success: false, error: 'Extraction failed' })
      }
    })

    return true // Keep channel open for async response
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (request.type === 'DECOMPOSE_PAGE_WITH_CDP') {
    console.log('🐀 Background: Received DECOMPOSE_PAGE_WITH_CDP request')

    // Handle full page decomposition with CDP CSS extraction
    const tabId = sender.tab?.id
    if (!tabId) {
      console.error('🐀 Background: No tab ID')
      sendResponse({ success: false, error: 'No tab ID' })
      return true
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const decomposition = request.decomposition as PageDecomposition
    console.log('🐀 Background: Decomposition has', Object.keys(decomposition.components).length, 'components')

    void extractCSSForDecomposition(tabId, decomposition).then(async (enrichedDecomposition) => {
      if (enrichedDecomposition) {
        console.log('🐀 Background: CSS extraction successful')

        // Save to IndexedDB
        try {
          await saveDecomposition(enrichedDecomposition)
          console.log('🐀 Background: Decomposition saved to IndexedDB')
        } catch (err) {
          console.warn('🐀 Background: Failed to save to IndexedDB:', err)
        }

        console.log('🐀 Background: Sending success response')
        sendResponse({ success: true, data: enrichedDecomposition })
      } else {
        console.error('🐀 Background: CSS extraction failed')
        sendResponse({ success: false, error: 'CSS extraction failed' })
      }
    }).catch((err) => {
      console.error('🐀 Background: Exception in extraction:', err)
      sendResponse({ success: false, error: String(err) })
    })

    return true // Keep channel open for async response
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (request.type === 'DOWNLOAD_FILE') {
    // Handle file download using chrome.downloads API
    chrome.downloads.download(
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        url: request.dataUrl,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        filename: request.filename,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        saveAs: request.saveAs ?? false, // Let user choose location if saveAs is true
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError)
          sendResponse({ success: false, error: chrome.runtime.lastError.message })
        } else {
          console.log('Download started with ID:', downloadId)
          sendResponse({ success: true, downloadId })
        }
      }
    )

    return true // Keep channel open for async response
  }

  return false
})
