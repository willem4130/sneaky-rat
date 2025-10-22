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
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'getStatus' },
          (response) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (response?.isActive) {
              setIsActive(true)
            }
          }
        )
      }
    })
  }, [])

  const toggleCopier = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'toggle' },
          (response) => {
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
        <h1>Sneaky Rat</h1>
        <p>Copy any element with styles</p>
      </div>

      <button
        className={`toggle-button ${isActive ? 'active' : ''}`}
        onClick={toggleCopier}
      >
        {isActive ? '🟢 Active - Click to Disable' : '⚪ Click to Activate'}
      </button>

      <div className="options-section">
        <h2>Output Mode</h2>

        <div className="mode-selector">
          <label className="radio-item">
            <input
              type="radio"
              name="outputMode"
              checked={options.outputMode === 'html'}
              onChange={() => handleOptionChange('outputMode', 'html')}
            />
            <div>
              <strong>HTML Mode</strong>
              <p className="mode-description">Simple HTML + CSS for LLMs to understand</p>
            </div>
          </label>

          <label className="radio-item">
            <input
              type="radio"
              name="outputMode"
              checked={options.outputMode === 'component'}
              onChange={() => handleOptionChange('outputMode', 'component')}
            />
            <div>
              <strong>Component Mode</strong>
              <p className="mode-description">React components + design tokens for Next.js</p>
            </div>
          </label>
        </div>

        <h2>Options</h2>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.includeAssets}
            onChange={(e) => handleOptionChange('includeAssets', e.target.checked)}
          />
          <span>Include Assets (images, fonts)</span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.aggressiveReduction}
            onChange={(e) => handleOptionChange('aggressiveReduction', e.target.checked)}
          />
          <span>Aggressive Style Reduction</span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.includePseudoElements}
            onChange={(e) => handleOptionChange('includePseudoElements', e.target.checked)}
          />
          <span>Include Pseudo-elements (::before, ::after)</span>
        </label>
      </div>

      <div className="help-section">
        <h3>How to use:</h3>
        <ol>
          <li>Click "Activate" button</li>
          <li>Hover over any element on the page</li>
          <li>Click the "Copy" button that appears</li>
          <li>Paste into your LLM or code editor</li>
          <li>Press ESC to exit</li>
        </ol>
      </div>
    </div>
  )
}

export default Popup
