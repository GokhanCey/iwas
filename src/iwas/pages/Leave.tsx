import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentAccount, ConnectButton, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import Nav from '../components/Nav'
import { uploadToWalrus } from '../utils/walrus'
import { buildAddMarkTx } from '../utils/storage'
import type { MarkType } from '../utils/storage'
import { categorizeWithClaude, storeInMemWal } from '../utils/ai'
import type { AIResult } from '../utils/ai'

type InputMode = 'text' | 'drawing' | null

export default function Leave() {
  const account  = useCurrentAccount()
  const navigate = useNavigate()
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  const [mode,          setMode]          = useState<InputMode>(null)
  const [textContent,   setTextContent]   = useState('')
  const [context,       setContext]       = useState('')
  
  const [isStamping,    setIsStamping]    = useState(false)
  const [stampStatus,   setStampStatus]   = useState('')
  const [stampedBlobId, setStampedBlobId] = useState<string | null>(null)
  const [aiResult,      setAiResult]      = useState<AIResult | null>(null)
  const [textsLeftToday, setTextsLeftToday] = useState<number>(3)

  useEffect(() => {
    const data = localStorage.getItem('iwas-text-limit')
    if (data) {
      try {
        const parsed = JSON.parse(data)
        if (Date.now() > parsed.resetAt) {
          localStorage.removeItem('iwas-text-limit')
        } else {
          setTextsLeftToday(Math.max(0, 3 - parsed.count))
        }
      } catch (e) {}
    }
  }, [])

  const canvasRef     = useRef<HTMLCanvasElement | null>(null)
  const drawing       = useRef(false)
  const lastPos       = useRef({ x: 0, y: 0 })
  // "Rough" brush style
  const brushSize     = useRef(8)
  const [brushColor, setBrushColor] = useState('#D9C5A0') // earthy ochre/bone

  // canvas logic
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      }
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top)  * scaleY,
    }
  }

  // Draw background texture when canvas opens
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || mode !== 'drawing') return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [mode])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawing.current  = true
    lastPos.current  = getCanvasPos(e, canvas)
    
    // Initial dot
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = brushColor
    ctx.beginPath()
    ctx.arc(lastPos.current.x, lastPos.current.y, brushSize.current / 2, 0, Math.PI * 2)
    ctx.fill()
  }, [brushColor])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const pos = getCanvasPos(e, canvas)
    
    // Rough brush effect — jitter
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    
    const dist = Math.hypot(pos.x - lastPos.current.x, pos.y - lastPos.current.y)
    const steps = Math.max(1, Math.floor(dist / 2))
    
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const cx = lastPos.current.x + (pos.x - lastPos.current.x) * t
      const cy = lastPos.current.y + (pos.y - lastPos.current.y) * t
      
      const jitterX = (Math.random() - 0.5) * 4
      const jitterY = (Math.random() - 0.5) * 4
      
      ctx.lineTo(cx + jitterX, cy + jitterY)
    }
    
    ctx.strokeStyle = brushColor
    ctx.lineWidth   = brushSize.current
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    // Slight opacity variation for organic feel
    ctx.globalAlpha = 0.8 + Math.random() * 0.2
    ctx.stroke()
    ctx.globalAlpha = 1.0
    
    lastPos.current = pos
  }, [brushColor])

  const stopDraw = useCallback(() => { drawing.current = false }, [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  // check if has content
  const hasContent =
    (mode === 'text'    && textContent.trim().length > 0) ||
    (mode === 'drawing')

  // handle stamp
  const handleStamp = async () => {
    if (!account) return
    if (mode === 'text' && textsLeftToday <= 0) {
      alert("You have left enough text marks for today. Come back tomorrow, or leave a drawing.")
      return
    }
    setIsStamping(true)

    try {
      let blob: Blob
      let markType: MarkType
      let rawText: string | null = null

      if (mode === 'text') {
        rawText  = textContent
        blob     = new Blob([textContent], { type: 'text/plain' })
        markType = 'text'
      } else if (mode === 'drawing' && canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png')
        const res     = await fetch(dataUrl)
        blob     = await res.blob()
        markType = 'drawing'
      } else {
        return
      }

      // upload to walrus
      setStampStatus('Uploading to Walrus...')
      const blobId = await uploadToWalrus(blob)

      // fetch ai emotion
      setStampStatus('IWAS AI is reading your mark...')
      const result = await categorizeWithClaude(
        markType,
        rawText,
        context.trim() || null,
      )
      setAiResult(result)

      // store memory
      setStampStatus('Storing in memory...')
      storeInMemWal(blobId, result).catch(console.warn)

      // save to chain
      setStampStatus('Engraving on The Wall...')
      const tx = buildAddMarkTx(blobId, markType, result.emotion, Date.now())
      await signAndExecuteTransaction({ transaction: tx as any })

      if (mode === 'text') {
        const data = localStorage.getItem('iwas-text-limit')
        let count = 1
        let resetAt = Date.now() + 24 * 60 * 60 * 1000
        if (data) {
          try {
            const parsed = JSON.parse(data)
            if (Date.now() <= parsed.resetAt) {
              count = parsed.count + 1
              resetAt = parsed.resetAt
            }
          } catch(e) {}
        }
        localStorage.setItem('iwas-text-limit', JSON.stringify({ count, resetAt }))
        setTextsLeftToday(Math.max(0, 3 - count))
      }

      setStampedBlobId(blobId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('Failed to leave mark: ' + msg)
    } finally {
      setIsStamping(false)
      setStampStatus('')
    }
  }

  // check wallet
  if (!account) {
    return (
      <div className="iwas-root">
        <Nav />
        <div className="iwas-leave">
          <div className="connect-wall">
            <div className="connect-wall-heading">Connect your wallet.</div>
            <p className="connect-wall-sub">
              Your mark needs an identity — even a pseudonymous one.
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    )
  }

  // success UI
  if (stampedBlobId) {
    return (
      <div className="iwas-root">
        <div className="stamp-confirmation">
          {/* IWAS AI reading */}
          {aiResult && (
            <div className="stamp-ai-block">
              <div className="stamp-ai-label">IWAS AI</div>
              <div className="stamp-ai-emotion" style={{ color: 'var(--ochre)' }}>
                {aiResult.emotion}
              </div>
              <div className="stamp-ai-narrative">
                "{aiResult.narrative}"
              </div>
            </div>
          )}

          <div className="stamp-blob-id-large">{stampedBlobId}</div>
          <p className="stamp-permanence">This exists now. It will exist after you.</p>
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--bone-dim)',
            marginTop: -8,
            marginBottom: 24,
            opacity: 0.6,
            textAlign: 'center'
          }}>
            stored for 50 days on testnet. on mainnet, marks last up to 2 years per cycle — renewable indefinitely in SUI.
          </p>

          <a
            href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${stampedBlobId}`}
            target="_blank"
            rel="noreferrer"
            className="stamp-link"
          >
            aggregator.walrus-testnet.walrus.space/v1/blobs/{stampedBlobId}
          </a>

          <div className="stamp-actions">
            <button className="btn-ochre" onClick={() => navigate(`/mark/${stampedBlobId}`)}>
              View your mark
            </button>
            <button className="btn-ghost" onClick={() => {
              setStampedBlobId(null); setAiResult(null)
              setTextContent(''); setContext('')
              setMode(null)
            }}>
              Leave another
            </button>
          </div>
        </div>
      </div>
    )
  }

  // leave mark form
  return (
    <div className="iwas-root">
      <Nav />
      <div className="iwas-leave">

        {mode === null && (
          <div className="mode-selection-cave">
            {/* Cave art background elements */}
            <div className="cave-art-layer" aria-hidden="true" style={{ opacity: 0.3 }}>
              <svg viewBox="-10 -10 120 80" width="168" height="112" style={{ position: 'absolute', left: '10%', top: '20%', transform: 'rotate(-5deg)', overflow: 'visible' }}>
                <path d="M0,40 C5,10 30,0 55,8 C70,12 80,8 90,15 C100,22 105,35 100,45 C95,55 85,55 80,52 L75,65 L60,65 L62,52 C50,55 35,55 28,50 L20,65 L8,65 L10,50 C2,48 -2,45 0,40 Z" fill="#1A1714" />
              </svg>
              <svg viewBox="-10 -10 120 80" width="132" height="88" style={{ position: 'absolute', right: '15%', top: '60%', transform: 'rotate(8deg)', overflow: 'visible' }}>
                <path d="M0,30 C5,15 20,5 35,8 C45,10 50,5 55,10 C65,18 70,30 65,38 C62,43 55,43 52,40 L50,55 L38,55 L40,42 C30,45 15,42 10,38 L8,55 L-2,55 L0,38 Z" fill="#1A1714" />
              </svg>
            </div>

            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 64, marginTop: 80 }}>
              <h2 style={{ 
                fontFamily: 'var(--serif)', 
                fontSize: 42, 
                fontStyle: 'italic', 
                color: 'var(--bone)',
                textShadow: '0 4px 20px rgba(0,0,0,0.8)' 
              }}>
                How will you leave it?
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32, width: '100%', alignItems: 'center' }}>
                <button 
                  onClick={() => setMode('text')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--ochre)',
                    fontFamily: 'var(--mono)',
                    fontSize: 24,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    opacity: 0.8,
                    transition: 'all 0.2s',
                    textShadow: '0 0 10px rgba(0,0,0,0.5)',
                    padding: '16px 32px',
                    borderBottom: '2px solid transparent'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                >
                  <span style={{ fontSize: 20, marginRight: 16, opacity: 0.5 }}>✍</span>
                  write text
                </button>

                <div style={{ width: 1, height: 40, background: 'var(--bone-dim)', opacity: 0.2 }}></div>

                <button 
                  onClick={() => setMode('drawing')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--ochre)',
                    fontFamily: 'var(--mono)',
                    fontSize: 24,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    opacity: 0.8,
                    transition: 'all 0.2s',
                    textShadow: '0 0 10px rgba(0,0,0,0.5)',
                    padding: '16px 32px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                >
                  <span style={{ fontSize: 20, marginRight: 16, opacity: 0.5 }}>✏️</span>
                  draw something
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Text mode */}
        {mode === 'text' && (
          <textarea
            className="text-input-area"
            placeholder="Write anything. A thought. A memory. A feeling. A truth."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
          />
        )}

        {/* Drawing canvas */}
        {mode === 'drawing' && (
          <div className="draw-canvas-wrap" style={{ 
            border: '2px solid #1A1714', 
            borderRadius: 8, 
            overflow: 'hidden', 
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)' 
          }}>
            <canvas
              ref={canvasRef}
              className="draw-canvas"
              width={640}
              height={360}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={(e) => { e.preventDefault(); startDraw(e) }}
              onTouchMove={(e)  => { e.preventDefault(); draw(e) }}
              onTouchEnd={stopDraw}
              style={{ cursor: 'crosshair', display: 'block', backgroundColor: '#0a0806' }}
            />
            <div className="draw-tools" style={{ background: '#0a0806', borderTop: '1px solid #1A1714', padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                {['#D9C5A0', '#8c3a20', '#4a4131', '#9e5a31'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setBrushColor(c)}
                    style={{ 
                      width: 24, height: 24, borderRadius: '50%', backgroundColor: c, 
                      border: brushColor === c ? '2px solid var(--ochre)' : '2px solid transparent',
                      cursor: 'pointer' 
                    }}
                  />
                ))}
              </div>
              <button className="draw-clear" onClick={clearCanvas}>clear</button>
            </div>
          </div>
        )}

        {/* Alt input switcher */}
        {mode !== null && (
          <div className="alt-inputs">
            {mode !== 'text'    && <button className="alt-btn" onClick={() => setMode('text')}>switch to text</button>}
            {mode !== 'drawing' && <button className="alt-btn" onClick={() => setMode('drawing')}>switch to drawing</button>}
          </div>
        )}

        {/* Context question */}
        {mode !== null && hasContent && (
          <div className="context-question">
            <div className="context-label">Why does this moment matter to you?</div>
            <input
              className="context-input"
              placeholder="Optional — or leave it silent."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
        )}

        {/* Stamp button */}
        {mode !== null && hasContent && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              className="btn-ochre primary"
              onClick={handleStamp}
              disabled={isStamping || (mode === 'text' && textsLeftToday <= 0)}
            >
              {isStamping
                ? (stampStatus || 'Working...')
                : mode === 'text' && textsLeftToday <= 0
                  ? 'Text limit reached'
                  : 'Leave your mark'}
            </button>
            {mode === 'text' && textsLeftToday > 0 && (
              <span style={{ fontSize: 12, color: 'var(--bone-dim)' }}>
                {textsLeftToday} text mark{textsLeftToday !== 1 ? 's' : ''} left today
              </span>
            )}
          </div>
        )}

        {/* Step indicator during stamping */}
        {isStamping && (
          <div style={{
            fontFamily:    'var(--mono)',
            fontSize:      11,
            color:         'var(--bone-dim)',
            letterSpacing: '0.08em',
            marginTop:     8,
            opacity:       0.7,
          }}>
            {stampStatus}
          </div>
        )}
      </div>
    </div>
  )
}
