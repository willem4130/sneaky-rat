import './styles.css'
import { ElementExtractor } from '../lib/elementExtractor'
import type { CopyOptions, ExtractedElement } from '../lib/types'

class ElementCopier {
  private isActive = false
  private highlightDiv: HTMLDivElement | null = null
  private copyButton: HTMLButtonElement | null = null
  private currentElement: Element | null = null
  private rafId: number | null = null

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
      }
      return true
    })

    // Create highlight and button elements
    this.createElements()
  }

  private createElements() {
    // Create highlight div
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
      Copy
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
    document.body.appendChild(this.highlightDiv)
    document.body.appendChild(this.copyButton)

    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('click', this.handleClick, true)
    document.addEventListener('keydown', this.handleKeyDown)
  }

  private deactivate() {
    document.body.classList.remove('element-copier-active')

    if (this.highlightDiv) this.highlightDiv.style.display = 'none'
    if (this.copyButton) this.copyButton.style.display = 'none'

    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('click', this.handleClick, true)
    document.removeEventListener('keydown', this.handleKeyDown)

    this.currentElement = null
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
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Press ESC to deactivate
    if (e.key === 'Escape' && this.isActive) {
      this.toggle()
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
    if (!this.currentElement) {
      console.error('No element selected')
      return
    }

    try {
      console.log('Copying element:', this.currentElement)

      // Get copy options from storage
      const options: CopyOptions = await this.getCopyOptions()
      console.log('Copy options:', options)

      // Store options for formatOutput to access
      this.lastOptions = options

      // Extract the element
      const extracted = ElementExtractor.extract(this.currentElement, options)
      console.log('Extracted:', extracted)

      // Format the output for LLM consumption
      const output = this.formatOutput(extracted)
      console.log('Formatted output length:', output.length)

      // Copy to clipboard
      await navigator.clipboard.writeText(output)

      // Show success feedback
      this.showCopySuccess()

    } catch (error) {
      console.error('Failed to copy element:', error)
      console.error('Error stack:', (error as Error).stack)
      this.showCopyError()
    }
  }

  private async getCopyOptions(): Promise<CopyOptions> {
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        includeAssets: true,
        aggressiveReduction: false,
        includeHoverStates: false,
        includePseudoElements: true,
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

    let output = `<!-- Extracted Element -->\n`
    output += `<!-- Tag: ${metadata.tagName} -->\n`
    output += `<!-- Dimensions: ${metadata.dimensions.width}x${metadata.dimensions.height} -->\n`
    output += `<!-- Styles reduced: ${metadata.computedStylesCount} → ${metadata.reducedStylesCount} (${metadata.reductionPercentage}% reduction) -->\n\n`

    output += `<!-- HTML -->\n${html}\n\n`

    output += `<!-- CSS -->\n<style>\n${css}\n</style>\n\n`

    if (assets.images.length > 0 || assets.fonts.length > 0 || assets.backgroundImages.length > 0) {
      output += `<!-- Assets -->\n`
      if (assets.images.length > 0) {
        output += `<!-- Images: ${assets.images.length} -->\n`
        assets.images.forEach((img: string, i: number) => {
          output += `<!-- ${i + 1}. ${img} -->\n`
        })
      }
      if (assets.backgroundImages.length > 0) {
        output += `<!-- Background Images: ${assets.backgroundImages.length} -->\n`
        assets.backgroundImages.forEach((img: string, i: number) => {
          output += `<!-- ${i + 1}. ${img} -->\n`
        })
      }
      if (assets.fonts.length > 0) {
        output += `<!-- Fonts: ${[...new Set(assets.fonts)].join(', ')} -->\n`
      }
    }

    return output
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
      Copied!
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
}

// Initialize the element copier
new ElementCopier()

console.info('Element Copier loaded')
