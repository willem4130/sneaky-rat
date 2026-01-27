/**
 * HTML Generator
 * Automatically generates a complete, standalone HTML file from CDP extraction
 * This ensures NOTHING is missed - all CSS rules, variables, pseudo-elements are included
 */

import type { CDPExtractionResult, CDPCSSRule, CDPCSSProperty } from './cdpExtractor'

interface GeneratedHTML {
  html: string
  stats: {
    totalRules: number
    totalProperties: number
    pseudoElements: number
    cssVariables: number
    keyframes: number
    interactionStates: number
  }
}

/**
 * Extract CSS custom properties (variables) from rules
 */
function extractCSSVariables(rules: CDPCSSRule[]): Map<string, string> {
  const variables = new Map<string, string>()

  for (const rule of rules) {
    for (const prop of rule.cssProperties) {
      // Check if property is a CSS variable (starts with --)
      if (prop.name.startsWith('--')) {
        variables.set(prop.name, prop.value)
      }

      // Check if value uses CSS variables
      const varMatches = prop.value.match(/var\((--[a-zA-Z0-9-]+)/g)
      if (varMatches) {
        for (const match of varMatches) {
          const varName = match.replace('var(', '').replace(')', '')
          if (!variables.has(varName)) {
            // Default value - we don't know what it should be, so use a placeholder
            variables.set(varName, 'inherit')
          }
        }
      }
    }
  }

  return variables
}

/**
 * Generate CSS from properties
 */
function generateCSSFromProperties(properties: CDPCSSProperty[]): string {
  const lines: string[] = []

  for (const prop of properties) {
    // Skip empty values
    if (!prop.value || prop.value.trim() === '') continue

    // Skip duplicate properties (CDP sometimes returns duplicates)
    const existing = lines.find(line => line.includes(`${prop.name}:`))
    if (existing) continue

    lines.push(`  ${prop.name}: ${prop.value};`)
  }

  return lines.join('\n')
}

/**
 * Generate complete standalone HTML from CDP extraction
 */
export function generateStandaloneHTML(
  html: string,
  cdpResult: CDPExtractionResult,
  options: {
    includeTailwindCDN?: boolean
    includeBootstrapCDN?: boolean
    darkMode?: boolean
  } = {}
): GeneratedHTML {
  const { includeTailwindCDN = true, darkMode = true } = options

  let output = '<!DOCTYPE html>\n'
  output += '<html lang="en">\n'
  output += '<head>\n'
  output += '  <meta charset="UTF-8">\n'
  output += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
  output += '  <title>Extracted UI Component</title>\n'

  // Include framework CDN if needed
  if (includeTailwindCDN) {
    output += '  <script src="https://cdn.tailwindcss.com"></script>\n'
  }

  // Start custom styles
  output += '  <style>\n'

  // Add dark mode class if needed
  if (darkMode) {
    output += '    html {\n'
    output += '      color-scheme: dark;\n'
    output += '    }\n\n'
  }

  // Extract and define CSS variables
  const cssVariables = extractCSSVariables(cdpResult.matchedRules)
  if (cssVariables.size > 0) {
    output += '    /* CSS Variables extracted from original */\n'
    output += '    :root {\n'
    for (const [name, value] of cssVariables) {
      output += `      ${name}: ${value};\n`
    }
    output += '    }\n\n'
  }

  // Add global resets and base styles
  output += '    /* Base styles */\n'
  output += '    body {\n'
  output += '      margin: 0;\n'
  output += '      padding: 20px;\n'
  output += '      font-family: system-ui, -apple-system, sans-serif;\n'
  if (darkMode) {
    output += '      background-color: #1a1b1e;\n'
    output += '      color: #ececec;\n'
  }
  output += '    }\n\n'

  // Add all matched CSS rules (minimal filtering - keep everything important)
  if (cdpResult.matchedRules.length > 0) {
    output += '    /* Extracted CSS Rules */\n'

    // Group rules by selector to avoid duplicates
    const rulesBySelector = new Map<string, CDPCSSProperty[]>()

    // Only skip browser resets and our extension classes
    const skipPatterns = [
      /^\*,?\s*:?(?:before|after)/i,  // Generic *, ::before, ::after resets
      /^::backdrop$/i,  // ::backdrop alone
      /^(address|blockquote|center|div|figure|html|body)$/i,  // Single element resets
      /element-copier/i,  // Our extension
    ]

    for (const rule of cdpResult.matchedRules) {
      if (!rule.selectorText || rule.cssProperties.length === 0) continue

      const selector = rule.selectorText.trim()

      // Only skip very generic browser resets
      const shouldSkip = skipPatterns.some(pattern => pattern.test(selector))
      if (shouldSkip) continue

      if (!rulesBySelector.has(selector)) {
        rulesBySelector.set(selector, [])
      }

      // Merge properties
      const existingProps = rulesBySelector.get(selector)
      if (!existingProps) continue
      for (const prop of rule.cssProperties) {
        // Skip if property already exists
        if (!existingProps.find(p => p.name === prop.name)) {
          existingProps.push(prop)
        }
      }
    }

    // Output merged rules
    for (const [selector, properties] of rulesBySelector) {
      const css = generateCSSFromProperties(properties)
      if (css) {
        output += `    ${selector} {\n`
        output += css + '\n'
        output += '    }\n\n'
      }
    }
  }

  // Add inline styles as a specific class
  if (cdpResult.inlineStyles.length > 0) {
    output += '    /* Inline styles from the element */\n'
    output += '    .extracted-inline-styles {\n'
    output += generateCSSFromProperties(cdpResult.inlineStyles) + '\n'
    output += '    }\n\n'
  }

  // Add pseudo-element styles
  if (cdpResult.pseudoElements.length > 0) {
    output += '    /* Pseudo-element styles */\n'

    for (const pseudo of cdpResult.pseudoElements) {
      for (const rule of pseudo.rules) {
        if (rule.cssProperties.length === 0) continue

        const selector = rule.selectorText.trim()

        // Only skip very generic resets
        if (selector === '*' || selector === '*, :after, :before' || selector === '::backdrop') continue

        const css = generateCSSFromProperties(rule.cssProperties)
        if (css) {
          output += `    ${selector}::${pseudo.pseudoType} {\n`
          output += css + '\n'
          output += '    }\n\n'
        }
      }
    }
  }

  // Add keyframe animations
  if (cdpResult.keyframeRules && cdpResult.keyframeRules.length > 0) {
    output += '    /* Keyframe animations */\n'

    for (const kf of cdpResult.keyframeRules) {
      output += `    @keyframes ${kf.name} {\n`
      for (const frame of kf.keyframes) {
        output += `      ${frame.offset} {\n`
        for (const prop of frame.properties) {
          output += `        ${prop.name}: ${prop.value};\n`
        }
        output += '      }\n'
      }
      output += '    }\n\n'
    }
  }

  // Add interaction state styles
  if (cdpResult.interactionStates && cdpResult.interactionStates.length > 0) {
    output += '    /* Interaction state styles */\n'

    for (const state of cdpResult.interactionStates) {
      output += `    /* :${state.state} state */\n`
      for (const rule of state.rules) {
        if (rule.cssProperties.length === 0) continue

        const css = generateCSSFromProperties(rule.cssProperties)
        if (css) {
          output += `    ${rule.selectorText} {\n`
          output += css + '\n'
          output += '    }\n\n'
        }
      }
    }
  }

  output += '  </style>\n'
  output += '</head>\n'
  output += '<body>\n'

  // Add the HTML content
  // If element has inline styles, add our extracted class
  if (cdpResult.inlineStyles.length > 0) {
    // Simple string manipulation to add class to first element
    const classMatch = html.match(/^<([a-zA-Z]+)([^>]*class="[^"]*")/)
    const noClassMatch = html.match(/^<([a-zA-Z]+)([^>]*)>/)

    if (classMatch) {
      // Has class attribute - append to it
      const modifiedHtml = html.replace(/class="([^"]*)"/, 'class="$1 extracted-inline-styles"')
      output += '  ' + modifiedHtml + '\n'
    } else if (noClassMatch) {
      // No class attribute - add it
      const tag = noClassMatch[1]
      const attrs = noClassMatch[2]
      const modifiedHtml = html.replace(new RegExp(`^<${tag}${attrs}>`), `<${tag}${attrs} class="extracted-inline-styles">`)
      output += '  ' + modifiedHtml + '\n'
    } else {
      output += '  ' + html + '\n'
    }
  } else {
    output += '  ' + html + '\n'
  }

  output += '</body>\n'
  output += '</html>\n'

  // Calculate stats
  const stats = {
    totalRules: cdpResult.matchedRules.length,
    totalProperties: cdpResult.matchedRules.reduce((sum, rule) => sum + rule.cssProperties.length, 0),
    pseudoElements: cdpResult.pseudoElements.length,
    cssVariables: cssVariables.size,
    keyframes: cdpResult.keyframeRules?.length || 0,
    interactionStates: cdpResult.interactionStates?.length || 0,
  }

  return { html: output, stats }
}

/**
 * Generate HTML and automatically save/download it
 */
export function generateAndDownload(
  filename: string,
  html: string,
  cdpResult: CDPExtractionResult
): string {
  const generated = generateStandaloneHTML(html, cdpResult, {
    includeTailwindCDN: true,
    darkMode: true,
  })

  // Create a download link
  const blob = new Blob([generated.html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)

  return generated.html
}
