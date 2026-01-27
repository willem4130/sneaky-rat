/**
 * Full Page Extractor
 * Extracts entire website structure with intelligent pattern detection and semantic grouping
 */

export interface PageElement {
  tagName: string
  id: string
  classes: string[]
  role: string | null
  semanticType: SemanticType
  dimensions: { width: number; height: number }
  position: { top: number; left: number }
  isVisible: boolean
  isLayoutContainer: boolean
  layoutType: 'flex' | 'grid' | 'block' | 'inline' | 'none'
  children: PageElement[]
  selector: string
  html: string
  depth: number
  significance: number
}

export type SemanticType =
  | 'header'
  | 'navigation'
  | 'main'
  | 'sidebar'
  | 'footer'
  | 'article'
  | 'section'
  | 'card'
  | 'list'
  | 'form'
  | 'media'
  | 'unknown'

export interface PatternGroup {
  pattern: string
  count: number
  elements: PageElement[]
  representativeHTML: string
  classes: string[]
}

export interface PageStructure {
  url: string
  title: string
  viewport: { width: number; height: number }
  sections: {
    type: SemanticType
    element: PageElement
    children: PageElement[]
  }[]
  patterns: PatternGroup[]
  layoutTree: PageElement
  stats: {
    totalElements: number
    visibleElements: number
    layoutContainers: number
    patternsDetected: number
    skippedElements: number
  }
}

// Elements to always skip
const SKIP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'path',
  'template',
  'slot',
])

// Classes/IDs that indicate tracking, ads, or hidden content
// Be specific to avoid false positives on legitimate content
const SKIP_PATTERNS = [
  /^ad[-_]|^ads[-_]|^advert|^banner[-_]ad|^sponsor[-_]|^promo[-_]ad|^tracking[-_]|^pixel[-_]/i,
  /^google[-_](ad|tag)|^fb[-_]pixel|^ga[-_]|^gtm[-_]|^doubleclick|^adsense/i,
  /^sr-only$|^visually-hidden$/i, // Accessibility hiding (exact match)
  /^cookie[-_]?(banner|consent|notice)|^gdpr[-_]|^privacy[-_]notice/i,
]

export class PageExtractor {
  private document: Document
  private skippedCount = 0

  constructor(doc: Document = document) {
    this.document = doc
  }

  /**
   * Extract the full page structure
   */
  extract(): PageStructure {
    const body = this.document.body
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    // Build the layout tree
    const layoutTree = this.extractElement(body, 0)

    // Identify semantic sections
    const sections = this.identifySections(layoutTree)

    // Detect repeated patterns
    const patterns = this.detectPatterns(layoutTree)

    // Calculate stats
    const stats = this.calculateStats(layoutTree)
    stats.skippedElements = this.skippedCount
    stats.patternsDetected = patterns.length

    return {
      url: window.location.href,
      title: this.document.title,
      viewport,
      sections,
      patterns,
      layoutTree,
      stats,
    }
  }

  /**
   * Extract a single element and its children
   */
  private extractElement(element: Element, depth: number): PageElement {
    const tagName = element.tagName.toLowerCase()
    const computedStyle = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()

    const pageElement: PageElement = {
      tagName,
      id: element.id,
      classes: Array.from(element.classList),
      role: element.getAttribute('role'),
      semanticType: this.determineSemanticType(element),
      dimensions: { width: rect.width, height: rect.height },
      position: { top: rect.top, left: rect.left },
      isVisible: this.isElementVisible(element, computedStyle, rect),
      isLayoutContainer: this.isLayoutContainer(computedStyle),
      layoutType: this.getLayoutType(computedStyle),
      children: [],
      selector: this.generateSelector(element),
      html: this.getCleanOuterHTML(element),
      depth,
      significance: this.calculateSignificance(element, rect, depth),
    }

    // Process children (excluding skipped elements)
    for (const child of element.children) {
      if (this.shouldSkip(child)) {
        this.skippedCount++
        continue
      }
      pageElement.children.push(this.extractElement(child, depth + 1))
    }

    return pageElement
  }

