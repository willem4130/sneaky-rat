/**
 * Download Folder Feature
 * Allows users to specify a subfolder for downloaded components
 * or use "Save As" dialog to pick any location
 */

export interface DownloadFolderSettings {
  /** Subfolder path relative to Downloads (e.g., "SneakyRat/components") */
  downloadFolder: string
  /** If true, show native "Save As" dialog for each download */
  useSaveAs: boolean
}

export const DEFAULT_DOWNLOAD_FOLDER = 'SneakyRat'
export const DEFAULT_USE_SAVE_AS = false

export const STORAGE_KEY = 'downloadFolder'
export const SAVE_AS_KEY = 'useSaveAs'

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

/**
 * Get the "Save As" setting from storage
 */
export async function getUseSaveAs(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [SAVE_AS_KEY]: DEFAULT_USE_SAVE_AS }, (items) => {
      resolve(items[SAVE_AS_KEY] as boolean)
    })
  })
}

/**
 * Set the "Save As" setting in storage
 */
export async function setUseSaveAs(useSaveAs: boolean): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [SAVE_AS_KEY]: useSaveAs }, () => {
      resolve()
    })
  })
}
