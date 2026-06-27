// IndexedDB storage for user-uploaded notification sound.
// Keeps the binary in IDB (no localStorage size limit).

const DB_NAME  = 'mon-pomodoro-db'
const DB_VER   = 1
const STORE    = 'files'
const SOUND_KEY = 'custom-notification'

interface StoredSound {
  buffer:   ArrayBuffer
  name:     string
  mimeType: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess       = () => resolve(req.result)
    req.onerror         = () => reject(req.error)
  })
}

/** Persist the file to IndexedDB. */
export async function storeCustomSound(file: File): Promise<void> {
  const buffer = await file.arrayBuffer()
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const entry: StoredSound = {
      buffer,
      name:     file.name,
      mimeType: file.type || 'audio/mpeg',
    }
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(entry, SOUND_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

/** Load the stored file and return a blob URL + display name (or null). */
export async function loadCustomSound(): Promise<{ url: string; name: string } | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(SOUND_KEY)
    req.onsuccess = () => {
      if (!req.result) { resolve(null); return }
      const { buffer, name, mimeType } = req.result as StoredSound
      const blob = new Blob([buffer], { type: mimeType })
      resolve({ url: URL.createObjectURL(blob), name })
    }
    req.onerror = () => reject(req.error)
  })
}

/** Remove the stored file from IndexedDB. */
export async function deleteCustomSound(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(SOUND_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}
