import { useState, useEffect } from 'react'
import './Popup.css'
import { getDownloadFolder, setDownloadFolder, getUseSaveAs, setUseSaveAs, DEFAULT_DOWNLOAD_FOLDER } from '../features/download-folder'
import { getShortcut, openShortcutSettings } from '../features/keyboard-shortcut'

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
  const [downloadFolder, setDownloadFolderState] = useState(DEFAULT_DOWNLOAD_FOLDER)
  const [useSaveAs, setUseSaveAsState] = useState(false)
  const [shortcut, setShortcut] = useState<string | undefined>(undefined)
  const [options, setOptions] = useState<CopyOptions>({
    includeAssets: true,
    aggressiveReduction: true,
    includeHoverStates: false,
    includePseudoElements: true,
    outputMode: 'component',
  })
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  useEffect(() => {
    // Load options from storage (defaults optimized for Next.js/React)
    chrome.storage.sync.get({
      includeAssets: true,
      aggressiveReduction: true,
      includeHoverStates: false,
      includePseudoElements: true,
      outputMode: 'component',
    }, (items) => {
      setOptions(items as CopyOptions)
    })

    // Load download folder and save-as setting
    void getDownloadFolder().then(setDownloadFolderState)
    void getUseSaveAs().then(setUseSaveAsState)

    // Load keyboard shortcut
    void getShortcut().then(setShortcut)

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

  const handleFolderChange = (folder: string) => {
    setDownloadFolderState(folder)
    void setDownloadFolder(folder)
  }

  const handleSaveAsChange = (enabled: boolean) => {
    setUseSaveAsState(enabled)
    void setUseSaveAs(enabled)
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
        <div className="option-wrapper">
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={options.includeAssets}
              onChange={(e) => handleOptionChange('includeAssets', e.target.checked)}
            />
            <span className="check-mark">{options.includeAssets ? '✓' : '○'}</span>
            <span className="option-label">assets</span>
          </label>
          <button
            className="info-icon"
            onClick={() => setActiveTooltip(activeTooltip === 'assets' ? null : 'assets')}
          >?</button>
          {activeTooltip === 'assets' && (
            <div className="tooltip">Include images and fonts as base64. Recommended for standalone components.</div>
          )}
        </div>

        <div className="option-wrapper">
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={options.includePseudoElements}
              onChange={(e) => handleOptionChange('includePseudoElements', e.target.checked)}
            />
            <span className="check-mark">{options.includePseudoElements ? '✓' : '○'}</span>
            <span className="option-label">pseudo</span>
          </label>
          <button
            className="info-icon"
            onClick={() => setActiveTooltip(activeTooltip === 'pseudo' ? null : 'pseudo')}
          >?</button>
          {activeTooltip === 'pseudo' && (
            <div className="tooltip">Include ::before and ::after elements. Keep ON for icons and decorations.</div>
          )}
        </div>

        <div className="option-wrapper">
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={options.aggressiveReduction}
              onChange={(e) => handleOptionChange('aggressiveReduction', e.target.checked)}
            />
            <span className="check-mark">{options.aggressiveReduction ? '✓' : '○'}</span>
            <span className="option-label">aggro</span>
          </label>
          <button
            className="info-icon"
            onClick={() => setActiveTooltip(activeTooltip === 'aggro' ? null : 'aggro')}
          >?</button>
          {activeTooltip === 'aggro' && (
            <div className="tooltip">Aggressive CSS reduction (70-90% smaller). Recommended for Next.js/React.</div>
          )}
        </div>
      </div>

      <div className="folder-setting">
        <div className="folder-header">
          <label className="folder-label">download folder</label>
          <label className="save-as-toggle">
            <input
              type="checkbox"
              checked={useSaveAs}
              onChange={(e) => handleSaveAsChange(e.target.checked)}
            />
            <span className="save-as-label">choose location</span>
          </label>
        </div>
        {!useSaveAs && (
          <div className="folder-input-wrapper">
            <span className="folder-prefix">~/Downloads/</span>
            <input
              type="text"
              className="folder-input"
              value={downloadFolder}
              onChange={(e) => handleFolderChange(e.target.value)}
              placeholder="SneakyRat"
            />
          </div>
        )}
        {useSaveAs && (
          <div className="save-as-hint">
            You'll pick the location each time you steal an element
          </div>
        )}
      </div>

      <button className="shortcut-button" onClick={openShortcutSettings}>
        <span className="shortcut-label">shortcut</span>
        <span className="shortcut-key">{shortcut || 'not set'}</span>
      </button>
    </div>
  )
}

export default Popup
