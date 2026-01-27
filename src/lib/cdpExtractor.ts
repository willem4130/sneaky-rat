/**
 * CDP-based CSS Extractor
 * Uses Chrome DevTools Protocol to extract actual CSS rules instead of computed styles
 * This gives us the original CSS values (width: 100%) instead of computed values (width: 768px)
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, prefer-const */
// Chrome DevTools Protocol responses are untyped - disabling unsafe-any rules for this file

export interface CDPCSSProperty {
  name: string
  value: string
}

export interface CDPCSSRule {
  selectorText: string
  cssProperties: CDPCSSProperty[]
  origin: 'inline' | 'stylesheet' | 'attribute'
  styleSheetId?: string
}

export interface CDPKeyframe {
  offset: string // e.g., "0%", "50%", "100%", "from", "to"
  properties: CDPCSSProperty[]
}

export interface CDPKeyframeRule {
  name: string
  keyframes: CDPKeyframe[]
}

export interface CDPInteractionState {
  state: 'hover' | 'focus' | 'active' | 'focus-visible'
  rules: CDPCSSRule[]
}

export interface CDPExtractionResult {
  inlineStyles: CDPCSSProperty[]
  matchedRules: CDPCSSRule[]
  pseudoElements: { pseudoType: string; rules: CDPCSSRule[] }[]
  keyframeRules: CDPKeyframeRule[]
  interactionStates: CDPInteractionState[]
}

export class CDPExtractor {
  private tabId: number
  private isAttached = false

  constructor(tabId: number) {
    this.tabId = tabId
  }