  /**
   * Determine if an element should be skipped
   */
  private shouldSkip(element: Element): boolean {
    const tagName = element.tagName.toLowerCase()

    // Never skip body - it's the root
    if (tagName === 'body') return false

    // Skip certain tags
    if (SKIP_TAGS.has(tagName)) return true

    // Skip elements with skip patterns - check individual class names
    const classes = element.className && typeof element.className === 'string'
      ? element.className.split(' ').filter(c => c.trim())
      : []
    const hasSkipPattern = [...classes, element.id].some(name =>
      name && SKIP_PATTERNS.some(p => p.test(name))
    )
    if (hasSkipPattern) return true

    // Skip zero-size elements
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return true

    // Skip elements with display:none or visibility:hidden
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return true

    return false
  }

  /**
   * Check if element is visible in viewport
   */
  private isElementVisible(
    element: Element,
    style: CSSStyleDeclaration,
    rect: DOMRect
  ): boolean {
    if (style.display === 'none') return false
    if (style.visibility === 'hidden') return false
    if (style.opacity === '0') return false
    if (rect.width === 0 || rect.height === 0) return false

    // Check if in viewport
    const inViewport =
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0

    return inViewport
  }

  /**
   * Check if element is a layout container
   */
  private isLayoutContainer(style: CSSStyleDeclaration): boolean {
    return (
      style.display === 'flex' ||
      style.display === 'inline-flex' ||
      style.display === 'grid' ||
      style.display === 'inline-grid'
    )
  }

  /**
   * Get the layout type of an element
   */
  private getLayoutType(
    style: CSSStyleDeclaration
  ): 'flex' | 'grid' | 'block' | 'inline' | 'none' {
    if (style.display.includes('flex')) return 'flex'
    if (style.display.includes('grid')) return 'grid'
    if (style.display === 'none') return 'none'
    if (style.display === 'inline' || style.display === 'inline-block') return 'inline'
    return 'block'
  }

  /**
   * Determine the semantic type of an element
   */
  private determineSemanticType(element: Element): SemanticType {
    const tagName = element.tagName.toLowerCase()
    const role = element.getAttribute('role')
    const classes = element.className.toLowerCase()

    // Check tag name first
    if (tagName === 'header' || role === 'banner') return 'header'
    if (tagName === 'nav' || role === 'navigation') return 'navigation'
    if (tagName === 'main' || role === 'main') return 'main'
    if (tagName === 'aside' || role === 'complementary') return 'sidebar'
    if (tagName === 'footer' || role === 'contentinfo') return 'footer'
    if (tagName === 'article' || role === 'article') return 'article'
    if (tagName === 'section') return 'section'
    if (tagName === 'form') return 'form'
    if (tagName === 'img' || tagName === 'video' || tagName === 'audio') return 'media'
    if (tagName === 'ul' || tagName === 'ol') return 'list'

    // Check classes for common patterns
    if (classes.includes('card') || classes.includes('tile')) return 'card'
    if (classes.includes('nav') || classes.includes('menu')) return 'navigation'
    if (classes.includes('header') || classes.includes('masthead')) return 'header'
    if (classes.includes('footer')) return 'footer'
    if (classes.includes('sidebar') || classes.includes('aside')) return 'sidebar'

    return 'unknown'
  }

  /**
   * Calculate visual significance score (0-100)
   */
  private calculateSignificance(element: Element, rect: DOMRect, depth: number): number {
    let score = 0

    // Size factor (larger = more significant)
    const viewportArea = window.innerWidth * window.innerHeight
    const elementArea = rect.width * rect.height
    const areaRatio = elementArea / viewportArea
    score += Math.min(areaRatio * 100, 40) // Max 40 points for size

    // Position factor (above fold = more significant)
    if (rect.top < window.innerHeight) {
      score += 20
    }
    if (rect.top < window.innerHeight / 2) {
      score += 10
    }

    // Depth factor (shallower = more significant for structure)
    score += Math.max(0, 20 - depth * 2)

    // Semantic factor
    const semantic = this.determineSemanticType(element)
    if (semantic !== 'unknown') {
      score += 10
    }

    return Math.min(Math.round(score), 100)
  }

