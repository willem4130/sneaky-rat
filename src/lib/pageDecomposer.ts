/**
 * Page Decomposer
 * Extracts all meaningful components from a page with their relationships preserved
 */

export interface ComponentNode {
  id: string
  selector: string
  tagName: string
  classes: string[]
  semanticType: string
  html: string
  // Relationships
  parentId: string | null
  childIds: string[]
  siblingIds: string[]
  depth: number
  index: number // Position among siblings
  // Layout info
  dimensions: { width: number; height: number }
  position: { top: number; left: number }
  layoutType: 'flex' | 'grid' | 'block' | 'inline'
  // Pattern info
  patternId: string | null // If part of a repeated pattern
  patternIndex: number | null // Index within pattern (e.g., card 3 of 6)
  // Extraction status
  cssExtracted: boolean
  css?: ComponentCSS
}

export interface ComponentCSS {
  rules: { selector: string; properties: Record<string, string> }[]
  pseudoElements: { type: string; properties: Record<string, string> }[]
  keyframes: { name: string; frames: { offset: string; properties: Record<string, string> }[] }[]
  interactionStates: { state: string; rules: { selector: string; properties: Record<string, string> }[] }[]
}

export interface PatternGroup {
  id: string
  name: string
  componentIds: string[]
  representativeId: string
  count: number
}

export interface PageDecomposition {
  id: string
  url: string
  title: string
  timestamp: number
  viewport: { width: number; height: number }
  // All components indexed by ID
  components: Record<string, ComponentNode>
  // Root component IDs (direct children of body)
  rootIds: string[]
  // Detected patterns
  patterns: PatternGroup[]
  // Stats
  stats: {
    totalComponents: number
    extractedWithCSS: number
    patterns: number
    maxDepth: number
  }
}

// Elements to skip entirely
const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'template', 'slot',
  'meta', 'link', 'base', 'head', 'title',
])

// Elements that are usually not meaningful components on their own
const INLINE_TAGS = new Set([
  'span', 'a', 'strong', 'em', 'b', 'i', 'u', 'small',
  'abbr', 'cite', 'code', 'kbd', 'mark', 'q', 's', 'sub', 'sup',
  'br', 'wbr',
])

// Skip patterns in class/ID - patterns that indicate tracking/ad elements
// Note: Be careful not to skip legitimate content (e.g., "analytics-dashboard" vs "analytics-pixel")
const SKIP_PATTERNS = [
  /^ad[-_]|^ads[-_]|^advert|^banner[-_]ad|^sponsor[-_]|^tracking[-_]|^pixel[-_]/i,
  /^google[-_](ad|tag|analytics)|^fb[-_]pixel|^ga[-_]|^gtm[-_]|^doubleclick/i,
  /^cookie[-_]?(banner|consent|notice)|^gdpr[-_]|^privacy[-_]notice/i,
  /element-copier/i, // Our own extension
]

export class PageDecomposer {
  private components: Record<string, ComponentNode> = {}
  private rootIds: string[] = []
  private patterns: PatternGroup[] = []
  private idCounter = 0

  /**
   * Decompose the page into components
   */
  decompose(): PageDecomposition {
    const body = document.body
    this.components = {}
    this.rootIds = []
    this.patterns = []
    this.idCounter = 0

    // First pass: build component tree
    this.processElement(body, null, 0, 0)

    // Second pass: detect patterns
    this.detectPatterns()

    // Calculate stats
    const stats = this.calculateStats()

    return {
      id: this.generateId(),
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      components: this.components,
      rootIds: this.rootIds,
      patterns: this.patterns,
      stats,
    }
  }

  /**
   * Process an element and its children
   */
  private processElement(
    element: Element,
    parentId: string | null,
    depth: number,
    siblingIndex: number
  ): string | null {
    // Skip unwanted elements
    if (this.shouldSkip(element)) {
      return null
    }

    const tagName = element.tagName.toLowerCase()

    // Skip inline elements unless they have significant styling
    if (INLINE_TAGS.has(tagName) && !this.hasSignificantStyling(element)) {
      return null
    }

    // Generate component ID
    const id = this.generateId()
    const selector = this.generateSelector(element)
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)

