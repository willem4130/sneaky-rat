import './styles.css'
import { ElementExtractor } from '../lib/elementExtractor'
import { PageDecomposer, generateFolderStructure } from '../lib/pageDecomposer'
import type { PageDecomposition } from '../lib/pageDecomposer'
import type { CopyOptions, ExtractedElement } from '../lib/types'

class ElementCopier {
  private isActive = false
  private highlightDiv: HTMLDivElement | null = null
  private copyButton: HTMLButtonElement | null = null
  private currentElement: Element | null = null
  private rafId: number | null = null

  // Multi-selection support
  private selectedElements: Map<Element, HTMLDivElement> = new Map()
  private selectionContainer: HTMLDivElement | null = null

  constructor() {
    this.init()
  }

  private init() {
    // Listen for messages from the popup/background
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (message.action === 'toggle') {
        this.toggle()
        sendResponse({ success: true })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      } else if (message.action === 'getStatus') {
        sendResponse({ isActive: this.isActive })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      } else if (message.action === 'extractFullPage') {
        void this.extractFullPage()
        sendResponse({ success: true })
      }
      return true
    })

    // Create highlight and button elements
    this.createElements()
  }

  private createElements() {
    // Create container for selection highlights
    this.selectionContainer = document.createElement('div')
    this.selectionContainer.className = 'element-copier-selection-container'

    // Create highlight div (for hover preview)
    this.highlightDiv = document.createElement('div')
    this.highlightDiv.className = 'element-copier-highlight'
    this.highlightDiv.style.display = 'none'

    // Create copy button
    this.copyButton = document.createElement('button')
    this.copyButton.className = 'element-copier-copy-button'
    this.copyButton.innerHTML = `
      <svg class="element-copier-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      steal
    `
    this.copyButton.style.display = 'none'
    this.copyButton.addEventListener('click', (e) => {
      e.stopPropagation()
      void this.copyElement()
    })
  }

  private toggle() {
    this.isActive = !this.isActive

    if (this.isActive) {
      this.activate()
    } else {
      this.deactivate()
    }
  }

  private activate() {
    document.body.classList.add('element-copier-active')
    if (this.selectionContainer) document.body.appendChild(this.selectionContainer)
    if (this.highlightDiv) document.body.appendChild(this.highlightDiv)
    if (this.copyButton) document.body.appendChild(this.copyButton)

    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('click', this.handleClick, true)
    document.addEventListener('keydown', this.handleKeyDown)
  }

  private deactivate() {
    document.body.classList.remove('element-copier-active')

    if (this.highlightDiv) this.highlightDiv.style.display = 'none'
    if (this.copyButton) this.copyButton.style.display = 'none'

    // Clear all selections
    this.clearSelections()

    // Remove selection container
    if (this.selectionContainer && this.selectionContainer.parentNode) {
      this.selectionContainer.parentNode.removeChild(this.selectionContainer)
    }

    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('click', this.handleClick, true)
    document.removeEventListener('keydown', this.handleKeyDown)

    this.currentElement = null
  }

  private clearSelections() {
    // Remove all selection highlights
    for (const highlight of this.selectedElements.values()) {
      if (highlight.parentNode) {
        highlight.parentNode.removeChild(highlight)
      }
    }
    this.selectedElements.clear()
    this.updateButtonText()
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isActive) return

    // Use requestAnimationFrame to throttle updates and prevent jitter
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
    }

    this.rafId = requestAnimationFrame(() => {
      // Check if mouse is over the copy button - if so, keep current selection
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (target && target.closest('.element-copier-copy-button')) {
        // Don't update - keep current element selected so button stays visible
        return
      }

      // Temporarily hide our elements to get the element underneath
      if (this.highlightDiv) this.highlightDiv.style.display = 'none'
      if (this.copyButton) this.copyButton.style.display = 'none'

      // Get the element under the cursor
      const element = document.elementFromPoint(e.clientX, e.clientY)

      // Restore our elements
      if (this.highlightDiv) this.highlightDiv.style.display = 'block'
      if (this.copyButton) this.copyButton.style.display = 'flex'

      if (!element) return

      // Only update if it's a different element
      if (this.currentElement !== element) {
        this.currentElement = element
        this.updateHighlight(element)
      }
    })
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.isActive) return

    // Don't prevent clicks on the copy button
    const target = e.target as Element
    if (target.closest('.element-copier-copy-button')) {
      return
    }

    // Prevent default action on other elements
    e.preventDefault()
    e.stopPropagation()

    // Handle Shift+click for multi-selection
    if (e.shiftKey && this.currentElement) {
      this.toggleElementSelection(this.currentElement)
    }
  }

  private toggleElementSelection(element: Element) {
    if (this.selectedElements.has(element)) {
      // Remove from selection
      const highlight = this.selectedElements.get(element)
      if (highlight && highlight.parentNode) {
        highlight.parentNode.removeChild(highlight)
      }
      this.selectedElements.delete(element)
    } else {
      // Add to selection
      const highlight = this.createSelectionHighlight(element)
      this.selectionContainer?.appendChild(highlight)
      this.selectedElements.set(element, highlight)
    }
    this.updateButtonText()
  }

  private createSelectionHighlight(element: Element): HTMLDivElement {
    const highlight = document.createElement('div')
    highlight.className = 'element-copier-selection'

    const rect = element.getBoundingClientRect()
    highlight.style.top = `${rect.top}px`
    highlight.style.left = `${rect.left}px`
    highlight.style.width = `${rect.width}px`
    highlight.style.height = `${rect.height}px`

    // Add selection number badge
    const badge = document.createElement('span')
    badge.className = 'element-copier-selection-badge'
    badge.textContent = String(this.selectedElements.size + 1)
    highlight.appendChild(badge)

    return highlight
  }

  private updateButtonText() {
    if (!this.copyButton) return

    const count = this.selectedElements.size
    if (count > 0) {
      this.copyButton.innerHTML = `
        <svg class="element-copier-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        steal ${count + 1}
      `
    } else {
      this.copyButton.innerHTML = `
        <svg class="element-copier-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        steal
      `
    }
  }

  private updateSelectionPositions() {
    // Update positions of all selection highlights (for scroll/resize)
    for (const [element, highlight] of this.selectedElements.entries()) {
      const rect = element.getBoundingClientRect()
      highlight.style.top = `${rect.top}px`
      highlight.style.left = `${rect.left}px`
      highlight.style.width = `${rect.width}px`
      highlight.style.height = `${rect.height}px`
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return

    // Press ESC to clear selection first, then deactivate
    if (e.key === 'Escape') {
      if (this.selectedElements.size > 0) {
        // First ESC clears selection
        this.clearSelections()
      } else {
        // Second ESC deactivates
        this.toggle()
      }
    }
  }

  private updateHighlight(element: Element) {
    if (!this.highlightDiv || !this.copyButton) return

    const rect = element.getBoundingClientRect()

    // Update highlight position (using fixed positioning, so no scroll offset needed)
    this.highlightDiv.style.display = 'block'
    this.highlightDiv.style.top = `${rect.top}px`
    this.highlightDiv.style.left = `${rect.left}px`
    this.highlightDiv.style.width = `${rect.width}px`
    this.highlightDiv.style.height = `${rect.height}px`

    // Update button position - place INSIDE the highlighted area (top-right corner)
    this.copyButton.style.display = 'flex'

    // Position button inside the top-right corner of the highlighted element
    const buttonPadding = 8 // padding from edges
    const buttonTop = rect.top + buttonPadding
    let buttonLeft = rect.right - 80 - buttonPadding // 80px is approx button width

    // If element is too small, place button at top-left instead
    if (rect.width < 100) {
      buttonLeft = rect.left + buttonPadding
    }

    // If element is very narrow, center the button
    if (rect.width < 80) {
      buttonLeft = rect.left + (rect.width - 70) / 2
    }

    // Ensure button doesn't go off screen
    if (buttonLeft < 10) {
      buttonLeft = 10
    }
    if (buttonLeft + 80 > window.innerWidth) {
      buttonLeft = window.innerWidth - 90
    }

    this.copyButton.style.top = `${buttonTop}px`
    this.copyButton.style.left = `${buttonLeft}px`
  }

  private async copyElement() {
    // Gather all elements to extract (selected + current)
    const elementsToExtract: Element[] = []

    // Add all selected elements
    for (const element of this.selectedElements.keys()) {
      elementsToExtract.push(element)
    }

    // Add current element if not already in selection
    if (this.currentElement && !this.selectedElements.has(this.currentElement)) {
      elementsToExtract.push(this.currentElement)
    }

    if (elementsToExtract.length === 0) {
      console.error('No elements selected')
      return
    }

    try {
      // Get options from storage
      const options = await this.getCopyOptions()
      this.lastOptions = options

      const isMultiple = elementsToExtract.length > 1
      console.log(`🐀 Sneaky Rat: Extracting ${elementsToExtract.length} element(s) with CDP...`)
      console.log('Options:', options)

      if (isMultiple) {
        // Multi-element extraction
        await this.copyMultipleElements(elementsToExtract, options)
      } else {
        // Single element extraction (existing logic)
        await this.copySingleElement(elementsToExtract[0], options)
      }

    } catch (error) {
      console.error('Failed to copy element(s):', error)
      console.error('Error stack:', (error as Error).stack)
      this.showCopyError()
    }
  }

  private async copySingleElement(element: Element, options: CopyOptions) {
    // Get the element's HTML
    const html = element.outerHTML

    // Generate a CSS selector for the element
    const selector = this.generateSelector(element)
    console.log('Generated selector:', selector)

    // Send message to background script for CDP extraction
    const response: { success: boolean; data?: { markdown: string; standaloneHTML: string }; error?: string } =
      await chrome.runtime.sendMessage({
        type: 'EXTRACT_WITH_CDP',
        elementPath: selector,
        html: html,
        includeAnimations: options.includeAnimations,
        includeHoverStates: options.includeHoverStates,
      })

    if (response.success && response.data) {
      console.log('✅ CDP extraction successful')

      // Copy markdown to clipboard
      await this.copyToClipboard(response.data.markdown)

      // Download HTML file
      console.log('📥 Downloading HTML file...')
      await this.downloadHTML(response.data.standaloneHTML, 'extracted-component.html')

      // Show success feedback
      this.showCopySuccess()
    } else {
      console.warn('CDP extraction failed, falling back to simple extraction:', response.error)
      await this.copyElementSimple()
    }
  }

  private async copyMultipleElements(elements: Element[], options: CopyOptions) {
    // Extract each element and combine results
    const extractions: { selector: string; html: string }[] = []

    for (const element of elements) {
      const selector = this.generateSelector(element)
      const html = element.outerHTML
      extractions.push({ selector, html })
    }

    // Send message to background script for multi-element extraction
    const response: { success: boolean; data?: { markdown: string; standaloneHTML: string }; error?: string } =
      await chrome.runtime.sendMessage({
        type: 'EXTRACT_MULTIPLE_WITH_CDP',
        elements: extractions,
        includeAnimations: options.includeAnimations,
        includeHoverStates: options.includeHoverStates,
      })

    if (response.success && response.data) {
      console.log('✅ Multi-element CDP extraction successful')

      // Copy markdown to clipboard
      await this.copyToClipboard(response.data.markdown)

      // Download HTML file
      console.log('📥 Downloading HTML file...')
      await this.downloadHTML(response.data.standaloneHTML, 'extracted-components.html')

      // Clear selections after successful extraction
      this.clearSelections()

      // Show success feedback
      this.showCopySuccess()
    } else {
      console.warn('Multi-element CDP extraction failed:', response.error)
      this.showCopyError()
    }
  }

  /**
   * Simple extraction fallback when CDP is not available
   */
  private async copyElementSimple() {
    if (!this.currentElement) return

    try {
      // Get the element's HTML
      const html = this.currentElement.outerHTML

      // Extract all stylesheet URLs from the page
      const stylesheets: string[] = []
      document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        const href = (link as HTMLLinkElement).href
        if (href) stylesheets.push(href)
      })

      // Extract all inline <style> tags
      const inlineStyles: string[] = []
      document.querySelectorAll('style').forEach((style) => {
        const content = style.textContent
        if (content) inlineStyles.push(content)
      })

      // Capture base typography and sizing from html/body
      const htmlStyles = window.getComputedStyle(document.documentElement)
      const bodyStyles = window.getComputedStyle(document.body)

      const baseStyles = {
        htmlFontSize: htmlStyles.fontSize,
        bodyFontSize: bodyStyles.fontSize,
        bodyFontFamily: bodyStyles.fontFamily,
        bodyLineHeight: bodyStyles.lineHeight,
        bodyColor: bodyStyles.color,
        bodyBackground: bodyStyles.backgroundColor,
      }

      // Generate standalone HTML with stylesheet links and inline styles
      const standaloneHTML = this.generateSimpleHTML(html, stylesheets, inlineStyles, baseStyles)

      // Create simple markdown output
      const markdown = `# Extracted UI Element\n\n## HTML\n\n\`\`\`html\n${html}\n\`\`\`\n\n## Stylesheets Used\n\n${stylesheets.map(s => `- ${s}`).join('\n')}\n\n## Standalone HTML\n\nA complete HTML file has been downloaded with all necessary stylesheets included.`

      // Copy to clipboard
      await this.copyToClipboard(markdown)

      // Download HTML file
      console.log('📥 Downloading HTML file...')
      await this.downloadHTML(standaloneHTML, 'extracted-component.html')

      // Show success feedback
      this.showCopySuccess()

    } catch (error) {
      console.error('Failed to copy element (simple):', error)
      this.showCopyError()
    }
  }

  /**
   * Generate simple standalone HTML with stylesheet links and inline styles
   */
  private generateSimpleHTML(
    html: string,
    stylesheets: string[],
    inlineStyles: string[],
    baseStyles: {
      htmlFontSize: string
      bodyFontSize: string
      bodyFontFamily: string
      bodyLineHeight: string
      bodyColor: string
      bodyBackground: string
    }
  ): string {
    let output = '<!DOCTYPE html>\n'
    output += '<html lang="en">\n'
    output += '<head>\n'
    output += '  <meta charset="UTF-8">\n'
    output += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    output += '  <title>Extracted UI Component</title>\n'

    // Include all stylesheets from the original page
    for (const stylesheet of stylesheets) {
      output += `  <link rel="stylesheet" href="${stylesheet}">\n`
    }

    // Include all inline styles from the original page
    if (inlineStyles.length > 0) {
      output += '  <style>\n'
      output += '    /* Inline styles from the original page */\n'
      for (const style of inlineStyles) {
        output += style + '\n'
      }
      output += '  </style>\n'
    }

    // Apply base styles from the original html/body
    output += '  <style>\n'
    output += '    /* Base styles from original page */\n'
    output += '    html {\n'
    output += `      font-size: ${baseStyles.htmlFontSize};\n`
    output += '    }\n\n'
    output += '    body {\n'
    output += '      margin: 0;\n'
    output += '      padding: 20px;\n'
    output += `      font-size: ${baseStyles.bodyFontSize};\n`
    output += `      font-family: ${baseStyles.bodyFontFamily};\n`
    output += `      line-height: ${baseStyles.bodyLineHeight};\n`
    output += `      color: ${baseStyles.bodyColor};\n`
    output += `      background-color: ${baseStyles.bodyBackground};\n`
    output += '    }\n'
    output += '  </style>\n'
    output += '</head>\n'
    output += '<body>\n'
    output += '  ' + html + '\n'
    output += '</body>\n'
    output += '</html>\n'

    return output
  }

  private async copyToClipboard(text: string): Promise<void> {
    // Focus the window first to ensure clipboard access
    window.focus()

    // Use the standard clipboard API - Chrome extensions have clipboardWrite permission
    await navigator.clipboard.writeText(text)
  }

  private async getCopyOptions(): Promise<CopyOptions> {
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        includeAssets: true,
        aggressiveReduction: false,
        includeHoverStates: false,
        includePseudoElements: true,
        includeAnimations: false,
        outputMode: 'html',
      }, (items) => {
        resolve(items as CopyOptions)
      })
    })
  }

  private formatOutput(extracted: ExtractedElement): string {
    // Check which mode to use
    const options = this.getCurrentOptions()

    if (options && options.outputMode === 'component') {
      return this.formatComponentOutput(extracted)
    }

    return this.formatHTMLOutput(extracted)
  }

  private lastOptions: CopyOptions | null = null

  private getCurrentOptions(): CopyOptions | null {
    return this.lastOptions
  }

  private formatHTMLOutput(extracted: ExtractedElement): string {
    const { html, css, assets, metadata } = extracted

    // Parse HTML to extract classes and detect framework
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    const rootElement = tempDiv.firstElementChild as HTMLElement
    const classes = rootElement?.className || ''
    const framework = this.detectFramework(classes)

    let output = `# Extracted UI Component\n\n`

    // Metadata
    output += `## Metadata\n`
    output += `- **Tag**: \`${metadata.tagName}\`\n`
    output += `- **Dimensions**: ${Math.round(metadata.dimensions.width)}x${Math.round(metadata.dimensions.height)}px\n`
    output += `- **Elements**: ${metadata.totalElements || 1}\n`
    output += `- **Framework Detected**: ${framework}\n\n`

    // Clean HTML with original classes
    output += `## HTML Structure\n\n`
    output += `\`\`\`html\n${html}\n\`\`\`\n\n`

    // Framework info
    if (framework !== 'None detected') {
      output += `## Framework Requirements\n\n`
      output += `⚠️ **This component requires ${framework}**\n\n`

      if (framework.includes('Tailwind')) {
        output += `To use this component:\n`
        output += `1. Install Tailwind CSS in your project\n`
        output += `2. The classes above will work automatically\n`
        output += `3. Custom styles (below) are for non-Tailwind properties\n\n`
      }
    }

    // Extracted CSS as fallback/supplement
    output += `## Extracted Styles\n\n`
    output += `These styles are extracted from computed values and include:\n`
    output += `- Custom colors, animations, and effects\n`
    output += `- Fallback styles if framework is not used\n`
    output += `- ${metadata.reducedStylesCount} properties (${metadata.reductionPercentage}% reduction from ${metadata.computedStylesCount})\n\n`
    output += `\`\`\`css\n${css}\n\`\`\`\n\n`

    // Assets
    if (assets.images.length > 0 || assets.fonts.length > 0 || assets.backgroundImages.length > 0) {
      output += `## Assets\n\n`
      if (assets.images.length > 0) {
        output += `**Images** (${assets.images.length}):\n`
        assets.images.forEach((img: string, i: number) => {
          output += `${i + 1}. \`${img}\`\n`
        })
        output += `\n`
      }
      if (assets.backgroundImages.length > 0) {
        output += `**Background Images** (${assets.backgroundImages.length}):\n`
        assets.backgroundImages.forEach((img: string, i: number) => {
          output += `${i + 1}. \`${img}\`\n`
        })
        output += `\n`
      }
      if (assets.fonts.length > 0) {
        output += `**Fonts**: ${[...new Set(assets.fonts)].join(', ')}\n\n`
      }
    }

    // Usage instructions
    output += `## Usage Instructions\n\n`
    output += `### Option 1: With ${framework || 'Framework'}\n`
    output += `1. Copy the HTML structure above\n`
    output += `2. Ensure ${framework || 'the framework'} is installed\n`
    output += `3. Add custom styles for properties not covered by framework\n\n`

    output += `### Option 2: Standalone HTML\n`
    output += `1. Copy both HTML and CSS\n`
    output += `2. Include the CSS in your stylesheet\n`
    output += `3. Note: Some responsive features may need adjustment\n\n`

    return output
  }

  private detectFramework(classes: string): string {
    if (!classes) return 'None detected'

    const classArray = classes.split(' ')

    // Tailwind detection
    const tailwindPatterns = ['flex', 'grid', 'w-', 'h-', 'p-', 'm-', 'px-', 'py-', 'mx-', 'my-', 'text-', 'bg-', 'border-', 'rounded-', 'gap-', 'items-', 'justify-']
    const hasTailwind = tailwindPatterns.some(pattern =>
      classArray.some(cls => cls.startsWith(pattern) || cls === pattern)
    )

    if (hasTailwind) {
      return 'Tailwind CSS'
    }

    // Bootstrap detection
    if (classArray.some(cls => cls.startsWith('btn-') || cls.startsWith('col-') || cls === 'container' || cls === 'row')) {
      return 'Bootstrap'
    }

    // Material UI detection
    if (classArray.some(cls => cls.startsWith('Mui') || cls.startsWith('makeStyles'))) {
      return 'Material-UI'
    }

    return 'Custom CSS / Unknown framework'
  }

  private formatComponentOutput(extracted: ExtractedElement): string {
    const { html, css, assets, metadata } = extracted

    // Generate component name from tag name
    const componentName = this.generateComponentName(metadata.tagName)

    let output = `# ${componentName} Component\n\n`
    output += `## Component Details\n`
    output += `- Tag: ${metadata.tagName}\n`
    output += `- Dimensions: ${metadata.dimensions.width}x${metadata.dimensions.height}\n`
    output += `- Total Elements: ${metadata.totalElements || 1}\n`
    output += `- Styles Extracted: ${metadata.totalStylesExtracted || metadata.reducedStylesCount}\n`
    output += `- Style Reduction: ${metadata.computedStylesCount} → ${metadata.reducedStylesCount} (${metadata.reductionPercentage}%)\n\n`

    output += `## 1. Component File (${componentName}.tsx)\n\n`
    output += `\`\`\`typescript\n`
    output += `import React from 'react'\n\n`
    output += `export interface ${componentName}Props {\n`
    output += `  className?: string\n`
    output += `  children?: React.ReactNode\n`
    output += `}\n\n`
    output += `export function ${componentName}({ className, children }: ${componentName}Props) {\n`
    output += `  return (\n`
    output += `    ${this.htmlToJSX(html)}\n`
    output += `  )\n`
    output += `}\n`
    output += `\`\`\`\n\n`

    output += `## 2. Styles (styles.css or module.css)\n\n`
    output += `\`\`\`css\n${css}\n\`\`\`\n\n`

    if (assets.images.length > 0 || assets.fonts.length > 0 || assets.backgroundImages.length > 0) {
      output += `## 3. Assets\n\n`
      if (assets.images.length > 0) {
        output += `### Images (${assets.images.length})\n`
        assets.images.forEach((img: string, i: number) => {
          output += `${i + 1}. \`${img}\`\n`
        })
        output += `\n`
      }
      if (assets.backgroundImages.length > 0) {
        output += `### Background Images (${assets.backgroundImages.length})\n`
        assets.backgroundImages.forEach((img: string, i: number) => {
          output += `${i + 1}. \`${img}\`\n`
        })
        output += `\n`
      }
      if (assets.fonts.length > 0) {
        output += `### Fonts\n`
        output += `\`${[...new Set(assets.fonts)].join(', ')}\`\n\n`
      }
    }

    output += `## 4. Usage Example\n\n`
    output += `\`\`\`typescript\n`
    output += `import { ${componentName} } from '@/components/${componentName}'\n\n`
    output += `export default function Page() {\n`
    output += `  return (\n`
    output += `    <${componentName} />\n`
    output += `  )\n`
    output += `}\n`
    output += `\`\`\`\n\n`

    output += `## 5. Notes for Implementation\n\n`
    output += `- Replace static text with props for reusability\n`
    output += `- Consider extracting colors/spacing into design tokens\n`
    output += `- Add event handlers as needed\n`
    output += `- Update image paths to your project structure\n`

    return output
  }

  private generateComponentName(tagName: string): string {
    // Convert tag name to PascalCase component name
    const base = tagName.charAt(0).toUpperCase() + tagName.slice(1)
    if (base === 'Div') return 'Container'
    if (base === 'Section') return 'Section'
    if (base === 'Article') return 'Article'
    if (base === 'Header') return 'Header'
    if (base === 'Footer') return 'Footer'
    if (base === 'Nav') return 'Navigation'
    if (base === 'Button') return 'Button'
    if (base === 'A') return 'Link'
    return base + 'Component'
  }

  private htmlToJSX(html: string): string {
    // Basic HTML to JSX conversion
    const jsx = html
      .replace(/class=/g, 'className=')
      .replace(/for=/g, 'htmlFor=')
      .replace(/<!--/g, '{/*')
      .replace(/-->/g, '*/}')

    return jsx
  }

  private showCopySuccess() {
    if (!this.copyButton) return

    const originalHTML = this.copyButton.innerHTML
    this.copyButton.classList.add('copied')
    this.copyButton.innerHTML = `
      <svg class="element-copier-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      stolen
    `

    setTimeout(() => {
      if (this.copyButton) {
        this.copyButton.classList.remove('copied')
        this.copyButton.innerHTML = originalHTML
      }
    }, 2000)
  }

  private showCopyError() {
    if (!this.copyButton) return

    const originalHTML = this.copyButton.innerHTML
    this.copyButton.innerHTML = `
      <svg class="element-copier-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
      Error
    `

    setTimeout(() => {
      if (this.copyButton) {
        this.copyButton.innerHTML = originalHTML
      }
    }, 2000)
  }

  /**
   * Generate a CSS selector for an element
   * Uses data attributes for reliability
   */
  private generateSelector(element: Element): string {
    // Try ID first (escape special characters)
    if (element.id) {
      return `#${CSS.escape(element.id)}`
    }

    // Try data attributes (very reliable)
    if (element.hasAttribute('data-node-id')) {
      return `[data-node-id="${element.getAttribute('data-node-id')}"]`
    }
    if (element.hasAttribute('data-testid')) {
      return `[data-testid="${element.getAttribute('data-testid')}"]`
    }

    // Try unique class combination (escape invalid class names)
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.trim())
      if (classes.length > 0) {
        try {
          // Escape each class name individually
          const escapedClasses = classes.map(c => CSS.escape(c))
          const classSelector = '.' + escapedClasses.join('.')
          // Test if selector is valid and unique
          if (document.querySelectorAll(classSelector).length === 1) {
            return classSelector
          }
        } catch {
          // If escaping fails, skip class-based selector
        }
      }
    }

    // Build path from root with tag names
    const path: string[] = []
    let current: Element | null = element

    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase()

      // Add nth-of-type for specificity
      const parent = current.parentElement
      const currentTagName = current.tagName
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          c => c.tagName === currentTagName
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
   * Fallback method using the old getComputedStyle approach
   */
  private async copyElementFallback() {
    if (!this.currentElement) return

    const options: CopyOptions = await this.getCopyOptions()
    this.lastOptions = options

    const extracted = ElementExtractor.extract(this.currentElement, options)
    const output = this.formatOutput(extracted)

    await this.copyToClipboard(output)
    this.showCopySuccess()
  }

  /**
   * Extract full page structure with component decomposition
   */
  private async extractFullPage() {
    console.log('🐀 Sneaky Rat: Starting full page extraction...')

    try {
      // Show progress notification
      this.showProgressNotification('Analyzing page structure...')
      console.log('🐀 Step 1: Progress notification created')

      // Step 1: Decompose page into components
      console.log('🐀 Step 2: Creating PageDecomposer...')
      const decomposer = new PageDecomposer()
      console.log('🐀 Step 3: Calling decompose()...')
      const decomposition = decomposer.decompose()

      console.log('🐀 Step 4: Page decomposed:', {
        components: decomposition.stats.totalComponents,
        patterns: decomposition.stats.patterns,
        maxDepth: decomposition.stats.maxDepth,
      })

      this.updateProgressNotification(`Found ${decomposition.stats.totalComponents} components. Extracting CSS...`)

      // Step 2: Send to background for CDP CSS extraction
      console.log('🐀 Step 5: Sending to background for CDP extraction...')

      // Listen for progress updates
      const progressListener = (message: { type: string; current?: number; total?: number }) => {
        if (message.type === 'DECOMPOSITION_PROGRESS' && message.current && message.total) {
          this.updateProgressNotification(
            `Extracting CSS: ${message.current}/${message.total} components`
          )
        }
      }
      chrome.runtime.onMessage.addListener(progressListener)

      const response: { success: boolean; data?: PageDecomposition; error?: string } =
        await chrome.runtime.sendMessage({
          type: 'DECOMPOSE_PAGE_WITH_CDP',
          decomposition,
        })

      console.log('🐀 Step 6: Got response from background:', response?.success, response?.error)

      // Remove progress listener
      chrome.runtime.onMessage.removeListener(progressListener)

      if (response.success && response.data) {
        const enrichedDecomposition = response.data
        console.log('🐀 Step 7: Generating outputs...')

        // Step 3: Generate outputs
        const folderStructure = generateFolderStructure(enrichedDecomposition)

        // Generate a summary markdown for LLM
        const markdown = this.generateDecompositionSummary(enrichedDecomposition)

        // Copy markdown summary to clipboard (more useful for LLMs)
        console.log('🐀 Step 8: Copying to clipboard...')
        await this.copyToClipboard(markdown)

        // Save files to a folder using File System Access API
        console.log('🐀 Step 9: Opening folder picker...')
        await this.saveToFolder(folderStructure, enrichedDecomposition.title)

        // Show success
        this.hideProgressNotification()
        this.showFullPageSuccess(
          enrichedDecomposition.stats.totalComponents,
          enrichedDecomposition.stats.patterns
        )

        console.log('🐀 ✅ Full page decomposition complete')
        console.log('🐀 Files generated:', Array.from(folderStructure.keys()))
      } else {
        console.error('🐀 Response was not successful:', response)
        throw new Error(response?.error || 'Decomposition failed - no response')
      }

    } catch (error) {
      console.error('🐀 Full page extraction failed:', error)
      console.error('🐀 Error details:', error instanceof Error ? error.stack : String(error))
      this.hideProgressNotification()
      this.showCopyError()
    }
  }

  private progressNotification: HTMLDivElement | null = null

  private showProgressNotification(message: string) {
    if (!this.progressNotification) {
      this.progressNotification = document.createElement('div')
      this.progressNotification.className = 'element-copier-notification element-copier-progress'
      document.body.appendChild(this.progressNotification)
    }

    this.progressNotification.innerHTML = `
      <div class="notification-icon">🐀</div>
      <div class="notification-text">
        <strong>Extracting page...</strong>
        <span>${message}</span>
      </div>
      <div class="notification-spinner"></div>
    `
  }

  private updateProgressNotification(message: string) {
    if (this.progressNotification) {
      const span = this.progressNotification.querySelector('.notification-text span')
      if (span) span.textContent = message
    }
  }

  private hideProgressNotification() {
    if (this.progressNotification) {
      this.progressNotification.remove()
      this.progressNotification = null
    }
  }

  private generateDecompositionSummary(decomposition: PageDecomposition): string {
    let md = `# Page Decomposition: ${decomposition.title}\n\n`
    md += `**URL**: ${decomposition.url}\n`
    md += `**Components**: ${decomposition.stats.totalComponents}\n`
    md += `**Patterns**: ${decomposition.stats.patterns}\n\n`

    md += `## Structure\n\n`
    for (const rootId of decomposition.rootIds) {
      const comp = decomposition.components[rootId]
      if (comp) {
        md += `### ${comp.semanticType} (${comp.tagName})\n`
        md += `- Classes: \`${comp.classes.join(' ')}\`\n`
        md += `- Children: ${comp.childIds.length}\n`
        md += `- Size: ${Math.round(comp.dimensions.width)}x${Math.round(comp.dimensions.height)}\n\n`
      }
    }

    if (decomposition.patterns.length > 0) {
      md += `## Repeated Patterns\n\n`
      for (const pattern of decomposition.patterns) {
        md += `- **${pattern.name}** (${pattern.count} instances)\n`
      }
    }

    return md
  }

  private showFullPageSuccess(elements: number, patterns: number) {
    // Create a temporary notification
    const notification = document.createElement('div')
    notification.className = 'element-copier-notification'
    notification.innerHTML = `
      <div class="notification-icon">🐀</div>
      <div class="notification-text">
        <strong>Full page extracted!</strong>
        <span>${elements} elements, ${patterns} patterns</span>
      </div>
    `
    document.body.appendChild(notification)

    setTimeout(() => {
      notification.classList.add('fade-out')
      setTimeout(() => notification.remove(), 300)
    }, 3000)
  }

  /**
   * Save multiple files to a user-selected folder using File System Access API
   */
  private async saveToFolder(files: Map<string, string>, pageTitle: string): Promise<void> {
    // Check if File System Access API is available
    if (!('showDirectoryPicker' in window)) {
      console.log('🐀 File System Access API not available, falling back to single JSON download')
      await this.downloadAsSingleFile(files, pageTitle)
      return
    }

    try {
      // Prompt user to select a directory
      console.log('🐀 Opening directory picker...')
      const dirHandle = await window.showDirectoryPicker()

      // Create a subfolder for this extraction
      const folderName = this.sanitizeFolderName(pageTitle || 'extraction')
      console.log('🐀 Creating folder:', folderName)
      const extractionFolder = await dirHandle.getDirectoryHandle(folderName, { create: true })

      // Write each file
      let written = 0
      for (const [filePath, content] of files) {
        try {
          // Handle nested paths (e.g., "header/component.html")
          const parts = filePath.split('/')
          let currentDir = extractionFolder

          // Create nested directories if needed
          for (let i = 0; i < parts.length - 1; i++) {
            currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true })
          }

          // Write the file
          const fileName = parts[parts.length - 1]
          const fileHandle = await currentDir.getFileHandle(fileName, { create: true })
          const writable = await fileHandle.createWritable()
          await writable.write(content)
          await writable.close()
          written++

          // Update progress
          if (written % 10 === 0) {
            this.updateProgressNotification(`Saving files: ${written}/${files.size}`)
          }
        } catch (err) {
          console.warn(`🐀 Failed to write file ${filePath}:`, err)
        }
      }

      console.log(`🐀 Saved ${written}/${files.size} files to folder`)
    } catch (err) {
      const error = err as Error
      // User cancelled the picker
      if (error.name === 'AbortError') {
        console.log('🐀 User cancelled folder selection, falling back to download')
        await this.downloadAsSingleFile(files, pageTitle)
        return
      }
      // Permission/security errors (e.g., system folders on macOS)
      if (error.name === 'NotAllowedError' || error.message?.includes('system files')) {
        console.log('🐀 Folder access denied, falling back to download')
        await this.downloadAsSingleFile(files, pageTitle)
        return
      }
      console.error('🐀 Failed to save to folder:', err)
      // Fall back to download on any error
      await this.downloadAsSingleFile(files, pageTitle)
    }
  }

  /**
   * Fallback: download all files as a single JSON bundle
   */
  private async downloadAsSingleFile(files: Map<string, string>, pageTitle: string): Promise<void> {
    const jsonContent = JSON.stringify(Object.fromEntries(files), null, 2)
    const filename = this.sanitizeFolderName(pageTitle || 'extraction') + '.json'
    await this.downloadHTML(jsonContent, filename, true)
  }

  /**
   * Sanitize a string for use as a folder name
   */
  private sanitizeFolderName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .substring(0, 50) // Limit length
      .trim()
      || 'extraction'
  }

  /**
   * Download file using chrome.downloads API
   * @param content - File content (string)
   * @param filename - Suggested filename
   * @param saveAs - If true, prompt user to choose location (default: true for full page, false for single element)
   */
  private downloadHTML(content: string, filename: string, saveAs = false): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Determine MIME type from filename
        const mimeType = filename.endsWith('.json') ? 'application/json' : 'text/html'
        const blob = new Blob([content], { type: mimeType })
        const reader = new FileReader()

        reader.onloadend = () => {
          const dataUrl = reader.result as string

          chrome.runtime.sendMessage({
            type: 'DOWNLOAD_FILE',
            dataUrl: dataUrl,
            filename: filename,
            saveAs: saveAs
          }).then((response: { success?: boolean; error?: string }) => {
            if (response.success) {
              console.log('📥 Downloaded:', filename)
              resolve()
            } else {
              console.error('Download failed:', response.error)
              reject(new Error(response.error ?? 'Download failed'))
            }
          }).catch((err: unknown) => {
            reject(err instanceof Error ? err : new Error('Download request failed'))
          })
        }

        reader.onerror = () => reject(reader.error ?? new Error('FileReader error'))
        reader.readAsDataURL(blob)
      } catch (error) {
        console.error('Failed to download file:', error)
        reject(error instanceof Error ? error : new Error('Failed to download file'))
      }
    })
  }
}

// Initialize the element copier
new ElementCopier()

console.info('Element Copier loaded')