  /**
   * Identify major semantic sections in the page
   */
  private identifySections(
    tree: PageElement
  ): { type: SemanticType; element: PageElement; children: PageElement[] }[] {
    const sections: {
      type: SemanticType
      element: PageElement
      children: PageElement[]
    }[] = []

    const semanticTypes: SemanticType[] = [
      'header',
      'navigation',
      'main',
      'sidebar',
      'footer',
    ]

    // Find top-level semantic sections
    const findSections = (element: PageElement) => {
      if (semanticTypes.includes(element.semanticType)) {
        sections.push({
          type: element.semanticType,
          element,
          children: element.children,
        })
      } else {
        // Continue searching in children
        for (const child of element.children) {
          findSections(child)
        }
      }
    }

    findSections(tree)
    return sections
  }

  /**
   * Detect repeated patterns (e.g., cards, list items)
   */
  private detectPatterns(tree: PageElement): PatternGroup[] {
    const patterns = new Map<string, PageElement[]>()

    // Generate pattern signatures for all elements
    const generateSignature = (element: PageElement): string => {
      // Signature based on structure, not content
      const childTags = element.children.map((c) => c.tagName).join(',')
      const classPattern = element.classes.slice(0, 3).sort().join(' ')
      return `${element.tagName}:${classPattern}:${childTags}`
    }

    // Collect elements by signature
    const collectPatterns = (element: PageElement) => {
      if (element.children.length > 0) {
        const sig = generateSignature(element)
        if (!patterns.has(sig)) {
          patterns.set(sig, [])
        }
        patterns.get(sig)?.push(element)
      }

      for (const child of element.children) {
        collectPatterns(child)
      }
    }

    collectPatterns(tree)

    // Filter to only patterns with 2+ occurrences
    const patternGroups: PatternGroup[] = []
    for (const [pattern, elements] of patterns.entries()) {
      if (elements.length >= 2) {
        // Check if elements are siblings (same parent = likely repeated pattern)
        const parentSelectors = new Set(
          elements.map((e) => {
            const parent = e.selector.split(' > ').slice(0, -1).join(' > ')
            return parent
          })
        )

        // If most elements share the same parent, it's a strong pattern
        if (parentSelectors.size <= Math.ceil(elements.length / 2)) {
          patternGroups.push({
            pattern,
            count: elements.length,
            elements,
            representativeHTML: elements[0].html,
            classes: elements[0].classes,
          })
        }
      }
    }

    // Sort by count (most repeated first)
    return patternGroups.sort((a, b) => b.count - a.count)
  }

  /**
   * Generate a unique CSS selector for an element
   */
  private generateSelector(element: Element): string {
    if (element.id) {
      return `#${CSS.escape(element.id)}`
    }

    const path: string[] = []
    let current: Element | null = element

    while (current && current !== this.document.body && current !== this.document.documentElement) {
      let selector = current.tagName.toLowerCase()
      const currentTagName = current.tagName

      const parent = current.parentElement
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === currentTagName
        )
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1
          selector += `:nth-of-type(${index})`
        }
      }

      path.unshift(selector)
      current = parent
    }

    return path.join(' > ')
  }

  /**
   * Get clean outer HTML (simplified for output)
   */
  private getCleanOuterHTML(element: Element): string {
    // Clone element to avoid modifying original
    const clone = element.cloneNode(true) as Element

    // Remove script and style tags from clone
    clone.querySelectorAll('script, style, noscript').forEach((el) => el.remove())

    // Truncate if too long
    const html = clone.outerHTML
    if (html.length > 5000) {
      return html.substring(0, 5000) + '... (truncated)'
    }

    return html
  }

  /**
   * Calculate stats for the extracted structure
   */
  private calculateStats(tree: PageElement): {
    totalElements: number
    visibleElements: number
    layoutContainers: number
    patternsDetected: number
    skippedElements: number
  } {
    let total = 0
    let visible = 0
    let layoutContainers = 0

    const count = (element: PageElement) => {
      total++
      if (element.isVisible) visible++
      if (element.isLayoutContainer) layoutContainers++

      for (const child of element.children) {
        count(child)
      }
    }

    count(tree)

    return {
      totalElements: total,
      visibleElements: visible,
      layoutContainers,
      patternsDetected: 0,
      skippedElements: 0,
    }
  }
}

/**
 * Format page structure as LLM-friendly prompt
 */
