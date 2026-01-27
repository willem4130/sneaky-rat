# Sneaky Rat

A Chrome extension that lets you "steal" any HTML element from any website with its styles, perfectly formatted for LLM consumption or code reuse. Uses Chrome DevTools Protocol for accurate CSS extraction (actual rules, not computed values).

## Features

- **Smart Hover Detection** - Hover over any element to highlight it with a visual bounding box
- **Intelligent Style Reduction** - 70-90% bloat removal while preserving visual fidelity
  - Filters 180+ irrelevant CSS properties
  - Removes browser defaults and inherited styles
  - Eliminates tracking attributes and framework cruft
  - Optimizes to CSS shorthands
- **CDP-Powered Extraction** - Uses Chrome DevTools Protocol for actual CSS rules (preserves `width: 100%` instead of `width: 768px`)
- **Multiple Output Formats**:
  - **HTML Mode** - Clean HTML + CSS with framework detection (Tailwind, Bootstrap, Material-UI)
  - **Component Mode** - React TypeScript component with props interface
  - **Standalone HTML** - Self-contained file with all styles inlined
- **Asset Resolution** - Extracts images, fonts, and background images with absolute URLs
- **Pseudo-element Support** - Captures `::before` and `::after` styles
- **Design Token Extraction** - Identifies colors, spacing, fonts, shadows
- **LLM-Optimized Output** - Markdown format perfect for Claude, ChatGPT, etc.

## Installation & Development

1. Install dependencies:
```shell
npm install
```

2. Start development server:
```shell
npm run dev
```

3. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/` directory

## Production Build

```shell
npm run build
```

The extension will be built to the `build/` directory, ready for the Chrome Web Store.

## Usage

1. **Activate** - Click the extension icon and toggle "Activate"
2. **Configure** - Select output mode (HTML or Component) and options
3. **Hover** - Move your mouse over any element on the page
4. **Steal** - Click the floating button that appears on the element
5. **Paste** - Paste into your LLM, code editor, or anywhere

Press **ESC** to deactivate.

## Options

- **Output Mode** - Choose between HTML (with CSS) or React Component output
- **Include Assets** - Extract image URLs and font families
- **Aggressive Reduction** - Remove inherited styles (maximum reduction)
- **Include Hover States** - Capture hover/focus state styles
- **Include Pseudo-elements** - Capture `::before` and `::after` styles

## Tech Stack

Built with 2025 best practices:
- **Vite** - Fast build tool with HMR
- **React 18** + **TypeScript**
- **Manifest V3** - Latest Chrome extension API
- **@crxjs/vite-plugin** - Seamless extension development

## How It Works

### Style Reduction Algorithm

The `StyleReducer` applies intelligent filtering:
- **Default Value Filtering** - Removes browser defaults
- **Conditional Property Analysis** - Removes irrelevant properties
- **Vendor Prefix Cleanup** - Removes unnecessary prefixes
- **Shorthand Optimization** - Converts to CSS shorthands
- **Inheritance Matching** - Optionally removes parent-matched values

### Example Output

```html
<!-- Extracted Element -->
<!-- Styles reduced: 347 → 12 (96% reduction) -->

<button class="primary-button">Click Me</button>

<style>
.extracted-1234 {
  display: inline-flex;
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 8px;
  font-size: 14px;
}
</style>
```

## Project Structure

```
sneaky-rat/
├── src/
│   ├── background/               # Service worker (CDP, downloads)
│   │   └── index.ts
│   ├── contentScript/            # Page interaction (hover, highlight, copy)
│   │   ├── index.ts              # ElementCopier class
│   │   └── styles.css
│   ├── popup/                    # Extension UI (React)
│   │   ├── Popup.tsx
│   │   └── index.tsx
│   ├── lib/                      # Core extraction logic
│   │   ├── types.ts              # TypeScript interfaces
│   │   ├── styleReducer.ts       # CSS filtering (180+ props)
│   │   ├── elementExtractor.ts   # Element cleanup & extraction
│   │   ├── cdpExtractor.ts       # Chrome DevTools Protocol
│   │   ├── assetResolver.ts      # Image/font extraction
│   │   ├── htmlGenerator.ts      # Standalone HTML output
│   │   ├── llmFormatter.ts       # LLM-friendly formatting
│   │   └── componentGenerator.ts # React component generation
│   └── manifest.ts               # Chrome Manifest V3
└── build/                        # Compiled extension
```

## Roadmap

### Animation Extraction (Planned)
- Extract `@keyframes` definitions from stylesheets
- Capture `animation-*` and `transition-*` properties
- Record hover/focus/active state changes
- Visual timeline preview

### Full Page Mode (Planned)
Copy entire website structure in one click:
- Complete DOM hierarchy with semantic grouping
- Layout system analysis (flex, grid, positioning)
- Pattern detection (collapse repeated elements)
- Multiple output formats: JSON, LLM prompt, wireframe HTML, component tree

### Future Ideas
- Multi-element selection (shift+click)
- Viewport-specific extraction (mobile/tablet/desktop)
- Vue/Svelte/Solid component output
- History panel with thumbnails
- Similar component finder

## License

MIT

---

Built for UI thieves everywhere.
