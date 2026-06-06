import { Routes, Route } from 'react-router-dom'
import './iwas/iwas.css'
import Landing    from './iwas/pages/Landing'
import Leave      from './iwas/pages/Leave'
import MyMarks    from './iwas/pages/MyMarks'
import MarkDetail from './iwas/pages/MarkDetail'
import TheWall      from './iwas/pages/TheWall'

/* Global SVG grain filter rendered once, fixed overlay */
function GrainOverlay() {
  return (
    <div aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
    }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        filter: 'url(#grain)',
        opacity: 0.045,
        background: '#888',
      }} />
    </div>
  )
}

export default function App() {
  return (
    <div className="iwas-root">
      <GrainOverlay />
      <Routes>
        <Route path="/"             element={<Landing />} />
        <Route path="/leave"        element={<Leave />} />
        <Route path="/me"           element={<MyMarks />} />
        <Route path="/mark/:blobId" element={<MarkDetail />} />
        <Route path="/the-wall"     element={<TheWall />} />
      </Routes>
    </div>
  )
}
