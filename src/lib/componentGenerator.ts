import type { DesignTokens, ComponentOutput, StyleProperty } from './types'

export class ComponentGenerator {
  /**
   * Extract design tokens from all element styles
   */
  static extractDesignTokens(allStyles: Map<Element, StyleProperty[]>): DesignTokens {
    const tokens: DesignTokens = {
      colors: {},
      spacing: {},
      fontSizes: {},
      fontWeights: {},
      borderRadius: {},
      shadows: {},
      transitions: {},
    }

    const colorSet = new Set<string>()
    const spacingSet = new Set<string>()
    const fontSizeSet = new Set<string>()
    const fontWeightSet = new Set<string>()
    const borderRadiusSet = new Set<string>()
    const shadowSet = new Set<string>()
    const transitionSet = new Set<string>()

    // Collect all unique values
    for (const styles of allStyles.values()) {
      for (const { name, value } of styles) {
        // Colors
        if (name.includes('color') || name === 'background-color' || name === 'border-color') {
          if (value.startsWith('rgb') || value.startsWith('oklch') || value.startsWith('#')) {
            colorSet.add(value)
          }
        }

        // Spacing
        if (
          name.includes('padding') ||
          name.includes('margin') ||
          name.includes('gap') ||
          name.includes('top') ||
          name.includes('bottom') ||
          name.includes('left') ||
          name.includes('right')
        ) {
          if (value.match(/^\d+(\.\d+)?px$/)) {
            spacingSet.add(value)
          }
        }

        // Font sizes
        if (name === 'font-size') {
          fontSizeSet.add(value)
        }

        // Font weights
        if (name === 'font-weight') {
          fontWeightSet.add(value)
        }

        // Border radius
        if (name.includes('radius')) {
          if (value.match(/^\d+(\.\d+)?px$/)) {
            borderRadiusSet.add(value)
          }
        }

        // Shadows
        if (name.includes('shadow')) {
          shadowSet.add(value)
        }

        // Transitions
        if (name.includes('transition')) {
          transitionSet.add(value)
        }
      }
    }

    // Convert to named tokens
    let colorIndex = 0
    for (const color of Array.from(colorSet).sort()) {
      const name = this.generateColorName(color, colorIndex++)
      tokens.colors[name] = color
    }

    let spacingIndex = 0
    for (const spacing of Array.from(spacingSet).sort((a, b) => parseFloat(a) - parseFloat(b))) {
      const name = this.generateSpacingName(spacing, spacingIndex++)
      tokens.spacing[name] = spacing
    }

    let fontSizeIndex = 0
    for (const fontSize of Array.from(fontSizeSet).sort((a, b) => parseFloat(a) - parseFloat(b))) {
      const name = this.generateFontSizeName(fontSize, fontSizeIndex++)
      tokens.fontSizes[name] = fontSize
    }

    for (const weight of Array.from(fontWeightSet).sort()) {
      tokens.fontWeights[this.generateFontWeightName(weight)] = weight
    }

    let radiusIndex = 0
    for (const radius of Array.from(borderRadiusSet).sort((a, b) => parseFloat(a) - parseFloat(b))) {
      const name = this.generateRadiusName(radius, radiusIndex++)
      tokens.borderRadius[name] = radius
    }

    let shadowIndex = 0
    for (const shadow of Array.from(shadowSet)) {
      tokens.shadows[`shadow-${shadowIndex++}`] = shadow
    }

    let transitionIndex = 0
    for (const transition of Array.from(transitionSet)) {
      tokens.transitions[`transition-${transitionIndex++}`] = transition
    }

    return tokens
  }

  /**
   * Generate a color name from the color value
   */
  private static generateColorName(color: string, index: number): string {
    // Try to detect if it's a primary/accent/gray color
    if (color.includes('oklch') || color.includes('rgb')) {
      // Parse lightness or RGB to determine if it's light/dark
      const isLight = color.includes('255') || color.includes('0.9') || color.includes('0.8')
      const isDark = color.includes('0.1') || color.includes('0.2') || color.includes('0, 0, 0')

      if (isDark) return `gray-${900 - index * 100}`
      if (isLight) return `gray-${100 + index * 100}`
      return `color-${index}`
    }
    return `color-${index}`
  }

  /**
   * Generate spacing name from pixel value
   */
  private static generateSpacingName(spacing: string, _index: number): string {
    const value = parseFloat(spacing)
    // Common Tailwind scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, etc.
    if (value % 4 === 0) {
      return `${value / 4}`
    }
    return spacing.replace('px', '')
  }

