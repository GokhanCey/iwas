import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { getAllMarks, type Mark } from '../utils/storage'
import { walrusBlobUrl } from '../utils/walrus'
import { useSuiClient } from '@mysten/dapp-kit'

// Stable pseudo-random generator
function seededRandom(seedStr: string) {
  let hash = 0
  for (let i = 0; i < seedStr.length; i++) {
    hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0
  }
  return function() {
    hash = Math.imul(741103597, hash) + 1957664213 | 0
    return ((hash >>> 0) / 4294967296)
  }
}

interface WallMark extends Mark {
  x: number      // 0–100 percentage
  y: number      // absolute px
  scale: number
  rotation: number
  textContent?: string
}

// ── Inline hover component so we can use React state ──────────
function WallItem({ m }: { m: WallMark }) {
  const [hovered, setHovered] = useState(false)

  const baseTransform = `translate(-50%, -50%) rotate(${m.rotation}deg) scale(${m.scale})`
  const hoverTransform = `translate(-50%, -50%) rotate(${m.rotation}deg) scale(${m.scale * 1.4})`

  return (
    <Link
      key={m.blobId}
      to={`/mark/${m.blobId}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: `clamp(${m.type === 'text' ? '150px' : '100px'}, ${m.x}%, calc(100vw - ${m.type === 'text' ? '150px' : '100px'}))`,
        top: `${m.y}px`,
        transform: hovered ? hoverTransform : baseTransform,
        transition: 'transform 0.25s ease, z-index 0s',
        zIndex: hovered ? 999 : 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      {m.type === 'text' ? (
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 18,
            fontStyle: 'italic',
            color: hovered ? 'var(--bone)' : 'rgba(217, 197, 160, 0.65)',
            maxWidth: 240,
            textAlign: 'center',
            lineHeight: 1.4,
            transition: 'color 0.2s ease',
          }}
        >
          {m.textContent
            ? m.textContent.slice(0, 80) + (m.textContent.length > 80 ? '…' : '')
            : '·  ·  ·'}
        </div>
      ) : (
        <img
          src={walrusBlobUrl(m.blobId)}
          alt="cave drawing"
          style={{
            maxWidth: 160,
            maxHeight: 160,
            objectFit: 'contain',
            opacity: hovered ? 1 : 0.8,
            filter: 'contrast(1.1) sepia(0.2) brightness(0.95)',
            mixBlendMode: 'screen',
            transition: 'opacity 0.2s ease',
            display: 'block',
            background: 'transparent',
          }}
        />
      )}
    </Link>
  )
}

export default function TheWall() {
  const [marks, setMarks] = useState<WallMark[]>([])
  const [maxHeight, setMaxHeight] = useState(1000)
  const suiClient = useSuiClient()

  useEffect(() => {
    async function loadMarks() {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      let all = await getAllMarks(suiClient)
      all = all.filter(m => m.timestamp > thirtyDaysAgo)
      all.sort((a, b) => b.timestamp - a.timestamp)

      const COUNT = all.length
      const MARK_SLOT = 80
      const TOTAL_H = Math.max(900, COUNT * MARK_SLOT + 400)
      const COLS = 4

      const wallMarks: WallMark[] = all.map((m, i) => {
        const rng = seededRandom(m.blobId)
        const safeMin = m.type === 'text' ? 15 : 12
        const safeMax = m.type === 'text' ? 85 : 88
        const range = safeMax - safeMin
        const COL_W = range / COLS

        const colIndex = (i * 7 + Math.floor(rng() * 3)) % COLS
        const colMin = safeMin + colIndex * COL_W
        const colMax = colMin + COL_W
        const x = colMin + rng() * (colMax - colMin)

        const slotY = (i / Math.max(1, COUNT - 1)) * (TOTAL_H - 400) + 180
        const jitter = (rng() - 0.5) * MARK_SLOT * 0.5
        const y = Math.max(180, Math.min(TOTAL_H - 120, slotY + jitter))

        const scale = 0.72 + rng() * 0.45
        const rotation = -10 + rng() * 20

        return { ...m, x, y, scale, rotation }
      })

      setMaxHeight(TOTAL_H)

      // Fetch text blobs for preview text
      wallMarks.forEach(m => {
        if (m.type === 'text') {
          fetch(walrusBlobUrl(m.blobId))
            .then(async r => {
              if (!r.ok) throw new Error('not found')
              const text = await r.text()
              if (text.startsWith('{"error"')) throw new Error('walrus error')
              return text
            })
            .then(text => {
              setMarks(prev => prev.map(p => p.blobId === m.blobId ? { ...p, textContent: text } : p))
            })
            .catch(() => {
              setMarks(prev => prev.filter(p => p.blobId !== m.blobId))
            })
        }
      })

      setMarks(wallMarks)
    }

    loadMarks()
  }, [suiClient])

  return (
    <div className="iwas-root" style={{ backgroundColor: '#050403' }}>
      <Nav />

      <div
        className="the-wall-container"
        style={{
          position: 'relative',
          width: '100%',
          height: `${maxHeight}px`,
          overflow: 'hidden',
          background: '#050403',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 32,
          width: '100%',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 1,
        }}>
          <span style={{
            fontFamily: 'var(--serif)',
            fontSize: 36,
            fontStyle: 'italic',
            color: 'var(--bone)',
            opacity: 0.06,
            letterSpacing: '0.05em',
          }}>
            the wall.
          </span>
        </div>

        {marks.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: '100%',
            padding: '0 24px',
          }}>
            <p style={{
              fontFamily: 'var(--serif)',
              fontSize: 20,
              fontStyle: 'italic',
              color: 'var(--bone-dim)',
              marginBottom: 24,
              opacity: 0.6,
            }}>
              The wall grows with every mark left.
            </p>
            <Link to="/leave" className="btn-ochre">Leave the first mark</Link>
          </div>
        )}

        {marks.map(m => <WallItem key={m.blobId} m={m} />)}
      </div>
    </div>
  )
}
