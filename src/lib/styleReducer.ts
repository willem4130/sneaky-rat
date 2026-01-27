import type { StyleProperty } from './types'

// Animation properties - conditionally ignored based on includeAnimations option
const ANIMATION_PROPERTIES = new Set([
  'animation',
  'animation-name',
  'animation-duration',
  'animation-timing-function',
  'animation-delay',
  'animation-iteration-count',
  'animation-direction',
  'animation-fill-mode',
  'animation-play-state',
  'animation-composition',
  'animation-range-start',
  'animation-range-end',
  'animation-timeline',
  'transition',
  'transition-property',
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
])

// Properties that are almost always irrelevant or inherited from browser defaults
const ALWAYS_IGNORE = new Set([
  'pointer-events',
  'user-select',
  'cursor',
  '-webkit-font-smoothing',
  '-moz-osx-font-smoothing',
  'text-size-adjust',
  '-webkit-tap-highlight-color',
  'touch-action',
  'direction',
  'unicode-bidi',
  'writing-mode',
  'text-orientation',
  // SVG properties (not relevant for HTML elements)
  'clip-rule',
  'color-interpolation',
  'color-interpolation-filters',
  'fill',
  'fill-opacity',
  'fill-rule',
  'flood-color',
  'flood-opacity',
  'lighting-color',
  'stop-color',
  'stop-opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  // Mask properties (usually not needed)
  'mask-clip',
  'mask-composite',
  'mask-mode',
  'mask-origin',
  'mask-position',
  'mask-repeat',
  'mask-type',
  // Ruby text properties
  'ruby-align',
  'ruby-position',
  // Exotic/rarely used properties
  'border-collapse',
  'caption-side',
  'empty-cells',
  'field-sizing',
  'image-orientation',
  'interpolate-size',
  'print-color-adjust',
  'text-autospace',
  'text-overflow',
  'white-space-collapse',
  'widows',
  'orphans',
  'dynamic-range-limit',
  'position-visibility',
  // Corner shape (very exotic)
  'corner-bottom-left-shape',
  'corner-bottom-right-shape',
  'corner-end-end-shape',
  'corner-end-start-shape',
  'corner-start-end-shape',
  'corner-start-start-shape',
  'corner-top-left-shape',
  'corner-top-right-shape',
  // Scroll timeline (rarely needed)
  'scroll-timeline-axis',
  'view-timeline-axis',
  // Text emphasis (exotic)
  'text-emphasis-color',
  'text-emphasis-position',
  // Object fit/position defaults
  'object-fit',
  'object-position',
  // List style defaults
  'list-style-position',
  'list-style-type',
  // Vertical align baseline
  'vertical-align',
  // Transform style flat
  'transform-style',
  // Grid auto flow
  'grid-auto-flow',
  // Tab size
  'tab-size',
  // Hyphens
  'hyphens',
  // Text anchor
  'text-anchor',
  // Offset rotate
  'offset-rotate',
  // Scrollbar color
  'scrollbar-color',
  // Caret color
  'caret-color',
  // Box decoration
  'box-decoration-break',
  // Font stretch
  'font-stretch',
  // Perspective origin
  'perspective-origin',
  // Transform origin (usually centered)
  'transform-origin',
  // Outline color
  'outline-color',
  // Text decoration defaults
  'text-decoration-color',
  'text-decoration-style',
  // Border image defaults
  'border-image-repeat',
  'border-image-slice',
  'border-image-width',
  // Background defaults (but NOT background-clip - needed for gradient text!)
  'background-origin',
  'background-position',
  'background-repeat',
  // Zoom
  'zoom',
  // Logical properties (duplicates of physical properties)
  'block-size',
  'inline-size',
  'inset-block-start',
  'inset-block-end',
  'inset-inline-start',
  'inset-inline-end',
  'min-block-size',
  'max-block-size',
  'min-inline-size',
  'max-inline-size',
  'padding-block-start',
  'padding-block-end',
  'padding-inline-start',
  'padding-inline-end',
  'margin-block-start',
  'margin-block-end',
  'margin-inline-start',
  'margin-inline-end',
  'border-block-start-style',
  'border-block-end-style',
  'border-inline-start-style',
  'border-inline-end-style',
  'border-block-start-width',
  'border-block-end-width',
  'border-inline-start-width',
  'border-inline-end-width',
  // Column rule
  'column-rule-color',
  // Text wrap
  'text-wrap-mode',
  // Border colors when there's no border
  'border-block-end-color',
  'border-block-start-color',
  'border-bottom-color',
  'border-inline-end-color',
  'border-inline-start-color',
  'border-left-color',
  'border-right-color',
  'border-top-color',
  // Box sizing content-box
  'box-sizing',
  // Overflow properties (use shorthand instead)
  'overflow-block',
  'overflow-inline',
  'overflow-clip-margin',
])

