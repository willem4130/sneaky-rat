/**
 * Download Folder Feature
 * Allows users to specify a subfolder for downloaded components
 */

export interface DownloadFolderSettings {
  /** Subfolder path relative to Downloads (e.g., "SneakyRat/components") */
  downloadFolder: string
}

export const DEFAULT_DOWNLOAD_FOLDER = 'SneakyRat'

export const STORAGE_KEY = 'downloadFolder'

/**
 * Get the configured download folder from storage
 */
export async function getDownloadFolder(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_DOWNLOAD_FOLDER }, (items) => {
      resolve(items[STORAGE_KEY] as string)
    })
  })
}

/**
 * Set the download folder in storage
 */
export async function setDownloadFolder(folder: string): Promise<void> {
  // Normalize the path: remove leading/trailing slashes, replace backslashes
  const normalized = folder
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/')

  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: normalized }, () => {
      resolve()
    })
  })
}

/**
 * Build full filename with folder prefix
 */
export function buildFilePath(folder: string, filename: string): string {
  if (!folder) return filename
  return `${folder}/${filename}`
}
