import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSuiClient } from '@mysten/dapp-kit'
import Nav from '../components/Nav'
import { getMarkById, type Mark } from '../utils/storage'
import { walrusBlobUrl, timeAgo } from '../utils/walrus'

const TYPE_ICON: Record<string, string> = {
  voice:   '🎙',
  image:   '🖼',
  text:    '✍',
  drawing: '✏️',
}

export default function MarkDetail() {
  const { blobId }   = useParams<{ blobId: string }>()
  const suiClient    = useSuiClient()
  const [mark,        setMark]        = useState<Mark | null>(null)
  const [blobUrl,     setBlobUrl]     = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)

  useEffect(() => {
    if (!blobId) return
    setLoading(true)

    getMarkById(suiClient, blobId).then(found => {
      if (!found) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setMark(found)

      const url = walrusBlobUrl(blobId)
      setBlobUrl(url)

      if (found.type === 'text') {
        fetch(url)
          .then((r) => r.text())
          .then(setTextContent)
          .catch(() => setTextContent(null))
      }

      setLoading(false)
    })
  }, [blobId, suiClient])

  if (loading) return (
    <div className="iwas-root">
      <Nav />
      <div className="iwas-page"><div className="loading-wall">loading mark...</div></div>
    </div>
  )

  if (notFound || !mark) return (
    <div className="iwas-root">
      <Nav />
      <div className="iwas-page">
        <div className="empty-wall">
          Mark not found on the wall.<br />
          <span style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
            The blob may still exist on Walrus — check via the retrieval tool.
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="iwas-root">
      <Nav />
      <div className="iwas-page">
        <div className="mark-detail">

          {/* Media */}
          <div className="mark-detail-media">
            {mark.type === 'voice' && blobUrl && (
              <div style={{ textAlign: 'center', padding: '60px 0 20px' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎙</div>
                <audio src={blobUrl} controls style={{ width: '100%' }} />
              </div>
            )}

            {(mark.type === 'image' || mark.type === 'drawing') && blobUrl && (
              <img src={blobUrl} alt="mark" style={{ width: '100%', display: 'block' }} />
            )}

            {mark.type === 'text' && (
              <div className="mark-detail-text">
                {textContent ?? 'Loading...'}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="mark-meta">
            <div className="mark-meta-row">
              <span className="mark-meta-key">type</span>
              <span className="mark-meta-val">{TYPE_ICON[mark.type]} {mark.type}</span>
            </div>
            <div className="mark-meta-row">
              <span className="mark-meta-key">emotion</span>
              <span className="mark-meta-val" style={{ color: 'var(--ochre)' }}>{mark.category}</span>
            </div>
            <div className="mark-meta-row">
              <span className="mark-meta-key">when</span>
              <span className="mark-meta-val">{timeAgo(mark.timestamp)}</span>
            </div>
            {mark.context && (
              <div className="mark-meta-row">
                <span className="mark-meta-key">why</span>
                <span className="mark-meta-val" style={{ fontStyle: 'italic', color: 'var(--bone-dim)' }}>
                  {mark.context}
                </span>
              </div>
            )}
            <div className="mark-meta-row">
              <span className="mark-meta-key">blob id</span>
              <span className="mark-meta-val" style={{ fontSize: 11 }}>{mark.blobId}</span>
            </div>
            <div className="mark-meta-row">
              <span className="mark-meta-key">wallet</span>
              <span className="mark-meta-val" style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>{mark.walletAddress.slice(0, 8)}...{mark.walletAddress.slice(-6)}</span>
            </div>
            {blobUrl && (
              <div className="mark-meta-row">
                <span className="mark-meta-key">walrus</span>
                <a href={blobUrl} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--ochre)', fontSize: 12, fontFamily: 'var(--mono)' }}>
                  view on network ↗
                </a>
              </div>
            )}
          </div>

          {/* IWAS AI narrative */}
          {mark.narrative && (
            <div className="scribe-narrative" style={{ marginTop: 32 }}>
              <div className="scribe-narrative-label">IWAS AI</div>
              <div className="scribe-narrative-text">"{mark.narrative}"</div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