// Properties to ignore if they match common default values
const DEFAULT_VALUES: Record<string, string[]> = {
  margin: ['0px'],
  padding: ['0px'],
  'background-image': ['none'],
  'background-color': ['rgba(0, 0, 0, 0)', 'transparent'],
  'font-style': ['normal'],
  'text-transform': ['none'],
  'letter-spacing': ['normal'],
  float: ['none'],
  clear: ['none'],
  'outline': ['none', 'rgb(0, 0, 0) none 0px'],
  'outline-width': ['0px'],
  'outline-style': ['none'],
  'overflow-x': ['visible'],
  'overflow-y': ['visible'],
  // Note: position is NOT in defaults - we need to preserve relative/absolute/fixed/sticky
  'min-width': ['0px', '1px'],
  'min-height': ['0px', '1px'],
  'max-width': ['none'],
  'max-height': ['none'],
}

// Properties that only matter when certain conditions are met
const CONDITIONAL_PROPERTIES: Record<string, { requires: string; values: string[] }> = {
  'align-items': { requires: 'display', values: ['flex', 'inline-flex', 'grid', 'inline-grid'] },
  'justify-content': { requires: 'display', values: ['flex', 'inline-flex', 'grid', 'inline-grid'] },
  'align-content': { requires: 'display', values: ['flex', 'inline-flex', 'grid', 'inline-grid'] },
  'flex-direction': { requires: 'display', values: ['flex', 'inline-flex'] },
  'flex-wrap': { requires: 'display', values: ['flex', 'inline-flex'] },
  'flex-grow': { requires: 'display', values: ['flex', 'inline-flex'] },
  'flex-shrink': { requires: 'display', values: ['flex', 'inline-flex'] },
  'flex-basis': { requires: 'display', values: ['flex', 'inline-flex'] },
  'gap': { requires: 'display', values: ['flex', 'inline-flex', 'grid', 'inline-grid'] },
  'grid-template-columns': { requires: 'display', values: ['grid', 'inline-grid'] },
  'grid-template-rows': { requires: 'display', values: ['grid', 'inline-grid'] },
  'grid-auto-columns': { requires: 'display', values: ['grid', 'inline-grid'] },
  'grid-auto-rows': { requires: 'display', values: ['grid', 'inline-grid'] },
  'grid-column': { requires: 'display', values: ['grid', 'inline-grid'] },
  'grid-row': { requires: 'display', values: ['grid', 'inline-grid'] },
  'z-index': { requires: 'position', values: ['relative', 'absolute', 'fixed', 'sticky'] },
  'top': { requires: 'position', values: ['relative', 'absolute', 'fixed', 'sticky'] },
  'right': { requires: 'position', values: ['relative', 'absolute', 'fixed', 'sticky'] },
  'bottom': { requires: 'position', values: ['relative', 'absolute', 'fixed', 'sticky'] },
  'left': { requires: 'position', values: ['relative', 'absolute', 'fixed', 'sticky'] },
}

export interface StyleReducerOptions {
  includeAnimations?: boolean
}

export class StyleReducer {
  private styles: Map<string, string> = new Map()
  private element: Element
  private options: StyleReducerOptions

  constructor(element: Element, computedStyle: CSSStyleDeclaration, options: StyleReducerOptions = {}) {
    this.element = element
    this.options = options

    // Store all computed styles
    for (let i = 0; i < computedStyle.length; i++) {
      const prop = computedStyle[i]
      const value = computedStyle.getPropertyValue(prop)
      this.styles.set(prop, value)
    }
  }

