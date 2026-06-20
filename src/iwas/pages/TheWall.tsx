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
function WallItem({ m, isMobile }: { m: WallMark, isMobile: boolean }) {
  const [hovered, setHovered] = useState(false)

  const baseTransform = isMobile ? 'none' : `translate(-50%, -50%) rotate(${m.rotation}deg) scale(${m.scale})`
  const hoverTransform = isMobile ? 'scale(1.05)' : `translate(-50%, -50%) rotate(${m.rotation}deg) scale(${m.scale * 1.4})`

  return (
    <Link
      key={m.blobId}
      to={`/mark/${m.blobId}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: isMobile ? 'relative' : 'absolute',
        left: isMobile ? 'auto' : `clamp(${m.type === 'text' ? '150px' : '100px'}, ${m.x}%, calc(100vw - ${m.type === 'text' ? '150px' : '100px'}))`,
        top: isMobile ? 'auto' : `${m.y}px`,
        transform: hovered ? hoverTransform : baseTransform,
        transition: 'transform 0.25s ease, z-index 0s',
        zIndex: hovered ? 999 : 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textDecoration: 'none',
        cursor: 'pointer',
        margin: isMobile ? '32px 0' : '0'
      }}
    >
      {m.type === 'text' ? (
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: isMobile ? 18 : 21,
            fontStyle: 'italic',
            color: hovered ? 'var(--bone)' : 'rgba(217, 197, 160, 0.65)',
            maxWidth: isMobile ? 280 : 240,
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
            maxWidth: isMobile ? 180 : 160,
            maxHeight: isMobile ? 180 : 160,
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const suiClient = useSuiClient()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function loadMarks() {
      let all = await getAllMarks(suiClient)
      all.sort((a, b) => b.timestamp - a.timestamp)

      const COUNT = all.length
      const MARK_SLOT = isMobile ? 55 : 64
      const TOTAL_H = Math.max(900, COUNT * MARK_SLOT + 400)
      const COLS = isMobile ? 2 : 4

      // Fetch text contents FIRST so we can measure them for collision
      if (!isMobile) {
        await Promise.all(all.map(async (m) => {
          if (m.type === 'text') {
            try {
              const r = await fetch(walrusBlobUrl(m.blobId))
              if (!r.ok) throw new Error()
              const text = await r.text()
              if (text.startsWith('{"error"')) throw new Error()
              m.textContent = text
            } catch {
              m.textContent = '[Faded from memory]'
            }
          }
        }))
      }

      const windowWidth = window.innerWidth
      const wallMarks: WallMark[] = []

      all.forEach((m, i) => {
        if (isMobile) {
          wallMarks.push({ ...m, x: 50, y: 0, scale: 1, rotation: 0 })
          return
        }

        const rng = seededRandom(m.blobId)
        const safeMin = m.type === 'text' ? 15 : 12
        const safeMax = m.type === 'text' ? 85 : 88
        const range = safeMax - safeMin
        const COL_W = range / COLS

        const colIndex = (i * 7 + Math.floor(rng() * 3)) % COLS
        const colMin = safeMin + colIndex * COL_W
        const colMax = colMin + COL_W

        const slotY = (i / Math.max(1, COUNT - 1)) * (TOTAL_H - 400) + 180
        
        let x = 0
        let y = 0
        const scale = 0.72 + rng() * 0.45
        const rotation = -10 + rng() * 20

        let attempts = 0
        let collision = true

        while (collision && attempts < 50) {
          x = colMin + rng() * (colMax - colMin)
          // increase jitter spread on higher attempts to find empty space
          const jitterSpread = MARK_SLOT * (0.5 + (attempts * 0.2))
          const jitter = (rng() - 0.5) * jitterSpread
          y = Math.max(180, Math.min(TOTAL_H - 120, slotY + jitter))

          collision = false
          
          // Dynamic collision box sizing based on content
          const textLen = m.textContent ? m.textContent.length : 0
          const reqWidth = m.type === 'text' ? Math.min(300, Math.max(180, textLen * 4.5)) : 180
          const lines = textLen ? Math.ceil(textLen / 25) : 1
          const reqHeight = m.type === 'text' ? Math.max(120, lines * 35 + 80) : 180

          for (const placed of wallMarks) {
            const dxPx = Math.abs((x - placed.x) / 100 * windowWidth)
            const dyPx = Math.abs(y - placed.y)
            
            const placedLen = placed.textContent ? placed.textContent.length : 0
            const placedWidth = placed.type === 'text' ? Math.min(300, Math.max(180, placedLen * 4.5)) : 180
            const placedLines = placedLen ? Math.ceil(placedLen / 25) : 1
            const placedHeight = placed.type === 'text' ? Math.max(120, placedLines * 35 + 80) : 180

            const minDx = (reqWidth + placedWidth) / 2 + 50 // 50px extra horizontal buffer
            const minDy = (reqHeight + placedHeight) / 2 + 60 // 60px extra vertical buffer
            
            if (dxPx < minDx && dyPx < minDy) {
              collision = true
              break
            }
          }
          attempts++
        }

        wallMarks.push({ ...m, x, y, scale, rotation })
      })

      setMaxHeight(TOTAL_H)
      
      // On mobile, we didn't pre-fetch text to save time since there's no collision logic, so fetch it now
      if (isMobile) {
        wallMarks.forEach(m => {
          if (m.type === 'text') {
            fetch(walrusBlobUrl(m.blobId))
              .then(async r => {
                if (!r.ok) throw new Error()
                const text = await r.text()
                if (text.startsWith('{"error"')) throw new Error()
                return text
              })
              .then(text => {
                setMarks(prev => prev.map(p => p.blobId === m.blobId ? { ...p, textContent: text } : p))
              })
              .catch(() => {
                setMarks(prev => prev.map(p => p.blobId === m.blobId ? { ...p, textContent: '[Faded from memory]' } : p))
              })
          }
        })
      }

      setMarks(wallMarks)
    }

    loadMarks()
  }, [suiClient, isMobile])

  return (
    <div className="iwas-root" style={{ backgroundColor: '#050403' }}>
      <Nav />

      <div
        className="the-wall-container"
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100vh',
          height: isMobile ? 'auto' : `${maxHeight}px`,
          overflow: isMobile ? 'visible' : 'hidden',
          background: '#050403',
          display: isMobile ? 'flex' : 'block',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'stretch',
          paddingTop: isMobile ? '120px' : '0',
          paddingBottom: isMobile ? '120px' : '0',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 100,
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

        {marks.map(m => <WallItem key={m.blobId} m={m} isMobile={isMobile} />)}
      </div>
    </div>
  )
}
