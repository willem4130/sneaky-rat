export interface ExtractedElement {
  html: string
  css: string
  assets: AssetCollection
  metadata: ElementMetadata
}

export interface AssetCollection {
  images: string[]
  fonts: string[]
  backgroundImages: string[]
}

export interface ElementMetadata {
  tagName: string
  classes: string[]
  dimensions: {
    width: number
    height: number
  }
  position: {
    top: number
    left: number
  }
  computedStylesCount: number
  reducedStylesCount: number
  reductionPercentage: number
  totalElements?: number
  totalStylesExtracted?: number
}

export interface StyleProperty {
  name: string
  value: string
}

export interface CopyOptions {
  includeAssets: boolean
  aggressiveReduction: boolean
  includeHoverStates: boolean
  includePseudoElements: boolean
  outputMode?: 'html' | 'component' // New: choose output format
}

export interface DesignTokens {
  colors: Record<string, string>
  spacing: Record<string, string>
  fontSizes: Record<string, string>
  fontWeights: Record<string, string>
  borderRadius: Record<string, string>
  shadows: Record<string, string>
  transitions: Record<string, string>
}

export interface ComponentOutput {
  name: string
  tsxCode: string
  dependencies: string[]
}