  /**
   * Attach CDP debugger to the tab
   */
  async attach(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId: this.tabId }, '1.3', () => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to attach debugger: ${chrome.runtime.lastError.message}`))
        } else {
          this.isAttached = true
          resolve()
        }
      })
    })
  }

  /**
   * Detach CDP debugger from the tab
   */
  async detach(): Promise<void> {
    if (!this.isAttached) return

    return new Promise((resolve) => {
      chrome.debugger.detach({ tabId: this.tabId }, () => {
        this.isAttached = false
        resolve()
      })
    })
  }

  /**
   * Enable CSS domain in CDP
   */
  async enableCSS(): Promise<void> {
    await this.sendCommand('CSS.enable', {})
  }

  /**
   * Enable DOM domain in CDP
   */
  async enableDOM(): Promise<void> {
    await this.sendCommand('DOM.enable', {})
  }

  /**
   * Get the root DOM node
   */
  async getDocument(): Promise<{ nodeId: number }> {
    const result = await this.sendCommand('DOM.getDocument', { depth: -1, pierce: true })
    return { nodeId: result.root.nodeId }
  }

  /**
   * Query selector to get node ID from CSS selector
   */
  async querySelector(nodeId: number, selector: string): Promise<number | null> {
    try {
      const result = await this.sendCommand('DOM.querySelector', { nodeId, selector })
      return result.nodeId || null
    } catch {
      return null
    }
  }

  /**
   * Get all descendant node IDs recursively
   * Uses a simpler approach: querySelectorAll for all descendants
   */
  async getAllDescendantNodeIds(nodeId: number): Promise<number[]> {
    try {
      // Use querySelectorAll to get ALL descendant elements efficiently
      const result = await this.sendCommand('DOM.querySelectorAll', {
        nodeId,
        selector: '*' // Select all descendants
      })

      // Filter out the root node itself if it's included
      return result.nodeIds.filter((id: number) => id !== nodeId)
    } catch (err) {
      console.error('Failed to get descendant nodes:', err)
      return []
    }
  }

  /**
   * Get matched CSS styles for a node using CDP
   * This returns the ACTUAL CSS rules, not computed styles
   */
  async getMatchedStylesForNode(nodeId: number): Promise<CDPExtractionResult> {
    const result = await this.sendCommand('CSS.getMatchedStylesForNode', { nodeId })

    // Parse inline styles
    const inlineStyles: CDPCSSProperty[] = result.inlineStyle?.cssProperties || []

    // Parse matched CSS rules from stylesheets
    const matchedRules: CDPCSSRule[] = []

    if (result.matchedCSSRules) {
      for (const match of result.matchedCSSRules) {
        const rule = match.rule
        if (rule && rule.style) {
          // Get the actual rule text from the stylesheet for better accuracy
          let selectorText = rule.selectorList?.selectors?.map((s: { text: string }) => s.text).join(', ') || ''

          matchedRules.push({
            selectorText,
            cssProperties: rule.style.cssProperties || [],
            origin: match.matchingSelectors ? 'stylesheet' : 'inline',
            styleSheetId: rule.styleSheetId,
          })
        }
      }
    }

    // Parse attribute styles (width="100", height="50")
    if (result.attributesStyle?.cssProperties) {
      matchedRules.push({
        selectorText: '[attributes]',
        cssProperties: result.attributesStyle.cssProperties,
        origin: 'attribute',
      })
    }

    // Parse pseudo elements (::before, ::after, etc.)
    const pseudoElements: { pseudoType: string; rules: CDPCSSRule[] }[] = []
    if (result.pseudoElements) {
      for (const pseudo of result.pseudoElements) {
        const pseudoRules: CDPCSSRule[] = []
        if (pseudo.matches) {
          for (const match of pseudo.matches) {
            const rule = match.rule
            if (rule && rule.style) {
              pseudoRules.push({
                selectorText: rule.selectorList?.selectors?.map((s: { text: string }) => s.text).join(', ') || '',
                cssProperties: rule.style.cssProperties || [],
                origin: 'stylesheet',
                styleSheetId: rule.styleSheetId,
              })
            }
          }
        }
        pseudoElements.push({
          pseudoType: pseudo.pseudoType,
          rules: pseudoRules,
        })
      }
    }

    return {
      inlineStyles,
      matchedRules,
      pseudoElements,
      keyframeRules: [], // Will be populated by extractKeyframesForElement
      interactionStates: [], // Will be populated by extractInteractionStates
    }
  }

  /**
   * Get all stylesheets in the document
   */
  async getAllStyleSheets(): Promise<{ styleSheetId: string; sourceURL: string }[]> {
    const result = await this.sendCommand('CSS.getAllStyleSheets', {})
    return result.headers || []
  }

  /**
   * Get stylesheet text by ID
   */
  async getStyleSheetText(styleSheetId: string): Promise<string> {
    try {
      const result = await this.sendCommand('CSS.getStyleSheetText', { styleSheetId })
      return result.text || ''
    } catch {
      return ''
    }
  }

  /**
   * Extract @keyframes rules from CSS text
   */
  parseKeyframesFromCSS(cssText: string): CDPKeyframeRule[] {
    const keyframeRules: CDPKeyframeRule[] = []

    // Match @keyframes blocks
    const keyframeRegex = /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
    let match

    while ((match = keyframeRegex.exec(cssText)) !== null) {
      const name = match[1] as string
      const content = match[2] as string
      const keyframes: CDPKeyframe[] = []

      // Match individual keyframe selectors (0%, 50%, 100%, from, to)
      const frameRegex = /(from|to|\d+%)\s*\{([^}]*)\}/g
      let frameMatch

      while ((frameMatch = frameRegex.exec(content)) !== null) {
        const offset = frameMatch[1] as string
        const propsText = frameMatch[2] as string
        const properties: CDPCSSProperty[] = []

        // Parse properties
        const propRegex = /([a-zA-Z-]+)\s*:\s*([^;]+);?/g
        let propMatch

        while ((propMatch = propRegex.exec(propsText)) !== null) {
          properties.push({
            name: propMatch[1].trim(),
            value: propMatch[2].trim(),
          })
        }

        keyframes.push({ offset, properties })
      }

      if (keyframes.length > 0) {
        keyframeRules.push({ name, keyframes })
      }
    }

    return keyframeRules
  }

  /**
   * Extract keyframes that are used by an element's animation-name
   */
  async extractKeyframesForElement(
    matchedRules: CDPCSSRule[],
    inlineStyles: CDPCSSProperty[]
  ): Promise<CDPKeyframeRule[]> {
    // Find all animation-name values
    const animationNames = new Set<string>()

    // Check inline styles
    for (const prop of inlineStyles) {
      if (prop.name === 'animation-name' || prop.name === 'animation') {
        const names = this.extractAnimationNames(prop.value)
        names.forEach((n) => animationNames.add(n))
      }
    }

    // Check matched rules
    for (const rule of matchedRules) {
      for (const prop of rule.cssProperties) {
        if (prop.name === 'animation-name' || prop.name === 'animation') {
          const names = this.extractAnimationNames(prop.value)
          names.forEach((n) => animationNames.add(n))
        }
      }
    }

    if (animationNames.size === 0) {
      return []
    }

    // Get all stylesheets and search for keyframes
    const allKeyframes: CDPKeyframeRule[] = []
    const styleSheets = await this.getAllStyleSheets()

    for (const sheet of styleSheets) {
      const cssText = await this.getStyleSheetText(sheet.styleSheetId)
      const keyframes = this.parseKeyframesFromCSS(cssText)

      // Filter to only include keyframes that are actually used
      for (const kf of keyframes) {
        if (animationNames.has(kf.name)) {
          // Avoid duplicates
          if (!allKeyframes.find((k) => k.name === kf.name)) {
            allKeyframes.push(kf)
          }
        }
      }
    }

    return allKeyframes
  }

  /**
   * Extract interaction state styles (:hover, :focus, :active, :focus-visible)
   * Uses CSS.forcePseudoState to programmatically trigger states and capture styles
   */
  async extractInteractionStates(nodeId: number): Promise<CDPInteractionState[]> {
    const states: ('hover' | 'focus' | 'active' | 'focus-visible')[] = [
      'hover',
      'focus',
      'active',
      'focus-visible',
    ]
    const interactionStates: CDPInteractionState[] = []

    for (const state of states) {
      try {
        // Force the pseudo state on the element
        await this.sendCommand('CSS.forcePseudoState', {
          nodeId,
          forcedPseudoClasses: [state],
        })

        // Get styles with the forced state
        const stateResult = await this.sendCommand('CSS.getMatchedStylesForNode', { nodeId })

        // Parse the state-specific rules
        const stateRules: CDPCSSRule[] = []

        if (stateResult.matchedCSSRules) {
          for (const match of stateResult.matchedCSSRules) {
            const rule = match.rule
            if (rule && rule.style) {
              const selectorText =
                rule.selectorList?.selectors?.map((s: { text: string }) => s.text).join(', ') || ''

              // Only include rules that contain the state pseudo-class
              // This filters out base rules that don't change with the state
              const hasStatePseudo = selectorText.includes(`:${state}`)

              if (hasStatePseudo && rule.style.cssProperties?.length > 0) {
                stateRules.push({
                  selectorText,
                  cssProperties: rule.style.cssProperties,
                  origin: 'stylesheet',
                  styleSheetId: rule.styleSheetId,
                })
              }
            }
          }
        }

        // Clear the forced state
        await this.sendCommand('CSS.forcePseudoState', {
          nodeId,
          forcedPseudoClasses: [],
        })

        // Only add if we found state-specific rules
        if (stateRules.length > 0) {
          interactionStates.push({
            state,
            rules: stateRules,
          })
        }
      } catch (err) {
        // State extraction failed for this state, continue with others
        console.warn(`Failed to extract ${state} state:`, err)

        // Make sure to clear forced state on error
        try {
          await this.sendCommand('CSS.forcePseudoState', {
            nodeId,
            forcedPseudoClasses: [],
          })
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    return interactionStates
  }

  /**
   * Extract animation names from animation or animation-name property value
   */
  private extractAnimationNames(value: string): string[] {
    // Handle multiple animations separated by comma
    const animations = value.split(',')
    const names: string[] = []

    for (const anim of animations) {
      // animation shorthand: name duration timing-function delay iteration-count direction fill-mode play-state
      // animation-name: just the name(s)
      const parts = anim.trim().split(/\s+/)

      // First non-timing value is usually the animation name
      for (const part of parts) {
        // Skip timing values, counts, directions, fill modes
        if (
          /^\d/.test(part) || // starts with number (duration, delay)
          part === 'ease' ||
          part === 'ease-in' ||
          part === 'ease-out' ||
          part === 'ease-in-out' ||
          part === 'linear' ||
          part === 'step-start' ||
          part === 'step-end' ||
          part === 'infinite' ||
          part === 'normal' ||
          part === 'reverse' ||
          part === 'alternate' ||
          part === 'alternate-reverse' ||
          part === 'none' ||
          part === 'forwards' ||
          part === 'backwards' ||
          part === 'both' ||
          part === 'running' ||
          part === 'paused' ||
          part.startsWith('cubic-bezier') ||
          part.startsWith('steps(')
        ) {
          continue
        }
        names.push(part)
        break // Only take the first valid name per animation
      }
    }

    return names.filter((n) => n && n !== 'none')
  }

  /**
   * Send command via CDP
   */
  private async sendCommand(method: string, params: Record<string, unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId: this.tabId }, method, params, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`CDP ${method} failed: ${chrome.runtime.lastError.message}`))
        } else {
          resolve(result)
        }
      })
    })
  }
}

/**
 * Helper function to extract CSS for an element using CDP
 * This is the main entry point for CDP-based extraction
 */
export async function extractWithCDP(
  tabId: number,
  selector: string
): Promise<CDPExtractionResult | null> {
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
    const nodeId = await extractor.querySelector(rootNodeId, selector)

    if (!nodeId) {
      console.error('Element not found with selector:', selector)
      return null
    }

    // Extract styles
    const result = await extractor.getMatchedStylesForNode(nodeId)

    return result
  } finally {
    // Always detach debugger
    await extractor.detach()
  }
}
