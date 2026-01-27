/**
 * Keyboard Shortcut Feature
 * Allows users to toggle Sneaky Rat with a keyboard shortcut
 */

export const COMMAND_TOGGLE = 'toggle-sneaky-rat'

/**
 * Get the current shortcut for the toggle command
 * Returns the shortcut string (e.g., "Ctrl+Shift+S") or undefined if not set
 */
export async function getShortcut(): Promise<string | undefined> {
  return new Promise((resolve) => {
    chrome.commands.getAll((commands) => {
      const toggleCommand = commands.find((cmd) => cmd.name === COMMAND_TOGGLE)
      resolve(toggleCommand?.shortcut || undefined)
    })
  })
}

/**
 * Open Chrome's keyboard shortcuts settings page
 */
export function openShortcutSettings(): void {
  void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
}