export function formatPageAsLLMPrompt(structure: PageStructure): string {
  let output = `# Full Page Extraction: ${structure.title}\n\n`
  output += `**URL**: ${structure.url}\n`
  output += `**Viewport**: ${structure.viewport.width}x${structure.viewport.height}\n\n`

  // Stats
  output += `## Page Statistics\n`
  output += `- Total Elements: ${structure.stats.totalElements}\n`
  output += `- Visible Elements: ${structure.stats.visibleElements}\n`
  output += `- Layout Containers: ${structure.stats.layoutContainers}\n`
  output += `- Patterns Detected: ${structure.stats.patternsDetected}\n`
  output += `- Skipped Elements: ${structure.stats.skippedElements}\n\n`

  // Semantic sections
  output += `## Page Sections\n\n`
  for (const section of structure.sections) {
    output += `### ${section.type.charAt(0).toUpperCase() + section.type.slice(1)}\n`
    output += `- Tag: \`<${section.element.tagName}>\`\n`
    output += `- Classes: \`${section.element.classes.join(' ')}\`\n`
    output += `- Dimensions: ${Math.round(section.element.dimensions.width)}x${Math.round(section.element.dimensions.height)}\n`
    output += `- Children: ${section.children.length}\n\n`
  }

  // Repeated patterns
  if (structure.patterns.length > 0) {
    output += `## Repeated Patterns\n\n`
    output += `These elements appear multiple times and can be templated:\n\n`

    for (const pattern of structure.patterns.slice(0, 5)) {
      output += `### Pattern: ${pattern.classes.slice(0, 2).join(' ') || 'Unnamed'} (×${pattern.count})\n`
      output += '```html\n'
      output += pattern.representativeHTML.substring(0, 500)
      if (pattern.representativeHTML.length > 500) output += '\n... (truncated)'
      output += '\n```\n\n'
    }
  }

  // Layout tree summary
  output += `## Layout Hierarchy\n\n`
  output += '```\n'
  output += formatLayoutTree(structure.layoutTree, 0, 3)
  output += '```\n\n'

  // Instructions for LLM
  output += `## Instructions for Recreation\n\n`
  output += `1. Start with the semantic structure (header, nav, main, footer)\n`
  output += `2. Use the layout containers (flex/grid) as identified\n`
  output += `3. For repeated patterns, create reusable components\n`
  output += `4. Match the approximate dimensions for accurate layout\n`

  return output
}

/**
 * Format layout tree as indented text
 */
function formatLayoutTree(element: PageElement, indent: number, maxDepth: number): string {
  if (indent > maxDepth) return ''

  const prefix = '  '.repeat(indent)
  const layoutBadge = element.isLayoutContainer ? ` [${element.layoutType}]` : ''
  const semanticBadge = element.semanticType !== 'unknown' ? ` (${element.semanticType})` : ''

  let line = `${prefix}<${element.tagName}>`
  if (element.classes.length > 0) {
    line += ` .${element.classes.slice(0, 2).join('.')}`
  }
  line += `${layoutBadge}${semanticBadge}`
  line += ` ${Math.round(element.dimensions.width)}×${Math.round(element.dimensions.height)}`
  line += '\n'

  for (const child of element.children.slice(0, 10)) {
    line += formatLayoutTree(child, indent + 1, maxDepth)
  }

  if (element.children.length > 10) {
    line += `${prefix}  ... and ${element.children.length - 10} more\n`
  }

  return line
}

/**
 * Generate wireframe HTML (skeleton structure)
 */
