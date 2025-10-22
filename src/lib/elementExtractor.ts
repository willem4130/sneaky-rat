import { StyleReducer } from './styleReducer'
import { AssetResolver } from './assetResolver'
import type { ExtractedElement, CopyOptions } from './types'

export class ElementExtractor {
  /**
   * Extract an element with its computed styles and assets
   */
  static extract(element: Element, options: CopyOptions): ExtractedElement {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as Element

    // Clean up the clone
    this.cleanElement(clone)

    // Get computed styles for the element and all descendants
    // Pass both original (for computed styles) and clone (to add classes)
    const { styles, totalElements, totalStylesExtracted } = this.extractStyles(element, clone, options)

    // Extract assets (images, fonts, etc.)
    const assets = AssetResolver.resolveAssets(element)

    // Get metadata
    const rect = element.getBoundingClientRect()
    console.log('Element rect:', rect)
    console.log('Total elements processed:', totalElements)
    console.log('Total styles extracted:', totalStylesExtracted)

    const computedStyle = window.getComputedStyle(element)
    const reducer = new StyleReducer(element, computedStyle)
    const reducedStyles = reducer.reduce(options.aggressiveReduction)

    const metadata = {
      tagName: element.tagName.toLowerCase(),
      classes: Array.from(element.classList),
      dimensions: {
        width: rect.width,
        height: rect.height,
      },
      position: {
        top: rect.top,
        left: rect.left,
      },
      computedStylesCount: computedStyle.length,
      reducedStylesCount: reducedStyles.length,
      reductionPercentage: Math.round(
        ((computedStyle.length - reducedStyles.length) / computedStyle.length) * 100
      ),
      totalElements,
      totalStylesExtracted,
    }

    return {
      html: clone.outerHTML,
      css: styles,
      assets,
      metadata,
    }
  }

  /**
   * Clean up the cloned element by removing unnecessary attributes
   */
  private static cleanElement(element: Element): void {
    // Blacklisted attributes (tracking, analytics, framework-specific)
    const blacklistedPrefixes = [
      'data-ga-',
      'data-track-',
      'data-analytics-',
      'ng-',
      'v-',
      'data-react-',
      'data-reactid',
      'data-reactroot',
      '_ngcontent-',
      '_nghost-',
      'data-v-',
      'data-testid',
      'data-test-',
      'aria-',
      'data-',
    ]

    const blacklistedAttributes = [
      'onclick',
      'onload',
      'onerror',
      'onmouseover',
      'onmouseout',
      'onfocus',
      'onblur',
      'focusable',
      'aria-hidden',
      'aria-label',
      'aria-pressed',
      'title',
    ]

    // Remove blacklisted attributes
    const attributesToRemove: string[] = []

    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i]
      const attrName = attr.name

      // Check against prefixes
      if (blacklistedPrefixes.some(prefix => attrName.startsWith(prefix))) {
        attributesToRemove.push(attrName)
        continue
      }

