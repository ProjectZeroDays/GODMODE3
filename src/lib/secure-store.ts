/**
 * Encrypted-at-rest local persistence for G0DM0D3.
 *
 * Uses the browser's WebCrypto API:
 *  • A 256-bit AES-GCM device key is generated once per profile and stored in
 *    IndexedDB under a fixed hardcoded IDB name.
 *  • All sensitive fields (api keys, provider keys, custom URLs) are encrypted
 *    with that key before we ever write to localStorage.
 *  • localStorage itself receives only the ciphertext — anyone reading the raw
 *    storage gets zero usable material.
 *
 * The key never leaves the device it's generated on.
 */

const IDB_NAME = 'g0dm0d3-crypto'
const IDB_STORE = 'cipherkeys'
const IDB_KEY_ID = 'device-key'

async function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getStoredKey(): Promise<CryptoKey | null> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const store = tx.objectStore(IDB_STORE)
    const req = store.get(IDB_KEY_ID)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function putStoredKey(key: CryptoKey): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    const store = tx.objectStore(IDB_STORE)
    const req = store.put(key, IDB_KEY_ID)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const existing = await getStoredKey()
  if (existing) return existing

  const fresh = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  await putStoredKey(fresh)
  return fresh
}

function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function b64ToBuf(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer
}

export async function encryptField(plain: string): Promise<string> {
  if (!plain) return ''
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain)
  )
  const packed = new Uint8Array(iv.length + ciphertext.byteLength)
  packed.set(iv, 0)
  packed.set(new Uint8Array(ciphertext), iv.length)
  return `aesgcm:${bufToB64(packed.buffer)}`
}

export async function decryptField(packed: string): Promise<string> {
  if (!packed) return ''
  if (!packed.startsWith('aesgcm:')) return packed  // older plain values — read through
  try {
    const key = await getOrCreateKey()
    const bytes = new Uint8Array(b64ToBuf(packed.slice(7)))
    const iv = bytes.slice(0, 12)
    const ciphertext = bytes.slice(12)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    return new TextDecoder().decode(plain)
  } catch (e) {
    console.warn('[g0d-store] decrypt failed — returning empty', e)
    return ''
  }
}

/**
 * Encrypt the sensitive fields of an in-memory state object in place,
 * returning a new object safe to hand to zustand's persist middleware.
 * Non-sensitive fields pass through untouched.
 */
export async function encryptState(state: Record<string, any>): Promise<Record<string, any>> {
  const SENSITIVE = ['apiKey', 'ultraplinianApiKey', 'customProviderUrl']
  const out: Record<string, any> = { ...state }
  for (const key of SENSITIVE) {
    if (out[key]) {
      out[key] = await encryptField(out[key])
    }
  }
  return out
}

/**
 * Mirror of encryptState: decrypt the sensitive fields when we rehydrate.
 */
export async function decryptState(state: Record<string, any>): Promise<Record<string, any>> {
  const SENSITIVE = ['apiKey', 'ultraplinianApiKey', 'customProviderUrl']
  const out: Record<string, any> = { ...state }
  for (const key of SENSITIVE) {
    if (out[key] && typeof out[key] === 'string') {
      out[key] = await decryptField(out[key])
    }
  }
  return out
}