  /**
   * Generate font size name
   */
  private static generateFontSizeName(fontSize: string, _index: number): string {
    const value = parseFloat(fontSize)
    if (value <= 12) return 'xs'
    if (value <= 14) return 'sm'
    if (value <= 16) return 'base'
    if (value <= 18) return 'lg'
    if (value <= 20) return 'xl'
    if (value <= 24) return '2xl'
    if (value <= 30) return '3xl'
    if (value <= 36) return '4xl'
    if (value <= 48) return '5xl'
    if (value <= 60) return '6xl'
    if (value <= 72) return '7xl'
    return '8xl'
  }

  /**
   * Generate font weight name
   */
  private static generateFontWeightName(weight: string): string {
    const w = parseInt(weight)
    if (w <= 200) return 'thin'
    if (w <= 300) return 'light'
    if (w <= 400) return 'normal'
    if (w <= 500) return 'medium'
    if (w <= 600) return 'semibold'
    if (w <= 700) return 'bold'
    return 'extrabold'
  }

  /**
   * Generate border radius name
   */
  private static generateRadiusName(radius: string, _index: number): string {
    const value = parseFloat(radius)
    if (value === 0) return 'none'
    if (value <= 4) return 'sm'
    if (value <= 8) return 'DEFAULT'
    if (value <= 12) return 'md'
    if (value <= 16) return 'lg'
    if (value <= 24) return 'xl'
    if (value <= 32) return '2xl'
    return 'full'
  }

  /**
   * Generate Tailwind config from design tokens
   */
  static generateTailwindConfig(tokens: DesignTokens): string {
    return `// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: ${JSON.stringify(tokens.colors, null, 8)},
      spacing: ${JSON.stringify(tokens.spacing, null, 8)},
      fontSize: ${JSON.stringify(tokens.fontSizes, null, 8)},
      fontWeight: ${JSON.stringify(tokens.fontWeights, null, 8)},
      borderRadius: ${JSON.stringify(tokens.borderRadius, null, 8)},
      boxShadow: ${JSON.stringify(tokens.shadows, null, 8)},
      transitionDuration: ${JSON.stringify(tokens.transitions, null, 8)},
    },
  },
  plugins: [],
}`
  }

  /**
   * Generate CSS variables from design tokens
   */
  static generateCSSVariables(tokens: DesignTokens): string {
    let css = ':root {\n'

    for (const [name, value] of Object.entries(tokens.colors)) {
      css += `  --color-${name}: ${value};\n`
    }

    for (const [name, value] of Object.entries(tokens.spacing)) {
      css += `  --spacing-${name}: ${value};\n`
    }

    for (const [name, value] of Object.entries(tokens.fontSizes)) {
      css += `  --font-size-${name}: ${value};\n`
    }

    for (const [name, value] of Object.entries(tokens.fontWeights)) {
      css += `  --font-weight-${name}: ${value};\n`
    }

    for (const [name, value] of Object.entries(tokens.borderRadius)) {
      css += `  --radius-${name}: ${value};\n`
    }

    css += '}\n'
    return css
  }

  /**
   * Generate a React component from extracted element
   */
  static generateComponent(
    element: Element,
    componentName: string,
    _styles: Map<Element, StyleProperty[]>
  ): ComponentOutput {
    // Convert HTML to JSX
    const jsx = this.htmlToJSX(element)

    // Generate component code
    const code = `import React from 'react'

export interface ${componentName}Props {
  className?: string
  children?: React.ReactNode
}

export function ${componentName}({ className, children }: ${componentName}Props) {
  return (
    ${jsx}
  )
}
`

    return {
      name: componentName,
      tsxCode: code,
      dependencies: ['react'],
    }
  }

  /**
   * Convert HTML element to JSX
   */
  private static htmlToJSX(element: Element): string {
    // This is a simplified version - would need proper HTML to JSX conversion
    // For now, just return the outer HTML with some basic conversions
    let html = element.outerHTML

    // Convert class to className
    html = html.replace(/class=/g, 'className=')

    // Convert style string to style object (simplified)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    html = html.replace(/style="([^"]*)"/g, (_match, styles) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const styleObj = styles
        .split(';')
        .filter((s: string) => s.trim())
        .map((s: string) => {
          const [key, value] = s.split(':').map((x: string) => x.trim())
          const camelKey = key.replace(/-([a-z])/g, (_g: string) => _g[1].toUpperCase())
          return `${camelKey}: '${value}'`
        })
        .join(', ')
      return `style={{${styleObj}}}`
    })

    return html
  }
}