      // Check against exact matches
      if (blacklistedAttributes.includes(attrName)) {
        attributesToRemove.push(attrName)
      }
    }

    attributesToRemove.forEach(attr => element.removeAttribute(attr))

    // Remove empty class attributes (check if className is a string)
    if (element.className && typeof element.className === 'string' && element.className.trim() === '') {
      element.removeAttribute('class')
    }

    // Recursively clean children
    Array.from(element.children).forEach(child => this.cleanElement(child))

    // Simplify single-child wrapper elements (unwrap if just one child with no attributes)
    if (element.children.length === 1 &&
        (element.tagName === 'DIV' || element.tagName === 'SPAN') &&
        element.attributes.length === 0) {
      const child = element.children[0]
      // Replace element with its child content
      while (child.firstChild) {
        element.appendChild(child.firstChild)
      }
      element.removeChild(child)
    }
  }

  /**
   * Extract and reduce styles for an element and its descendants
   */
  private static extractStyles(
    original: Element,
    clone: Element,
    options: CopyOptions
  ): { styles: string; totalElements: number; totalStylesExtracted: number } {
    // Map to store original element -> class name
    const elementClassMap = new Map<Element, string>()

    // Map to store original element -> CSS text
    const elementStylesMap = new Map<Element, string>()

    // Process the element tree recursively (read styles from original)
    this.processElementTree(original, elementClassMap, elementStylesMap, options, 0)

    // Apply class names to clone
    this.applyClassNames(original, clone, elementClassMap)

    // Build final CSS output
    const cssRules: string[] = []

    elementClassMap.forEach((className, el) => {
      const cssText = elementStylesMap.get(el)
      if (cssText) {
        cssRules.push(`.${className} {\n${cssText}\n}`)
      }
    })

    return {
      styles: cssRules.join('\n\n'),
      totalElements: elementClassMap.size,
      totalStylesExtracted: cssRules.length,
    }
  }

  /**
   * Process element tree recursively and assign styles
   */
  private static processElementTree(
    element: Element,
    classMap: Map<Element, string>,
    stylesMap: Map<Element, string>,
    options: CopyOptions,
    depth: number
  ): void {
    // Generate semantic class for this element
    const semanticClass = this.generateSemanticClass(element, depth)
    classMap.set(element, semanticClass)

    // Get computed styles
    const computedStyle = window.getComputedStyle(element)
    const reducer = new StyleReducer(element, computedStyle)
    const reducedStyles = reducer.reduce(options.aggressiveReduction)
    const optimizedStyles = StyleReducer.optimizeShorthands(reducedStyles)

    // Only store if there are styles
    if (optimizedStyles.length > 0) {
      const cssText = optimizedStyles
        .map(({ name, value }) => `  ${name}: ${value};`)
        .join('\n')
      stylesMap.set(element, cssText)
    }

    // Process children recursively (limit depth to avoid excessive processing)
    if (depth < 20) {
      Array.from(element.children).forEach(child => {
        this.processElementTree(child, classMap, stylesMap, options, depth + 1)
      })
    }
  }

  /**
   * Apply generated class names to clone elements based on original element mapping
   */
  private static applyClassNames(
    original: Element,
    clone: Element,
    classMap: Map<Element, string>
  ): void {
    const className = classMap.get(original)
    if (className) {
      // Add the generated class to the clone
      clone.classList.add(className)
    }

    // Apply to children recursively (matching original to clone children)
    const originalChildren = Array.from(original.children)
    const cloneChildren = Array.from(clone.children)

    originalChildren.forEach((originalChild, index) => {
      if (cloneChildren[index]) {
        this.applyClassNames(originalChild, cloneChildren[index], classMap)
      }
    })
  }

  /**
   * Process styles for an element
   */
  private static processElementStyles(
    element: Element,
    rootClass: string,
    stylesMap: Map<Element, string>,
    options: CopyOptions,
    depth: number = 0
  ): void {
    const computedStyle = window.getComputedStyle(element)
    const reducer = new StyleReducer(element, computedStyle)
    const reducedStyles = reducer.reduce(options.aggressiveReduction)
    const optimizedStyles = StyleReducer.optimizeShorthands(reducedStyles)

    // Convert to CSS string
    const cssText = optimizedStyles
      .map(({ name, value }) => `  ${name}: ${value};`)
      .join('\n')

    if (cssText) {
      stylesMap.set(element, cssText)
    }

    // Process pseudo-elements if requested
    if (options.includePseudoElements) {
      this.processPseudoElement(element, '::before', rootClass, stylesMap, depth)
      this.processPseudoElement(element, '::after', rootClass, stylesMap, depth)
    }

    // Process children recursively (limit depth to avoid excessive processing)
    if (depth < 10) {
      Array.from(element.children).forEach(child => {
        this.processElementStyles(child, rootClass, stylesMap, options, depth + 1)
      })
    }
  }

  /**
   * Process pseudo-element styles
   */
  private static processPseudoElement(
    element: Element,
    pseudoElement: '::before' | '::after',
    rootClass: string,
    stylesMap: Map<Element, string>,
    _depth: number
  ): void {
    try {
      const pseudoStyle = window.getComputedStyle(element, pseudoElement)
      const content = pseudoStyle.getPropertyValue('content')

      // Only include if pseudo-element has content
      if (content && content !== 'none' && content !== '""') {
        const reducer = new StyleReducer(element, pseudoStyle)
        const reducedStyles = reducer.reduce(false)
        const cssText = reducedStyles
          .map(({ name, value }) => `  ${name}: ${value};`)
          .join('\n')

        if (cssText) {
          // Store with a special key
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
          const pseudoKey = `${element.tagName}-${_depth}-${pseudoElement}` as any
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          stylesMap.set(pseudoKey, cssText)
        }
      }
    } catch {
      // Pseudo-element doesn't exist or can't be accessed
    }
  }

  /**
   * Generate a semantic class name based on element characteristics
   */
  private static generateSemanticClass(element: Element, _depth: number): string {
    const tagName = element.tagName.toLowerCase()

    // Get element identifiers
    const id = element.id
    const classes = Array.from(element.classList)

    // Build semantic name parts
    const parts: string[] = ['extracted']

    // Add tag name
    parts.push(tagName)

    // Add ID if present (sanitized)
    if (id) {
      parts.push(this.sanitizeClassName(id))
    }

    // Add first meaningful class if present
    if (classes.length > 0) {
      // Find first non-utility class (avoid tailwind classes)
      const meaningfulClass = classes.find(c =>
        !c.startsWith('flex') &&
        !c.startsWith('grid') &&
        !c.startsWith('text-') &&
        !c.startsWith('bg-') &&
        !c.startsWith('p-') &&
        !c.startsWith('m-') &&
        !c.startsWith('w-') &&
        !c.startsWith('h-') &&
        !c.startsWith('gap-') &&
        c.length > 2
      )

      if (meaningfulClass) {
        parts.push(this.sanitizeClassName(meaningfulClass))
      }
    }

    // Add role/aria label for better context
    const ariaLabel = element.getAttribute('aria-label')
    if (ariaLabel && ariaLabel.length < 20) {
      parts.push(this.sanitizeClassName(ariaLabel))
    }

    // Add content hint for text elements with short content
    if ((tagName === 'h1' || tagName === 'h2' || tagName === 'h3' ||
         tagName === 'h4' || tagName === 'h5' || tagName === 'h6' ||
         tagName === 'button' || tagName === 'a') && element.textContent) {
      const text = element.textContent.trim()
      if (text.length > 0 && text.length < 30) {
        const textSlug = this.textToSlug(text)
        if (textSlug) {
          parts.push(textSlug)
        }
      }
    }

    // Add unique suffix to prevent collisions
    const uniqueId = Math.random().toString(36).substr(2, 6)
    parts.push(uniqueId)

    return parts.join('-')
  }

  /**
   * Sanitize a string to be used as a class name
   */
  private static sanitizeClassName(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20) // Limit length
  }

  /**
   * Convert text content to a slug
   */
  private static textToSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30) // Limit length
  }
}