    // Create component node
    const node: ComponentNode = {
      id,
      selector,
      tagName,
      classes: Array.from(element.classList),
      semanticType: this.getSemanticType(element),
      html: this.getCleanHTML(element),
      parentId,
      childIds: [],
      siblingIds: [],
      depth,
      index: siblingIndex,
      dimensions: { width: rect.width, height: rect.height },
      position: { top: rect.top + window.scrollY, left: rect.left + window.scrollX },
      layoutType: this.getLayoutType(style),
      patternId: null,
      patternIndex: null,
      cssExtracted: false,
    }

    // Store component
    this.components[id] = node

    // Track root components
    if (parentId === null || element.parentElement === document.body) {
      this.rootIds.push(id)
    }

    // Process children
    const childElements = Array.from(element.children)
    let childIndex = 0

    for (const child of childElements) {
      const childId = this.processElement(child, id, depth + 1, childIndex)
      if (childId) {
        node.childIds.push(childId)
        childIndex++
      }
    }

    // Update sibling relationships
    this.updateSiblingRelationships(node.childIds)

    return id
  }

  /**
   * Update sibling IDs for a set of components
   */
  private updateSiblingRelationships(siblingIds: string[]) {
    for (const id of siblingIds) {
      const component = this.components[id]
      if (component) {
        component.siblingIds = siblingIds.filter(sid => sid !== id)
      }
    }
  }

  /**
   * Check if element should be skipped
   */
  private shouldSkip(element: Element): boolean {
    const tagName = element.tagName.toLowerCase()

    // Never skip body - it's the root of our extraction
    if (tagName === 'body') return false

    if (SKIP_TAGS.has(tagName)) return true

    // Check class/ID patterns - only check individual class names, not the whole string
    const classes = element.className && typeof element.className === 'string'
      ? element.className.split(' ').filter(c => c.trim())
      : []
    const hasSkipPattern = [...classes, element.id].some(name =>
      name && SKIP_PATTERNS.some(p => p.test(name))
    )
    if (hasSkipPattern) return true

    // Skip invisible elements
    const style = window.getComputedStyle(element)
    if (style.display === 'none') return true
    if (style.visibility === 'hidden') return true
    if (style.opacity === '0') return true

    // Skip zero-size elements
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return true

    return false
  }

  /**
   * Check if inline element has significant styling worth capturing
   */
  private hasSignificantStyling(element: Element): boolean {
    const style = window.getComputedStyle(element)

    // Check for meaningful styles
    if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') return true
    if (style.border !== 'none' && !style.border.includes('0px')) return true
    if (style.padding !== '0px') return true

    return false
  }

  /**
   * Get semantic type of element
   */
  private getSemanticType(element: Element): string {
    const tagName = element.tagName.toLowerCase()
    const role = element.getAttribute('role')
    const classes = element.className.toLowerCase()

    if (tagName === 'header' || role === 'banner') return 'header'
    if (tagName === 'nav' || role === 'navigation') return 'navigation'
    if (tagName === 'main' || role === 'main') return 'main'
    if (tagName === 'aside' || role === 'complementary') return 'sidebar'
    if (tagName === 'footer' || role === 'contentinfo') return 'footer'
    if (tagName === 'article') return 'article'
    if (tagName === 'section') return 'section'
    if (tagName === 'form') return 'form'
    if (tagName === 'ul' || tagName === 'ol') return 'list'
    if (tagName === 'li') return 'list-item'
    if (tagName === 'img' || tagName === 'video' || tagName === 'picture') return 'media'
    if (tagName === 'button' || role === 'button') return 'button'
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return 'input'
    if (classes.includes('card')) return 'card'
    if (classes.includes('modal') || classes.includes('dialog')) return 'modal'
    if (classes.includes('menu') || classes.includes('dropdown')) return 'menu'

    return 'container'
  }

  /**
   * Get layout type
   */
  private getLayoutType(style: CSSStyleDeclaration): 'flex' | 'grid' | 'block' | 'inline' {
    if (style.display.includes('flex')) return 'flex'
    if (style.display.includes('grid')) return 'grid'
    if (style.display === 'inline' || style.display === 'inline-block') return 'inline'
    return 'block'
  }

  /**
   * Generate unique selector for element
   */
  private generateSelector(element: Element): string {
    if (element.id) {
      return `#${CSS.escape(element.id)}`
    }

    const path: string[] = []
    let current: Element | null = element

    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase()
      const currentTagName = current.tagName

      const parent = current.parentElement
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === currentTagName)
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
   * Get clean HTML (without deeply nested content for large elements)
   */
  private getCleanHTML(element: Element): string {
    const clone = element.cloneNode(true) as Element

    // Remove scripts and styles
    clone.querySelectorAll('script, style, noscript').forEach(el => el.remove())

    // For large elements, truncate children
    const html = clone.outerHTML
    if (html.length > 10000) {
      // Return just the opening tag and immediate structure
      const shallowClone = element.cloneNode(false) as Element
      shallowClone.innerHTML = `<!-- ${element.children.length} children -->`
      return shallowClone.outerHTML
    }

    return html
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `c${++this.idCounter}_${Date.now().toString(36)}`
  }

  /**
   * Detect repeated patterns
   */
  private detectPatterns() {
    const signatureMap = new Map<string, string[]>()

    // Generate signatures for all components
    for (const [id, component] of Object.entries(this.components)) {
      const signature = this.generateSignature(component)
      if (!signatureMap.has(signature)) {
        signatureMap.set(signature, [])
      }
      signatureMap.get(signature)?.push(id)
    }

    // Find patterns with 2+ occurrences
    for (const ids of signatureMap.values()) {
      if (ids.length >= 2) {
        // Check if components are siblings (stronger pattern signal)
        const firstComponent = this.components[ids[0]]
        if (!firstComponent) continue

        const areSiblings = ids.every(id => {
          const comp = this.components[id]
          return comp?.parentId === firstComponent.parentId
        })

        if (areSiblings) {
          const patternId = this.generateId()
          const pattern: PatternGroup = {
            id: patternId,
            name: this.generatePatternName(firstComponent),
            componentIds: ids,
            representativeId: ids[0],
            count: ids.length,
          }

          this.patterns.push(pattern)

          // Update components with pattern info
          ids.forEach((id, index) => {
            const comp = this.components[id]
            if (comp) {
              comp.patternId = patternId
              comp.patternIndex = index
            }
          })
        }
      }
    }
  }

  /**
   * Generate signature for pattern matching
   */
  private generateSignature(component: ComponentNode): string {
    const childTags = component.childIds
      .map(id => this.components[id]?.tagName || '')
      .join(',')
    const classPattern = component.classes.slice(0, 3).sort().join(' ')
    return `${component.tagName}:${classPattern}:${childTags}`
  }

  /**
   * Generate human-readable pattern name
   */
  private generatePatternName(component: ComponentNode): string {
    if (component.classes.length > 0) {
      return component.classes[0]
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    }
    return `${component.tagName} Pattern`
  }

  /**
   * Calculate stats
   */
  private calculateStats() {
    let maxDepth = 0
    let extractedWithCSS = 0

    for (const component of Object.values(this.components)) {
      if (component.depth > maxDepth) maxDepth = component.depth
      if (component.cssExtracted) extractedWithCSS++
    }

    return {
      totalComponents: Object.keys(this.components).length,
      extractedWithCSS,
      patterns: this.patterns.length,
      maxDepth,
    }
  }
}

