const DB_NAME = 'movera-host-media-v1'
const DB_VERSION = 1
const STORE_NAME = 'photos'

const memoryBlobs = new Map()
const objectUrlCache = new Map()
let dbPromise

function supportsIndexedDb() {
  return typeof window !== 'undefined' && Boolean(window.indexedDB)
}

function openDb() {
  if (!supportsIndexedDb()) return Promise.reject(new Error('IndexedDB unavailable'))
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Unable to open photo database'))
  })
  return dbPromise
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}

function uniqueId() {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `host-photo:${random}`
}

function dataUrlToBlob(dataUrl) {
  const [header, payload = ''] = String(dataUrl).split(',', 2)
  const mime = header.match(/^data:([^;,]+)/)?.[1] || 'image/jpeg'
  const binary = header.includes(';base64') ? atob(payload) : decodeURIComponent(payload)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}

export function isPersistentHostPhotoRef(value) {
  return typeof value === 'string' && value.startsWith('host-photo:')
}

export async function saveHostPhotoBlob(blob, metadata = {}) {
  if (!(blob instanceof Blob)) throw new TypeError('A Blob is required')
  const id = uniqueId()
  const record = {
    id,
    blob,
    userId: String(metadata.userId || ''),
    roomId: String(metadata.roomId || ''),
    name: String(metadata.name || ''),
    type: blob.type || String(metadata.type || 'image/jpeg'),
    size: Number(blob.size) || 0,
    createdAt: Date.now(),
  }

  try {
    const db = await openDb()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(record)
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Unable to save photo'))
      transaction.onabort = () => reject(transaction.error || new Error('Photo save aborted'))
    })
    return id
  } catch {
    memoryBlobs.set(id, blob)
    return id
  }
}

export async function saveHostPhotoFile(file, metadata = {}) {
  return saveHostPhotoBlob(file, { ...metadata, name: file?.name, type: file?.type })
}

export async function migrateLegacyHostPhoto(dataUrl, metadata = {}) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return dataUrl
  return saveHostPhotoBlob(dataUrlToBlob(dataUrl), metadata)
}

async function readBlob(ref) {
  if (memoryBlobs.has(ref)) return memoryBlobs.get(ref)
  try {
    const db = await openDb()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const record = await requestResult(transaction.objectStore(STORE_NAME).get(ref))
    return record?.blob instanceof Blob ? record.blob : null
  } catch {
    return null
  }
}

export async function resolveHostPhotoUrl(ref) {
  if (typeof ref !== 'string' || !ref) return ''
  if (ref.startsWith('data:') || ref.startsWith('blob:')) return ref
  if (objectUrlCache.has(ref)) return objectUrlCache.get(ref)
  const blob = await readBlob(ref)
  if (!blob) return ''
  const url = URL.createObjectURL(blob)
  objectUrlCache.set(ref, url)
  return url
}

export async function removeHostPhoto(ref) {
  if (typeof ref !== 'string' || !ref) return
  const cached = objectUrlCache.get(ref)
  if (cached) URL.revokeObjectURL(cached)
  objectUrlCache.delete(ref)
  memoryBlobs.delete(ref)
  if (!isPersistentHostPhotoRef(ref)) return
  try {
    const db = await openDb()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(ref)
  } catch {
    // The reference is still removed from the draft even if browser cleanup fails.
  }
}
