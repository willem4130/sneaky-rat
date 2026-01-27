import { useState, useEffect } from 'react'
import './Popup.css'

interface CopyOptions {
  includeAssets: boolean
  aggressiveReduction: boolean
  includeHoverStates: boolean
  includePseudoElements: boolean
  outputMode: 'html' | 'component'
}

export const Popup = () => {
  const [isActive, setIsActive] = useState(false)
  const [canActivate, setCanActivate] = useState(true)
  const [options, setOptions] = useState<CopyOptions>({
    includeAssets: true,
    aggressiveReduction: false,
    includeHoverStates: false,
    includePseudoElements: true,
    outputMode: 'html',
  })

  useEffect(() => {
    // Load options from storage
    chrome.storage.sync.get({
      includeAssets: true,
      aggressiveReduction: false,
      includeHoverStates: false,
      includePseudoElements: true,
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
        <button
          className={`toggle-button ${isActive ? 'active' : ''}`}
          onClick={toggleCopier}
        >
          <span className="status-dot">{isActive ? '●' : '○'}</span>
          {isActive ? 'deactivate' : 'activate'}
        </button>
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
        <label className="option-toggle">
          <input
            type="checkbox"
            checked={options.includeAssets}
            onChange={(e) => handleOptionChange('includeAssets', e.target.checked)}
          />
          <span className="check-mark">{options.includeAssets ? '✓' : '○'}</span>
          <span className="option-label">assets</span>
        </label>

        <label className="option-toggle">
          <input
            type="checkbox"
            checked={options.includePseudoElements}
            onChange={(e) => handleOptionChange('includePseudoElements', e.target.checked)}
          />
          <span className="check-mark">{options.includePseudoElements ? '✓' : '○'}</span>
          <span className="option-label">pseudo</span>
        </label>

        <label className="option-toggle">
          <input
            type="checkbox"
            checked={options.aggressiveReduction}
            onChange={(e) => handleOptionChange('aggressiveReduction', e.target.checked)}
          />
          <span className="check-mark">{options.aggressiveReduction ? '✓' : '○'}</span>
          <span className="option-label">aggro</span>
        </label>
      </div>
    </div>
  )
}

export default Popup