/**
 * Export decomposition as JSON
 */
export function exportAsJSON(decomposition: PageDecomposition): string {
  return JSON.stringify(decomposition, null, 2)
}

/**
 * Generate folder structure for ZIP export
 */
export function generateFolderStructure(decomposition: PageDecomposition): Map<string, string> {
  const files = new Map<string, string>()

  // Add index.json with full structure
  files.set('index.json', exportAsJSON(decomposition))

  // Add README
  files.set('README.md', generateReadme(decomposition))

  // Create folder for each root section
  for (const rootId of decomposition.rootIds) {
    const root = decomposition.components[rootId]
    if (!root) continue

    const folderName = root.semanticType !== 'container'
      ? root.semanticType
      : root.classes[0] || root.tagName

    // Add component HTML
    files.set(`${folderName}/${root.id}.html`, root.html)

    // Add CSS if extracted
    if (root.css) {
      files.set(`${folderName}/${root.id}.css`, formatCSS(root.css))
    }

    // Recursively add children
    addChildrenToFolder(decomposition, root, folderName, files)
  }

  // Add patterns folder
  if (decomposition.patterns.length > 0) {
    files.set('patterns/index.json', JSON.stringify(decomposition.patterns, null, 2))

    for (const pattern of decomposition.patterns) {
      const rep = decomposition.components[pattern.representativeId]
      if (rep) {
        files.set(`patterns/${pattern.name.toLowerCase().replace(/\s+/g, '-')}.html`, rep.html)
        if (rep.css) {
          files.set(`patterns/${pattern.name.toLowerCase().replace(/\s+/g, '-')}.css`, formatCSS(rep.css))
        }
      }
    }
  }

  return files
}

