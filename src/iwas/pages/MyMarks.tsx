import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentAccount, ConnectButton, useSuiClient } from '@mysten/dapp-kit'
import Nav from '../components/Nav'
import { getMarksByWallet, type Mark } from '../utils/storage'
import { timeAgo } from '../utils/walrus'
import { recallFromMemWal, parseMemWalMemory } from '../utils/ai'

const TYPE_ICON: Record<string, string> = {
  voice:   '🎙',
  image:   '🖼',
  text:    '✍',
  drawing: '✏️',
}

export default function MyMarks() {
  const account  = useCurrentAccount()
  const suiClient = useSuiClient()

  const [marks, setMarks] = useState<Mark[]>([])
  const [aiMemories, setAiMemories] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load marks from blockchain
  useEffect(() => {
    if (!account) return
    setLoading(true)
    getMarksByWallet(suiClient, account.address)
      .then(m => setMarks(m))
      .finally(() => setLoading(false))
  }, [account, suiClient])

  // Recall IWAS AI memories from MemWal whenever marks change
  useEffect(() => {
    if (marks.length === 0) return
    setAiLoading(true)
    const blobIds = marks.map(m => m.blobId)
    recallFromMemWal(blobIds)
      .then(setAiMemories)
      .finally(() => setAiLoading(false))
  }, [marks])

  // ── Not connected ────────────────────────────────────────────
  if (!account) {
    return (
      <div className="iwas-root">
        <Nav />
        <div className="iwas-page">
          <div className="connect-wall">
            <div className="connect-wall-heading">Your marks.</div>
            <p className="connect-wall-sub">
              Connect your wallet to see the marks you've left and the threads IWAS AI has found.
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    )
  }

  // Parse MemWal memories that match marks in this wallet
  const myBlobIds = new Set(marks.map(m => m.blobId))
  const parsedMemories = aiMemories
    .map(text => parseMemWalMemory(text))
    .filter(Boolean)
    .filter(p => myBlobIds.has(p!.blobId)) as { blobId: string; emotion: string; narrative: string }[]

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="iwas-root">
      <Nav />
      <div className="iwas-page">
        <h1 className="iwas-page-title">My marks.</h1>
        <p className="iwas-page-sub">
          {loading ? 'Loading marks from Sui...' : 
           (marks.length === 0
            ? 'You have left no marks yet.'
            : `${marks.length} mark${marks.length !== 1 ? 's' : ''} left on the wall.`)}
        </p>

        {/* Mark list */}
        {marks.length === 0 ? (
          <div className="empty-wall" style={{ textAlign: 'left', paddingLeft: 0 }}>
            <Link to="/leave" className="btn-ochre" style={{ display: 'inline-block', marginTop: 24 }}>
              Leave your first mark
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 40 }}>
            {marks.map((mark) => (
              <Link
                key={mark.blobId}
                to={`/mark/${mark.blobId}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="mark-card"
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}
                >
                  <span style={{ fontSize: 20 }}>{TYPE_ICON[mark.type] ?? '◆'}</span>
                  <div style={{ flex: 1 }}>
                    <div className="mark-card-category">{mark.category}</div>
                    {mark.narrative && (
                      <div style={{
                        fontFamily: 'var(--serif)',
                        fontSize:   12,
                        fontStyle:  'italic',
                        color:      'var(--bone-dim)',
                        marginTop:  3,
                        lineHeight: 1.4,
                      }}>
                        "{mark.narrative}"
                      </div>
                    )}
                    <div className="mark-card-blob" style={{ marginTop: 4 }}>{mark.blobId}</div>
                  </div>
                  <div className="mark-card-time">{timeAgo(mark.timestamp)}</div>
                  {mark.threadBlobId && (
                    <div className="mark-card-thread" title="Invisible thread" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* IWAS AI reading — from MemWal recall */}
        {aiMemories.length > 0 && (
          <div className="ai-reading" style={{ marginTop: 48 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--bone)', marginBottom: 16 }}>
              IWAS AI semantic memory
            </h2>
            <div style={{ background: '#111', padding: '16px 20px', borderRadius: 6 }}>
              {aiLoading ? (
                <div style={{ color: 'var(--bone-dim)', fontStyle: 'italic', fontSize: 13 }}>
                  Recalling from the void...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {parsedMemories.map((m, i) => (
                    <div key={i} style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--bone)' }}>
                      <span style={{ color: 'var(--ochre)', marginRight: 8 }}>{m.emotion}</span>
                      {m.narrative}
                    </div>
                  ))}
                  {parsedMemories.length === 0 && (
                    <div style={{ color: 'var(--bone-dim)', fontStyle: 'italic', fontSize: 13 }}>
                      No clear semantic memories found for your marks yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
