# Sneaky Rat

Chrome extension that extracts HTML elements from any website with intelligent style reduction (70-90% bloat removed), optimized for LLM consumption and code reuse.

## Project Structure

```
src/
├── background/           # Service worker - CDP extraction & downloads
│   └── index.ts
├── contentScript/        # Page interaction - hover, highlight, copy
│   ├── index.ts          # ElementCopier class
│   └── styles.css
├── popup/                # Extension popup UI (React)
│   ├── Popup.tsx         # Main popup component
│   ├── Popup.css
│   └── index.tsx
├── lib/                  # Core extraction logic
│   ├── types.ts          # TypeScript interfaces
│   ├── styleReducer.ts   # CSS filtering & reduction (70-90%)
│   ├── elementExtractor.ts
│   ├── assetResolver.ts  # Image/font URL extraction
│   ├── cdpExtractor.ts   # Chrome DevTools Protocol
│   ├── htmlGenerator.ts  # Standalone HTML output
│   ├── llmFormatter.ts   # LLM-friendly formatting
│   └── componentGenerator.ts  # React component output
├── manifest.ts           # Chrome Manifest V3 config
└── global.d.ts
build/                    # Compiled extension (load in Chrome)
```

## Organization Rules

- **Background logic** → `src/background/` (service worker only)
- **Content scripts** → `src/contentScript/` (runs on web pages)
- **Popup UI** → `src/popup/` (React components)
- **Utilities/Logic** → `src/lib/` (one file per responsibility)
- **Types** → `src/lib/types.ts` or co-located

## Code Quality - Zero Tolerance

After editing ANY file, run:

```bash
npm run typecheck    # Type check (required)
npm run lint         # ESLint with zero warnings
```

Fix ALL errors before continuing.

## Development

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build extension to build/
npm run zip          # Build and create distribution ZIP
```

Load extension: Chrome → `chrome://extensions` → Load unpacked → select `build/`

## Key Commands

- `/fix` - Run checks and auto-fix issues with parallel agents
- `/commit` - Run checks, commit with AI message, push
- `/update-app` - Update dependencies, fix deprecations