  /**
   * Reduce styles to only those that are visually significant
   */
  reduce(aggressive: boolean = false): StyleProperty[] {
    const reduced: StyleProperty[] = []

    for (const [name, value] of this.styles.entries()) {
      // Skip CSS variables (custom properties starting with --)
      if (name.startsWith('--')) continue

      // Skip explicitly ignored properties
      if (ALWAYS_IGNORE.has(name)) continue

      // Skip animation properties unless includeAnimations is enabled
      if (ANIMATION_PROPERTIES.has(name) && !this.options.includeAnimations) continue

      // Skip vendor prefixes unless specifically needed
      if (this.isVendorPrefix(name) && !this.isEssentialVendorPrefix(name)) continue

      // Special handling for position - always include if not static, always skip if static
      if (name === 'position') {
        if (value !== 'static') {
          reduced.push({ name, value })
        }
        continue
      }

      // Special handling for margin - detect auto centering
      if (name === 'margin-left' || name === 'margin-right') {
        if (this.isCenteredElement()) {
          reduced.push({ name, value: 'auto' })
          continue
        }
      }

      // Skip default values
      if (this.isDefaultValue(name, value)) continue

      // Skip conditional properties that don't apply
      if (!this.isConditionalPropertyRelevant(name)) continue

      // Skip overflow properties for replaced elements (img, video, iframe, etc.)
      if (this.isReplacedElement() && (name === 'overflow-x' || name === 'overflow-y' || name === 'overflow')) continue

      // Skip border styles when there's no actual border
      if (this.isBorderStyleProperty(name) && !this.hasBorder()) continue

      // Skip properties with "auto", "none", "normal" values unless they're important
      if (!this.isImportantProperty(name) && this.isDefaultishValue(value)) continue

      // In aggressive mode, skip inherited properties that match parent
      if (aggressive && this.matchesParent(name, value)) continue

      reduced.push({ name, value })
    }

    return reduced
  }

  /**
   * Check if element is a replaced element (img, video, iframe, etc.)
   */
  private isReplacedElement(): boolean {
    const replacedElements = ['IMG', 'VIDEO', 'IFRAME', 'EMBED', 'OBJECT', 'CANVAS', 'SVG']
    return replacedElements.includes(this.element.tagName)
  }

  /**
   * Check if property is a border style property
   */
  private isBorderStyleProperty(name: string): boolean {
    return name.includes('border') && name.includes('style')
  }

  /**
   * Check if element has an actual visible border
   */
  private hasBorder(): boolean {
    // Check if any border width is not 0
    const borderWidths = [
      this.styles.get('border-top-width'),
      this.styles.get('border-right-width'),
      this.styles.get('border-bottom-width'),
      this.styles.get('border-left-width'),
      this.styles.get('border-width'),
    ]

    for (const width of borderWidths) {
      if (width && width !== '0px' && width !== '0') {
        return true
      }
    }

    // Check if any border style is not 'none'
    const borderStyles = [
      this.styles.get('border-top-style'),
      this.styles.get('border-right-style'),
      this.styles.get('border-bottom-style'),
      this.styles.get('border-left-style'),
      this.styles.get('border-style'),
    ]

    for (const style of borderStyles) {
      if (style && style !== 'none') {
        // But only count it if there's also a width
        const hasWidth = borderWidths.some(w => w && w !== '0px' && w !== '0')
        return hasWidth
      }
    }

    return false
  }

  /**
   * Check if a value is a common default-ish value
   */
  private isDefaultishValue(value: string): boolean {
    const defaultish = ['auto', 'none', 'normal', '0px', '0s', '0', 'visible', 'scroll', 'ease']
    return defaultish.includes(value)
  }

