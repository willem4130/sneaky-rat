/**
 * IndexedDB Storage for Page Decompositions
 */

import type { PageDecomposition } from './pageDecomposer'

const DB_NAME = 'sneaky-rat-db'
const DB_VERSION = 1
const STORE_NAME = 'decompositions'

let db: IDBDatabase | null = null

/**
 * Initialize the database
 */
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Create store for decompositions
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('url', 'url', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('title', 'title', { unique: false })
      }
    }
  })
}

/**
 * Save a decomposition
 */
export async function saveDecomposition(decomposition: PageDecomposition): Promise<void> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(decomposition)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get a decomposition by ID
 */
export async function getDecomposition(id: string): Promise<PageDecomposition | null> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve((request.result as PageDecomposition | undefined) || null)
  })
}

/**
 * Get all decompositions (for history)
 */
export async function getAllDecompositions(): Promise<PageDecomposition[]> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      // Sort by timestamp descending
      const results = request.result as PageDecomposition[]
      results.sort((a, b) => b.timestamp - a.timestamp)
      resolve(results)
    }
  })
}

/**
 * Get decompositions for a specific URL
 */
export async function getDecompositionsByUrl(url: string): Promise<PageDecomposition[]> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('url')
    const request = index.getAll(url)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const results = request.result as PageDecomposition[]
      results.sort((a, b) => b.timestamp - a.timestamp)
      resolve(results)
    }
  })
}

/**
 * Delete a decomposition
 */
export async function deleteDecomposition(id: string): Promise<void> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Clear all decompositions
 */
export async function clearAllDecompositions(): Promise<void> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get storage stats
 */
export async function getStorageStats(): Promise<{
  count: number
  oldestTimestamp: number | null
  newestTimestamp: number | null
}> {
  const decompositions = await getAllDecompositions()

  if (decompositions.length === 0) {
    return { count: 0, oldestTimestamp: null, newestTimestamp: null }
  }

  return {
    count: decompositions.length,
    oldestTimestamp: decompositions[decompositions.length - 1].timestamp,
    newestTimestamp: decompositions[0].timestamp,
  }
}
