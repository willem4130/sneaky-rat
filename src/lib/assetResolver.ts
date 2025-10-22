import type { AssetCollection } from './types'

export class AssetResolver {
  /**
   * Resolve all assets (images, fonts, background images) from an element
   */
  static resolveAssets(element: Element): AssetCollection {
    const assets: AssetCollection = {
      images: [],
      fonts: [],
      backgroundImages: [],
    }

    // Find all images
    this.extractImages(element, assets)

    // Extract background images from computed styles
    this.extractBackgroundImages(element, assets)

    // Extract fonts
    this.extractFonts(element, assets)

    // Deduplicate assets
    assets.images = [...new Set(assets.images)]
    assets.fonts = [...new Set(assets.fonts)]
    assets.backgroundImages = [...new Set(assets.backgroundImages)]

    return assets
  }

  /**
   * Extract image URLs from <img> tags
   */
  private static extractImages(element: Element, assets: AssetCollection): void {
    // Check if the element itself is an image
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement
      if (img.src) {
        assets.images.push(this.resolveUrl(img.src))
      }
      if (img.srcset) {
        const srcsetUrls = this.parseSrcset(img.srcset)
        assets.images.push(...srcsetUrls)
      }
    }

    // Find all descendant images
    const images = element.querySelectorAll('img')
    images.forEach(img => {
      if (img.src) {
        assets.images.push(this.resolveUrl(img.src))
      }
      if (img.srcset) {
        const srcsetUrls = this.parseSrcset(img.srcset)
        assets.images.push(...srcsetUrls)
      }
    })

    // Check for SVG elements
    const svgs = element.querySelectorAll('svg image')
    svgs.forEach(img => {
      const href = img.getAttribute('href') || img.getAttribute('xlink:href')
      if (href) {
        assets.images.push(this.resolveUrl(href))
      }
    })
  }

  /**
   * Extract background images from computed styles
   */
  private static extractBackgroundImages(element: Element, assets: AssetCollection): void {
    // Check the element itself
    this.extractBackgroundFromElement(element, assets)

    // Check all descendants
    const descendants = element.querySelectorAll('*')
    descendants.forEach(el => {
      this.extractBackgroundFromElement(el, assets)
    })
  }

  /**
   * Extract background image from a single element
   */
  private static extractBackgroundFromElement(element: Element, assets: AssetCollection): void {
    const computedStyle = window.getComputedStyle(element)
    const backgroundImage = computedStyle.getPropertyValue('background-image')

    if (backgroundImage && backgroundImage !== 'none') {
      const urls = this.extractUrlsFromCss(backgroundImage)
      assets.backgroundImages.push(...urls)
    }
  }

  /**
   * Extract font families from computed styles
   */
  private static extractFonts(element: Element, assets: AssetCollection): void {
    // Check the element itself
    this.extractFontFromElement(element, assets)

    // Check all descendants
    const descendants = element.querySelectorAll('*')
    descendants.forEach(el => {
      this.extractFontFromElement(el, assets)
    })
  }

  /**
   * Extract font from a single element
   */
  private static extractFontFromElement(element: Element, assets: AssetCollection): void {
    const computedStyle = window.getComputedStyle(element)
    const fontFamily = computedStyle.getPropertyValue('font-family')

    if (fontFamily) {
      // Clean up the font family string
      const fonts = fontFamily
        .split(',')
        .map(f => f.trim().replace(/['"]/g, ''))
        .filter(f => f !== 'sans-serif' && f !== 'serif' && f !== 'monospace')

      assets.fonts.push(...fonts)
    }
  }

  /**
   * Parse srcset attribute to extract URLs
   */
  private static parseSrcset(srcset: string): string[] {
    return srcset
      .split(',')
      .map(entry => entry.trim().split(/\s+/)[0])
      .filter(url => url)
      .map(url => this.resolveUrl(url))
  }

  /**
   * Extract URLs from CSS values (e.g., background-image: url(...))
   */
  private static extractUrlsFromCss(cssValue: string): string[] {
    const urlRegex = /url\(['"]?([^'"()]+)['"]?\)/g
    const urls: string[] = []
    let match

    while ((match = urlRegex.exec(cssValue)) !== null) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      urls.push(this.resolveUrl(match[1]))
    }

    return urls
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  private static resolveUrl(url: string): string {
    // If already absolute, return as is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url
    }

    // If protocol-relative, add https
    if (url.startsWith('//')) {
      return `https:${url}`
    }

    // Resolve relative URL using the current page's base
    try {
      const resolved = new URL(url, window.location.href)
      return resolved.href
    } catch {
      return url
    }
  }
}
