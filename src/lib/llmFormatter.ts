/**
 * LLM-Friendly Output Formatter
 * Organizes extracted UI elements in a clean, structured format optimized for LLM consumption
 */

import type { CDPExtractionResult, CDPCSSProperty } from './cdpExtractor'
import { generateStandaloneHTML } from './htmlGenerator'

export interface FormattedOutput {
  markdown: string
  standaloneHTML: string
  json: {
    html: string
    styles: {
      inline: Record<string, string>
      rules: { selector: string; properties: Record<string, string> }[]
      pseudo: { type: string; properties: Record<string, string> }[]
    }
    framework: string | null
  }
}

/**
 * Detect which CSS framework is being used
 */
function detectFramework(html: string): string | null {
  const classAttr = html.match(/class="([^"]*)"/)?.[1] || ''
  const classes = classAttr.split(' ')

  // Tailwind detection
  const tailwindPatterns = [
    'flex',
    'grid',
    /^(w|h|p|m|px|py|mx|my|text|bg|border|rounded|gap|items|justify)-/,
  ]
  const hasTailwind = classes.some((cls) =>
    tailwindPatterns.some((pattern) =>
      typeof pattern === 'string' ? cls === pattern : pattern.test(cls)
    )
  )
  if (hasTailwind) return 'Tailwind CSS'

  // Bootstrap detection
  if (
    classes.some((cls) => cls.startsWith('btn-') || cls.startsWith('col-') || cls === 'container' || cls === 'row')
  ) {
    return 'Bootstrap'
  }

  // Material UI detection
  if (classes.some((cls) => cls.startsWith('Mui') || cls.startsWith('makeStyles'))) {
    return 'Material-UI'
  }

  return null
}

/**
 * Convert CSS properties array to object
 */
function propertiesToObject(properties: CDPCSSProperty[]): Record<string, string> {
  const obj: Record<string, string> = {}
  for (const prop of properties) {
    obj[prop.name] = prop.value
  }
  return obj
}

/**
 * Format CDP extraction result into LLM-friendly output
 */
