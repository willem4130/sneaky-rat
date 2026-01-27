import { CDPExtractor } from '../lib/cdpExtractor'
import { formatForLLM } from '../lib/llmFormatter'
import { COMMAND_TOGGLE } from '../features/keyboard-shortcut'

console.log('Sneaky Rat background script is running')

// Handle keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  if (command === COMMAND_TOGGLE) {
    // Get the active tab and send toggle message
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id || !tab.url) return

      // Skip restricted pages
      if (
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:')
      ) {
        return
      }

      chrome.tabs.sendMessage(tab.id, { action: 'toggle' }, () => {
        // Ignore errors (content script may not be loaded)
        if (chrome.runtime.lastError) {
          console.log('Could not toggle Sneaky Rat:', chrome.runtime.lastError.message)
        }
      })
    })
  }
})

/**
 * Extract element using CDP
 * This runs in the background script because CDP debugger can only be used here
 */
async function extractElementWithCDP(tabId: number, elementPath: string, html: string) {
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (request.type === 'EXTRACT_WITH_CDP') {
    // Handle CDP extraction
    const tabId = sender.tab?.id
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID' })
      return true
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    void extractElementWithCDP(tabId, request.elementPath, request.html).then((result) => {
      if (result) {
        sendResponse({ success: true, data: result })
      } else {
        sendResponse({ success: false, error: 'Extraction failed' })
      }
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
        saveAs: false, // Auto-save to downloads folder
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
