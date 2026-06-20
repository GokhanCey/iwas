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
          {m.textContent === 'no one chose to remember' ? (
            <span>
              {m.textContent.split(' ').map((word, i) => {
                const opacities = [0.4, 0.15, 0.5, 0.2, 0.45]
                return (
                  <span key={i} style={{ opacity: hovered ? 1 : opacities[i], transition: 'opacity 0.5s ease' }}>
                    {word}{' '}
                  </span>
                )
              })}
            </span>
          ) : m.textContent
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
      let rawMarks = await getAllMarks(suiClient)
      let all = rawMarks as (Mark & { textContent?: string })[]
      all.sort((a, b) => b.timestamp - a.timestamp)

      const windowWidth = window.innerWidth
      const COLS = isMobile ? 1 : Math.max(2, Math.floor(windowWidth / 350))
      const colHeights = new Array(COLS).fill(180) // 180px top padding

      const wallMarks: WallMark[] = []

      // Marks are already sorted by timestamp (newest first).
      // We place them chronologically into the shortest available column.
      all.forEach((m, i) => {
        if (isMobile) {
          wallMarks.push({ ...m, x: 50, y: 0, scale: 1, rotation: 0 })
          return
        }

        const rng = seededRandom(m.blobId)

        // 1. Measure: Calculate footprint based on content
        const textLen = m.textContent ? m.textContent.length : 0
        const reqWidth = m.type === 'text' ? Math.min(300, Math.max(180, textLen * 4.5)) : 220
        const lines = textLen ? Math.ceil(textLen / 25) : 1
        const reqHeight = m.type === 'text' ? Math.max(120, lines * 35 + 80) : 220

        // 2. Find shortest column
        let minCol = 0
        let minH = colHeights[0]
        for (let c = 1; c < COLS; c++) {
          if (colHeights[c] < minH) {
            minCol = c
            minH = colHeights[c]
          }
        }

        // 3. Place: Calculate Grid Cell center and add cosmetic jitter
        const colWidthPct = 100 / COLS
        const baseX = (minCol * colWidthPct) + (colWidthPct / 2)
        
        // Jitter within the column bounds (max +/- 20% of col width)
        const jitterX = (rng() - 0.5) * (colWidthPct * 0.4)
        const x = Math.max(5, Math.min(95, baseX + jitterX))
        
        // y is the shortest column height + organic jitter (0 to 40px)
        const y = minH + (rng() * 40)

        const scale = 0.72 + rng() * 0.45
        const rotation = -10 + rng() * 20

        wallMarks.push({ ...m, x, y, scale, rotation })

        // 4. Update the column's height with the mark's true height + buffer
        colHeights[minCol] = y + reqHeight + 40
      })

      const TOTAL_H = isMobile ? 900 : Math.max(900, Math.max(...colHeights) + 200)
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
                setMarks(prev => prev.map(p => p.blobId === m.blobId ? { ...p, textContent: 'no one chose to remember' } : p))
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



        {marks.map(m => <WallItem key={m.blobId} m={m} isMobile={isMobile} />)}
      </div>
    </div>
  )
}
