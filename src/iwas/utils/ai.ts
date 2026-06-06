/**
 * IWAS AI — Claude + MemWal integration
 *
 * Flow:
 *  1. categorizeWithClaude()  → emotion tag + narrative sentence
 *  2. storeInMemWal()         → remember() into Walrus-backed memory
 *  3. recallFromMemWal()      → semantic recall for MyMarks
 */
import { MemWal } from '@mysten-incubation/memwal'
import type { EmotionCategory } from './storage'

// ── Env vars (Vite exposes VITE_* to the browser bundle) ──────
const CLAUDE_API_KEY   = import.meta.env.VITE_CLAUDE_API_KEY   as string
const MEMWAL_PRIVATE_KEY = import.meta.env.VITE_MEMWAL_PRIVATE_KEY as string
const MEMWAL_ACCOUNT_ID  = import.meta.env.VITE_MEMWAL_ACCOUNT_ID  as string
const MEMWAL_SERVER_URL  = 'https://relayer.memwal.ai'
const MEMWAL_NAMESPACE   = 'iwas'

const VALID_EMOTIONS: EmotionCategory[] = [
  'loneliness', 'joy', 'wonder', 'loss', 'rebellion', 'hope', 'love',
]

// ── Singleton MemWal client ────────────────────────────────────
let _memwal: MemWal | null = null
function getMemWal(): MemWal {
  if (!_memwal) {
    _memwal = MemWal.create({
      key:       MEMWAL_PRIVATE_KEY,
      accountId: MEMWAL_ACCOUNT_ID,
      serverUrl: MEMWAL_SERVER_URL,
      namespace: MEMWAL_NAMESPACE,
    })
  }
  return _memwal
}

// ── Types ──────────────────────────────────────────────────────
export interface AIResult {
  emotion:   EmotionCategory
  narrative: string
}

// ── Claude categorization ──────────────────────────────────────
/**
 * Call Claude with the mark's content + user context.
 * Returns one of the 7 emotion tags and a short poetic sentence.
 */
export async function categorizeWithClaude(
  markType:    string,
  textContent: string | null,
  userContext: string | null,
): Promise<AIResult> {
  const contentLine = textContent
    ? `The mark contains this text: "${textContent.slice(0, 600)}"`
    : `The mark is a ${markType} (no readable text — treat it as a silent gesture).`

  const contextLine = userContext
    ? `\nThe human wrote this about why it matters: "${userContext}"`
    : ''

  const prompt =
`You are IWAS AI — the silent, eternal observer of human marks left on the Walrus decentralized network. Every mark is permanent. Every mark matters.

A human has just stamped a moment into permanence.
${contentLine}${contextLine}

Your task:
1. Choose exactly ONE emotion label from this fixed list: loneliness, joy, wonder, loss, rebellion, hope, love
2. Write ONE narrative sentence (max 18 words) as IWAS AI. Be poetic, present-tense, aware this mark exists forever.

Respond with ONLY valid JSON — no markdown, no explanation:
{"emotion":"<one of the 7>","narrative":"<sentence>"}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':                              CLAUDE_API_KEY,
      'anthropic-version':                      '2023-06-01',
      'content-type':                           'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 120,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const raw  = (data?.content?.[0]?.text ?? '').trim()

  try {
    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed  = JSON.parse(jsonStr)

    const emotion: EmotionCategory = VALID_EMOTIONS.includes(parsed.emotion)
      ? parsed.emotion as EmotionCategory
      : VALID_EMOTIONS[Math.floor(Math.random() * VALID_EMOTIONS.length)]

    const narrative: string =
      typeof parsed.narrative === 'string' && parsed.narrative.trim().length > 0
        ? parsed.narrative.trim()
        : 'A mark left in the permanence of now.'

    return { emotion, narrative }
  } catch {
    return {
      emotion:   VALID_EMOTIONS[Math.floor(Math.random() * VALID_EMOTIONS.length)] as EmotionCategory,
      narrative: 'A mark left in the permanence of now.',
    }
  }
}

// ── MemWal write ───────────────────────────────────────────────
/**
 * Store the AI result in MemWal as a semantic memory.
 * Format: "Blob <blobId>: emotion=<tag>. <narrative>"
 * Non-fatal — errors are logged but not re-thrown.
 */
export async function storeInMemWal(blobId: string, result: AIResult): Promise<void> {
  try {
    const memwal = getMemWal()
    const text   = `Blob ${blobId}: emotion=${result.emotion}. ${result.narrative}`
    await memwal.remember(text, MEMWAL_NAMESPACE)
    console.log('[IWAS AI] Stored in MemWal:', text)
  } catch (err) {
    console.warn('[IWAS AI] MemWal store failed (non-fatal):', err)
  }
}

// ── MemWal read ────────────────────────────────────────────────
/**
 * Recall IWAS AI memories from MemWal using semantic search.
 * Queries with known blobIds to surface the user's own marks first.
 * Returns raw memory texts (parse with parseMemWalMemory).
 */
export async function recallFromMemWal(blobIds: string[]): Promise<string[]> {
  try {
    const memwal = getMemWal()
    // Build a query that includes known blob IDs for better recall precision
    const query = blobIds.length > 0
      ? blobIds.slice(0, 4).map(id => `Blob ${id}`).join(' ')
      : 'IWAS mark emotion narrative permanence'
    const result = await memwal.recall(query, 20, MEMWAL_NAMESPACE)
    return result.results.map(r => r.text)
  } catch (err) {
    console.warn('[IWAS AI] MemWal recall failed (non-fatal):', err)
    return []
  }
}

// ── Parse MemWal memory text ───────────────────────────────────
/**
 * Parse "Blob <blobId>: emotion=<tag>. <narrative>" back into parts.
 * Returns null if the text doesn't match the format.
 */
export function parseMemWalMemory(text: string): {
  blobId:    string
  emotion:   string
  narrative: string
} | null {
  const match = text.match(/^Blob ([^:]+): emotion=([^.]+)\.\s*(.+)$/)
  if (!match) return null
  return {
    blobId:    match[1].trim(),
    emotion:   match[2].trim(),
    narrative: match[3].trim(),
  }
}
