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

export interface CDPExtractionResult {
  inlineStyles: CDPCSSProperty[]
  matchedRules: CDPCSSRule[]
  pseudoElements: { pseudoType: string; rules: CDPCSSRule[] }[]
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
    }
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