function addChildrenToFolder(
  decomposition: PageDecomposition,
  parent: ComponentNode,
  folderPath: string,
  files: Map<string, string>
) {
  for (const childId of parent.childIds) {
    const child = decomposition.components[childId]
    if (!child) continue

    // Skip if part of a pattern (handled separately)
    if (child.patternId && child.patternIndex !== 0) continue

    const childFolder = `${folderPath}/${child.semanticType !== 'container' ? child.semanticType : child.tagName}_${child.index}`

    files.set(`${childFolder}/${child.id}.html`, child.html)
    if (child.css) {
      files.set(`${childFolder}/${child.id}.css`, formatCSS(child.css))
    }

    // Recurse (limit depth to avoid huge structures)
    if (child.depth < 5) {
      addChildrenToFolder(decomposition, child, childFolder, files)
    }
  }
}

function formatCSS(css: ComponentCSS): string {
  let output = '/* Extracted CSS Rules */\n\n'

  for (const rule of css.rules) {
    output += `${rule.selector} {\n`
    for (const [prop, value] of Object.entries(rule.properties)) {
      output += `  ${prop}: ${value};\n`
    }
    output += '}\n\n'
  }

  if (css.pseudoElements.length > 0) {
    output += '/* Pseudo Elements */\n\n'
    for (const pseudo of css.pseudoElements) {
      output += `::${pseudo.type} {\n`
      for (const [prop, value] of Object.entries(pseudo.properties)) {
        output += `  ${prop}: ${value};\n`
      }
      output += '}\n\n'
    }
  }

  if (css.keyframes.length > 0) {
    output += '/* Keyframe Animations */\n\n'
    for (const kf of css.keyframes) {
      output += `@keyframes ${kf.name} {\n`
      for (const frame of kf.frames) {
        output += `  ${frame.offset} {\n`
        for (const [prop, value] of Object.entries(frame.properties)) {
          output += `    ${prop}: ${value};\n`
        }
        output += '  }\n'
      }
      output += '}\n\n'
    }
  }

  return output
}

function generateReadme(decomposition: PageDecomposition): string {
  return `# Page Decomposition: ${decomposition.title}

**URL**: ${decomposition.url}
**Extracted**: ${new Date(decomposition.timestamp).toISOString()}
**Viewport**: ${decomposition.viewport.width}x${decomposition.viewport.height}

## Statistics

- **Total Components**: ${decomposition.stats.totalComponents}
- **With CSS Extracted**: ${decomposition.stats.extractedWithCSS}
- **Patterns Detected**: ${decomposition.stats.patterns}
- **Max Depth**: ${decomposition.stats.maxDepth}

## Structure

${decomposition.rootIds.map(id => {
  const comp = decomposition.components[id]
  return comp ? `- **${comp.semanticType}** (${comp.tagName}.${comp.classes.slice(0, 2).join('.')})` : ''
}).join('\n')}

## Patterns

${decomposition.patterns.map(p => `- **${p.name}** (${p.count} instances)`).join('\n') || 'No repeated patterns detected.'}

## Files

- \`index.json\` - Full decomposition data
- \`[section]/\` - Components organized by page section
- \`patterns/\` - Repeated component patterns
`
}