  /**
   * Check if a property is important enough to keep even with default values
   */
  private isImportantProperty(name: string): boolean {
    const important = [
      'display',
      'position',
      'opacity',
      'top',
      'left',
      'right',
      'bottom',
      'z-index',
      'width',
      'height',
      'max-width',
      'max-height',
      'min-width',
      'min-height',
      'margin',
      'margin-left',
      'margin-right',
      'margin-top',
      'margin-bottom',
      'padding',
      'padding-left',
      'padding-right',
      'padding-top',
      'padding-bottom',
      'border-radius',
      'background-color',
      'overflow',
      'overflow-x',
      'overflow-y',
    ]
    return important.includes(name)
  }

  /**
   * Check if a property has a default value
   */
  private isDefaultValue(name: string, value: string): boolean {
    const defaults = DEFAULT_VALUES[name]
    if (!defaults) return false
    return defaults.includes(value)
  }

  /**
   * Check if a property is a vendor prefix
   */
  private isVendorPrefix(name: string): boolean {
    return name.startsWith('-webkit-') ||
           name.startsWith('-moz-') ||
           name.startsWith('-ms-') ||
           name.startsWith('-o-')
  }

  /**
   * Check if a vendor prefix property is essential
   */
  private isEssentialVendorPrefix(name: string): boolean {
    // Keep certain vendor prefixes that are still commonly needed
    const essential = [
      '-webkit-line-clamp',
      '-webkit-appearance',
      '-moz-appearance',
      '-webkit-background-clip', // Essential for gradient text effects
      '-webkit-text-fill-color', // Often used with background-clip: text
    ]

    // Special case: -webkit-box-orient only needed with line-clamp
    if (name === '-webkit-box-orient') {
      const lineClamp = this.styles.get('-webkit-line-clamp')
      return lineClamp !== undefined && lineClamp !== 'none'
    }

    return essential.includes(name)
  }

  /**
   * Check if a conditional property is relevant given other styles
   */
  private isConditionalPropertyRelevant(name: string): boolean {
    const condition = CONDITIONAL_PROPERTIES[name]
    if (!condition) return true

    const requiredValue = this.styles.get(condition.requires)
    if (!requiredValue) return false

    // If values array is empty, just check if required property exists
    if (condition.values.length === 0) return true

    return condition.values.includes(requiredValue)
  }

  /**
   * Check if a property value matches the parent element's value
   */
  private matchesParent(name: string, value: string): boolean {
    const parent = this.element.parentElement
    if (!parent) return false

    // List of properties that are inherited by default
    const inheritedProps = new Set([
      'color',
      'font-family',
      'font-size',
      'font-weight',
      'font-style',
      'line-height',
      'text-align',
      'letter-spacing',
      'word-spacing',
      'text-transform',
      'visibility',
    ])

    if (!inheritedProps.has(name)) return false

    const parentStyle = window.getComputedStyle(parent)
    const parentValue = parentStyle.getPropertyValue(name)

    return value === parentValue
  }

  /**
   * Get shorthand properties where possible (e.g., margin instead of margin-top, margin-right, etc.)
   */
  static optimizeShorthands(styles: StyleProperty[]): StyleProperty[] {
    const styleMap = new Map(styles.map(s => [s.name, s.value]))
    const optimized: StyleProperty[] = []
    const processed = new Set<string>()

    // Check for margin shorthand
    if (this.tryMarginShorthand(styleMap, optimized, processed)) {
      // Margin shorthand was used
    }

    // Check for padding shorthand
    if (this.tryPaddingShorthand(styleMap, optimized, processed)) {
      // Padding shorthand was used
    }

    // Check for border shorthand
    if (this.tryBorderShorthand(styleMap, optimized, processed)) {
      // Border shorthand was used
    }

    // Check for border-radius shorthand
    if (this.tryBorderRadiusShorthand(styleMap, optimized, processed)) {
      // Border-radius shorthand was used
    }

    // Add remaining properties
    for (const style of styles) {
      if (!processed.has(style.name)) {
        optimized.push(style)
      }
    }

    return optimized
  }