export function formatForLLM(html: string, cdpResult: CDPExtractionResult): FormattedOutput {
  const framework = detectFramework(html)

  // Convert inline styles to object
  const inlineStylesObj = propertiesToObject(cdpResult.inlineStyles)

  // Convert matched rules
  const rulesArray = cdpResult.matchedRules.map((rule) => ({
    selector: rule.selectorText,
    properties: propertiesToObject(rule.cssProperties),
  }))

  // Convert pseudo elements
  const pseudoArray = cdpResult.pseudoElements.map((pseudo) => {
    // Merge all properties from all rules for this pseudo element
    const allProperties: Record<string, string> = {}
    for (const rule of pseudo.rules) {
      Object.assign(allProperties, propertiesToObject(rule.cssProperties))
    }
    return {
      type: pseudo.pseudoType,
      properties: allProperties,
    }
  })

  // Build markdown output
  let markdown = '# Extracted UI Element\n\n'

  // Metadata section
  markdown += '## Metadata\n\n'
  markdown += `- **Framework Detected**: ${framework || 'None'}\n`
  markdown += `- **Inline Styles**: ${cdpResult.inlineStyles.length} properties\n`
  markdown += `- **CSS Rules**: ${cdpResult.matchedRules.length} rules\n`
  markdown += `- **Pseudo Elements**: ${cdpResult.pseudoElements.length}\n\n`

  // HTML section
  markdown += '## HTML\n\n'
  markdown += '```html\n'
  markdown += html + '\n'
  markdown += '```\n\n'

  // Framework info (if detected)
  if (framework) {
    markdown += '## Framework\n\n'
    markdown += `⚠️ **This element uses ${framework}**\n\n`

    if (framework === 'Tailwind CSS') {
      markdown += '**To use this element:**\n'
      markdown += '1. Install Tailwind CSS in your project\n'
      markdown += '2. The utility classes in the HTML above will work automatically\n'
      markdown += '3. The CSS rules below are for properties not covered by Tailwind\n\n'
    } else if (framework === 'Bootstrap') {
      markdown += '**To use this element:**\n'
      markdown += '1. Include Bootstrap CSS in your project\n'
      markdown += '2. The Bootstrap classes in the HTML will work automatically\n'
      markdown += '3. The CSS rules below are for custom overrides\n\n'
    }
  }

  // CSS Rules section (actual CSS from stylesheets)
  if (cdpResult.matchedRules.length > 0) {
    markdown += '## CSS Rules\n\n'
    markdown += 'These are the actual CSS rules from stylesheets (with original values like `width: 100%`, not computed like `width: 768px`):\n\n'
    markdown += '```css\n'

    for (const rule of cdpResult.matchedRules) {
      if (rule.cssProperties.length === 0) continue

      markdown += `${rule.selectorText} {\n`
      for (const prop of rule.cssProperties) {
        markdown += `  ${prop.name}: ${prop.value};\n`
      }
      markdown += `}\n\n`
    }

    markdown += '```\n\n'
  }

  // Inline styles section
  if (cdpResult.inlineStyles.length > 0) {
    markdown += '## Inline Styles\n\n'
    markdown += 'Styles applied directly via the `style` attribute:\n\n'
    markdown += '```css\n'
    for (const prop of cdpResult.inlineStyles) {
      markdown += `${prop.name}: ${prop.value};\n`
    }
    markdown += '```\n\n'
  }

  // Pseudo elements section
  if (cdpResult.pseudoElements.length > 0) {
    markdown += '## Pseudo Elements\n\n'
    markdown += '```css\n'

    for (const pseudo of cdpResult.pseudoElements) {
      for (const rule of pseudo.rules) {
        if (rule.cssProperties.length === 0) continue

        markdown += `${rule.selectorText}::${pseudo.pseudoType} {\n`
        for (const prop of rule.cssProperties) {
          markdown += `  ${prop.name}: ${prop.value};\n`
        }
        markdown += `}\n\n`
      }
    }

    markdown += '```\n\n'
  }

  // Usage instructions
  markdown += '## Usage Instructions for LLM\n\n'

  if (framework === 'Tailwind CSS') {
    markdown += '**Recommended approach:**\n'
    markdown += '1. Copy the HTML with Tailwind classes\n'
    markdown += '2. Include Tailwind CSS in the project\n'
    markdown += '3. Only apply the "CSS Rules" for properties that Tailwind doesn\'t cover\n'
    markdown += '4. Inline styles are typically one-off overrides\n\n'
  } else if (framework === 'Bootstrap') {
    markdown += '**Recommended approach:**\n'
    markdown += '1. Copy the HTML with Bootstrap classes\n'
    markdown += '2. Include Bootstrap in the project\n'
    markdown += '3. Apply the "CSS Rules" for custom styling\n\n'
  } else {
    markdown += '**Recommended approach:**\n'
    markdown += '1. Copy the HTML structure\n'
    markdown += '2. Apply all CSS rules to your stylesheet\n'
    markdown += '3. Apply inline styles if needed for dynamic behavior\n\n'
  }

  markdown += '**Note:** The CSS rules extracted are the ACTUAL values from stylesheets (e.g., `width: 100%`), not computed browser values (e.g., `width: 768px`). This preserves responsive behavior and percentage-based layouts.\n\n'

  // Generate standalone HTML
  const generated = generateStandaloneHTML(html, cdpResult, {
    includeTailwindCDN: framework === 'Tailwind CSS',
    darkMode: true,
  })

  markdown += `---\n\n`
  markdown += `## Generated HTML File\n\n`
  markdown += `A complete, standalone HTML file has been generated with:\n`
  markdown += `- ${generated.stats.totalRules} CSS rules\n`
  markdown += `- ${generated.stats.totalProperties} CSS properties\n`
  markdown += `- ${generated.stats.pseudoElements} pseudo-elements\n`
  markdown += `- ${generated.stats.cssVariables} CSS variables\n\n`
  markdown += `The HTML file includes ALL extracted styles and is ready to use.\n\n`

  return {
    markdown,
    standaloneHTML: generated.html,
    json: {
      html,
      styles: {
        inline: inlineStylesObj,
        rules: rulesArray,
        pseudo: pseudoArray,
      },
      framework,
    },
  }
}
