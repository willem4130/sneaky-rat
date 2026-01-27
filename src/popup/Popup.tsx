import { useState, useEffect } from 'react'
import './Popup.css'

interface CopyOptions {
  includeAssets: boolean
  aggressiveReduction: boolean
  includeHoverStates: boolean
  includePseudoElements: boolean
  includeAnimations: boolean
  outputMode: 'html' | 'component'
}

interface OptionInfo {
  label: string
  key: keyof CopyOptions
  tooltip: string
}

const OPTIONS_INFO: OptionInfo[] = [
  {
    label: 'assets',
    key: 'includeAssets',
    tooltip: 'Include images, fonts, and background images in the extraction',
  },
  {
    label: 'pseudo',
    key: 'includePseudoElements',
    tooltip: 'Include ::before, ::after, and other pseudo-element styles',
  },
  {
    label: 'aggro',
    key: 'aggressiveReduction',
    tooltip: 'More aggressive style filtering - removes inherited styles for smaller output',
  },
  {
    label: 'anims',
    key: 'includeAnimations',
    tooltip: 'Extract @keyframes animations and transition properties',
  },
  {
    label: 'hover',
    key: 'includeHoverStates',
    tooltip: 'Extract :hover, :focus, :active, and :focus-visible interaction states',
  },
]

export const Popup = () => {
  const [isActive, setIsActive] = useState(false)
  const [canActivate, setCanActivate] = useState(true)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [options, setOptions] = useState<CopyOptions>({
    includeAssets: true,
    aggressiveReduction: false,
    includeHoverStates: false,
    includePseudoElements: true,
    includeAnimations: false,
    outputMode: 'html',
  })

  useEffect(() => {
    // Load options from storage
    chrome.storage.sync.get({
      includeAssets: true,
      aggressiveReduction: false,
      includeHoverStates: false,
      includePseudoElements: true,
      includeAnimations: false,
      outputMode: 'html',
    }, (items) => {
      setOptions(items as CopyOptions)
    })

    // Check if copier is active in the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      // Check if we're on a page where content scripts can't run
      if (!tab?.id || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
        setCanActivate(false)
        return
      }

      chrome.tabs.sendMessage(
        tab.id,
        { action: 'getStatus' },
        (response) => {
          // Check for errors (content script not loaded)
          if (chrome.runtime.lastError) {
            // Content script not loaded yet - that's okay, it will load on next page
            return
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (response?.isActive) {
            setIsActive(true)
          }
        }
      )
    })
  }, [])

  const toggleCopier = () => {
    if (!canActivate) return

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'toggle' },
          (response) => {
            // Check for Chrome runtime errors
            if (chrome.runtime.lastError) {
              // Content script not available - try reloading the page
              setCanActivate(false)
              return
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (response?.success) {
              setIsActive(!isActive)
            }
          }
        )
      }
    })
  }

  const handleOptionChange = (key: keyof CopyOptions, value: boolean | string) => {
    const newOptions = { ...options, [key]: value }
    setOptions(newOptions)
    void chrome.storage.sync.set(newOptions)
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="logo">🐀</div>
        <h1>sneaky rat</h1>
      </div>

      {canActivate ? (
        <div className="button-group">
          <button
            className={`toggle-button ${isActive ? 'active' : ''}`}
            onClick={toggleCopier}
          >
            <span className="status-dot">{isActive ? '●' : '○'}</span>
            {isActive ? 'deactivate' : 'activate'}
          </button>
          <button
            className="full-page-button"
            onClick={() => {
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                  chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'extractFullPage' },
                    (response) => {
                      if (chrome.runtime.lastError) {
                        console.error('Full page extraction failed:', chrome.runtime.lastError)
                        return
                      }
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                      if (response?.success) {
                        // Close popup after successful message send
                        // The extraction will continue in the content script
                        window.close()
                      }
                    }
                  )
                }
              })
            }}
          >
            full page
          </button>
        </div>
      ) : (
        <div className="not-available">
          <p>Not available on this page</p>
          <small>Navigate to a website to use Sneaky Rat</small>
        </div>
      )}

      <div className="mode-tabs">
        <button
          className={`mode-tab ${options.outputMode === 'html' ? 'active' : ''}`}
          onClick={() => handleOptionChange('outputMode', 'html')}
        >
          html
        </button>
        <button
          className={`mode-tab ${options.outputMode === 'component' ? 'active' : ''}`}
          onClick={() => handleOptionChange('outputMode', 'component')}
        >
          component
        </button>
      </div>

      <div className="options-grid">
        {OPTIONS_INFO.map((opt) => (
          <div key={opt.key} className="option-wrapper">
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={options[opt.key] as boolean}
                onChange={(e) => handleOptionChange(opt.key, e.target.checked)}
              />
              <span className="check-mark">{options[opt.key] ? '✓' : '○'}</span>
              <span className="option-label">{opt.label}</span>
            </label>
            <button
              className="info-button"
              onMouseEnter={() => setActiveTooltip(opt.key)}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={(e) => {
                e.preventDefault()
                setActiveTooltip(activeTooltip === opt.key ? null : opt.key)
              }}
            >
              ?
            </button>
            {activeTooltip === opt.key && (
              <div className="tooltip">{opt.tooltip}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Popup
