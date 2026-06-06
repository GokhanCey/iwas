import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import CaveBackground from '../components/CaveBackground'



export default function Landing() {
  const navigate = useNavigate()
  const [animStep, setAnimStep] = useState(0)
  const [fade, setFade] = useState(1)

  useEffect(() => {
    // Fade out first phrase
    const t1 = setTimeout(() => setFade(0), 1800)
    // Swap to second phrase and fade in
    const t2 = setTimeout(() => {
      setAnimStep(1)
      setFade(1)
    }, 2400)
    
    // Fade out second phrase
    const t3 = setTimeout(() => setFade(0), 4400)
    // Swap to final phrase and fade in
    const t4 = setTimeout(() => {
      setAnimStep(2)
      setFade(1)
    }, 5000)
    
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [])

  return (
    <div className="iwas-landing">
      {/* Cave art layer */}
      <CaveBackground />

      {/* Animated logo */}
      <div className="iwas-logo-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <h1 style={{ 
          fontFamily: 'var(--serif)', 
          fontSize: 'clamp(48px, 12vw, 120px)', 
          fontStyle: 'italic', 
          color: 'var(--bone)', 
          textShadow: '0 0 20px rgba(217,197,160,0.1)',
          opacity: fade,
          transition: 'opacity 0.6s ease-in-out'
        }}>
          {animStep === 0 && (
            <span>i <span style={{ color: 'var(--ochre)' }}>walrus</span> here.</span>
          )}
          {animStep === 1 && <span>i was here.</span>}
          {animStep === 2 && <span>IWAS</span>}
        </h1>
      </div>

      {/* Tagline */}
      <p className="iwas-tagline">
        Every human who ever lived wanted to be remembered.<br />Now it's your turn.
      </p>

      {/* Buttons */}
      <div className="iwas-landing-actions">
        <button className="btn-ochre primary" onClick={() => navigate('/leave')}>Leave your mark</button>
        <button className="btn-ochre"         onClick={() => navigate('/the-wall')}>The Wall</button>
      </div>
    </div>
  )
}