  private static tryMarginShorthand(
    styleMap: Map<string, string>,
    optimized: StyleProperty[],
    processed: Set<string>
  ): boolean {
    const top = styleMap.get('margin-top')
    const right = styleMap.get('margin-right')
    const bottom = styleMap.get('margin-bottom')
    const left = styleMap.get('margin-left')

    if (top && right && bottom && left) {
      if (top === right && right === bottom && bottom === left) {
        optimized.push({ name: 'margin', value: top })
      } else if (top === bottom && right === left) {
        optimized.push({ name: 'margin', value: `${top} ${right}` })
      } else if (right === left) {
        optimized.push({ name: 'margin', value: `${top} ${right} ${bottom}` })
      } else {
        optimized.push({ name: 'margin', value: `${top} ${right} ${bottom} ${left}` })
      }
      processed.add('margin-top')
      processed.add('margin-right')
      processed.add('margin-bottom')
      processed.add('margin-left')
      return true
    }
    return false
  }

  private static tryPaddingShorthand(
    styleMap: Map<string, string>,
    optimized: StyleProperty[],
    processed: Set<string>
  ): boolean {
    const top = styleMap.get('padding-top')
    const right = styleMap.get('padding-right')
    const bottom = styleMap.get('padding-bottom')
    const left = styleMap.get('padding-left')

    if (top && right && bottom && left) {
      if (top === right && right === bottom && bottom === left) {
        optimized.push({ name: 'padding', value: top })
      } else if (top === bottom && right === left) {
        optimized.push({ name: 'padding', value: `${top} ${right}` })
      } else if (right === left) {
        optimized.push({ name: 'padding', value: `${top} ${right} ${bottom}` })
      } else {
        optimized.push({ name: 'padding', value: `${top} ${right} ${bottom} ${left}` })
      }
      processed.add('padding-top')
      processed.add('padding-right')
      processed.add('padding-bottom')
      processed.add('padding-left')
      return true
    }
    return false
  }

  private static tryBorderShorthand(
    styleMap: Map<string, string>,
    optimized: StyleProperty[],
    processed: Set<string>
  ): boolean {
    const width = styleMap.get('border-width')
    const style = styleMap.get('border-style')
    const color = styleMap.get('border-color')

    if (width && style && color && width !== '0px' && style !== 'none') {
      optimized.push({ name: 'border', value: `${width} ${style} ${color}` })
      processed.add('border-width')
      processed.add('border-style')
      processed.add('border-color')
      return true
    }
    return false
  }

  private static tryBorderRadiusShorthand(
    styleMap: Map<string, string>,
    optimized: StyleProperty[],
    processed: Set<string>
  ): boolean {
    const topLeft = styleMap.get('border-top-left-radius')
    const topRight = styleMap.get('border-top-right-radius')
    const bottomRight = styleMap.get('border-bottom-right-radius')
    const bottomLeft = styleMap.get('border-bottom-left-radius')

    if (topLeft && topRight && bottomRight && bottomLeft) {
      // If all corners are the same, use single value
      if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
        optimized.push({ name: 'border-radius', value: topLeft })
      } else {
        // Use full shorthand: top-left top-right bottom-right bottom-left
        optimized.push({ name: 'border-radius', value: `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}` })
      }
      processed.add('border-top-left-radius')
      processed.add('border-top-right-radius')
      processed.add('border-bottom-right-radius')
      processed.add('border-bottom-left-radius')
      // Also mark logical properties as processed
      processed.add('border-start-start-radius')
      processed.add('border-start-end-radius')
      processed.add('border-end-start-radius')
      processed.add('border-end-end-radius')
      return true
    }
    return false
  }

  /**
   * Detect if an element is horizontally centered using margin: auto
   * Check if element has classes or styles suggesting centering
   */
  private isCenteredElement(): boolean {
    // Check for common centering classes
    const classes = this.element.className
    if (typeof classes === 'string') {
      if (classes.includes('m-auto') ||
          classes.includes('mx-auto') ||
          classes.includes('center')) {
        return true
      }
    }

    // Check for display: block with equal left/right margins
    const display = this.styles.get('display')
    const marginLeft = this.styles.get('margin-left')
    const marginRight = this.styles.get('margin-right')

    if (display === 'block' && marginLeft === marginRight &&
        marginLeft && !marginLeft.startsWith('0')) {
      // Equal non-zero margins on block element = likely centered
      return true
    }

    return false
  }
}
