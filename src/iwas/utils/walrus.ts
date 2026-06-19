import type { EmotionCategory } from './storage'

const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=50'
export const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space/v1/blobs'

export const EMOTIONS: EmotionCategory[] = [
  'loneliness',
  'joy',
  'wonder',
  'loss',
  'rebellion',
  'hope',
  'love',
]


/** Upload any Blob to Walrus and return the blob ID */
export async function uploadToWalrus(blob: Blob): Promise<string> {
  const res = await fetch(WALRUS_PUBLISHER, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Walrus upload failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  const blobId =
    data.newlyCreated?.blobObject?.blobId ??
    data.alreadyCertified?.blobId
  if (!blobId) throw new Error('No blob ID in Walrus response')
  return blobId
}

/** Build the public aggregator URL for a blob */
export function walrusBlobUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR}/${blobId}`
}

/** Timestamp → human-readable relative string */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  return `${mo}mo ago`
}