export function generateWireframeHTML(structure: PageStructure): string {
  let html = '<!DOCTYPE html>\n'
  html += '<html lang="en">\n'
  html += '<head>\n'
  html += '  <meta charset="UTF-8">\n'
  html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
  html += `  <title>Wireframe: ${structure.title}</title>\n`
  html += '  <style>\n'
  html += '    * { box-sizing: border-box; margin: 0; padding: 0; }\n'
  html += '    body { font-family: system-ui, sans-serif; background: #f5f5f5; padding: 20px; }\n'
  html += '    .wireframe-box { border: 2px dashed #ccc; background: #fff; padding: 10px; margin: 5px; }\n'
  html += '    .wireframe-label { font-size: 10px; color: #666; background: #eee; padding: 2px 6px; display: inline-block; margin-bottom: 5px; }\n'
  html += '    .flex { display: flex; gap: 10px; }\n'
  html += '    .grid { display: grid; gap: 10px; }\n'
  html += '    .header { background: #e3f2fd; }\n'
  html += '    .nav { background: #fff3e0; }\n'
  html += '    .main { background: #e8f5e9; flex: 1; }\n'
  html += '    .sidebar { background: #fce4ec; width: 250px; }\n'
  html += '    .footer { background: #f3e5f5; }\n'
  html += '  </style>\n'
  html += '</head>\n'
  html += '<body>\n'

  // Generate wireframe for each section
  for (const section of structure.sections) {
    html += generateWireframeElement(section.element, 1)
  }

  html += '</body>\n'
  html += '</html>\n'

  return html
}

function generateWireframeElement(element: PageElement, indent: number): string {
  const spaces = '  '.repeat(indent)
  const layoutClass = element.isLayoutContainer ? ` ${element.layoutType}` : ''
  const semanticClass =
    element.semanticType !== 'unknown' ? ` ${element.semanticType}` : ''

  let html = `${spaces}<div class="wireframe-box${layoutClass}${semanticClass}" style="min-height: ${Math.max(50, element.dimensions.height / 4)}px">\n`
  html += `${spaces}  <span class="wireframe-label">&lt;${element.tagName}&gt; ${element.classes.slice(0, 2).join(' ')}</span>\n`

  for (const child of element.children.slice(0, 5)) {
    html += generateWireframeElement(child, indent + 1)
  }

  if (element.children.length > 5) {
    html += `${spaces}  <div class="wireframe-box" style="background: #f9f9f9; text-align: center; color: #999;">+${element.children.length - 5} more</div>\n`
  }

  html += `${spaces}</div>\n`

  return html
}

/**
 * Generate React component tree
 */
export function generateComponentTree(structure: PageStructure): string {
  let output = `// Component Tree for: ${structure.title}\n\n`

  // Generate component for each semantic section
  for (const section of structure.sections) {
    const componentName =
      section.type.charAt(0).toUpperCase() + section.type.slice(1) + 'Section'
    output += `// ${componentName}.tsx\n`
    output += `export function ${componentName}() {\n`
    output += `  return (\n`
    output += generateJSXElement(section.element, 2, 3)
    output += `  )\n`
    output += `}\n\n`
  }

  // Generate components for repeated patterns
  if (structure.patterns.length > 0) {
    output += `// Repeated Pattern Components\n\n`

    for (const pattern of structure.patterns.slice(0, 3)) {
      const name = pattern.classes[0]
        ? pattern.classes[0].charAt(0).toUpperCase() +
          pattern.classes[0].slice(1).replace(/-./g, (x) => x[1].toUpperCase())
        : 'PatternComponent'

      output += `// ${name}.tsx - Used ${pattern.count} times\n`
      output += `export function ${name}() {\n`
      output += `  return (\n`
      output += `    // Pattern: ${pattern.pattern.split(':')[0]}\n`
      output += `    <div className="${pattern.classes.join(' ')}">\n`
      output += `      {/* ... content ... */}\n`
      output += `    </div>\n`
      output += `  )\n`
      output += `}\n\n`
    }
  }

  return output
}

function generateJSXElement(element: PageElement, indent: number, maxDepth: number): string {
  if (indent > maxDepth + 2) return ''

  const spaces = '  '.repeat(indent)
  const className = element.classes.length > 0 ? ` className="${element.classes.join(' ')}"` : ''

  if (element.children.length === 0 || indent > maxDepth) {
    return `${spaces}<${element.tagName}${className} />\n`
  }

  let jsx = `${spaces}<${element.tagName}${className}>\n`

  for (const child of element.children.slice(0, 5)) {
    jsx += generateJSXElement(child, indent + 1, maxDepth)
  }

  if (element.children.length > 5) {
    jsx += `${spaces}  {/* +${element.children.length - 5} more children */}\n`
  }

  jsx += `${spaces}</${element.tagName}>\n`

  return jsx
}
