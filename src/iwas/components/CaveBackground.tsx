import { useMemo } from 'react'
import cave1 from '../../assets/cave-painting-1.png'
import cave2 from '../../assets/cave-painting-2.png'
import cave3 from '../../assets/cave-painting-3.png'
import cave4 from '../../assets/cave-painting-4.png'
import cave5 from '../../assets/cave-painting-5.png'
import cave6 from '../../assets/cave-painting-6.png'
import cave7 from '../../assets/cave-painting-7.png'
import cave8 from '../../assets/cave-painting-8.png'

const CAVE_PNGS = [cave1, cave2, cave3, cave4, cave5, cave6, cave7, cave8]

interface Props {
  count?: number
}

// Stable random function so it doesn't jump on every render
function seededRandom(seed: number) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export default function CaveBackground({ count = 8 }: Props) {
  const items = useMemo(() => {
    // 8 fixed positions to guarantee no overlapping
    // 3 on the left, 3 on the right, 1 top center-left, 1 bottom center-right
    const FIXED_POSITIONS = [
      { x: 5,  y: 15 }, // Left Top
      { x: 8,  y: 50 }, // Left Middle
      { x: 10, y: 75 }, // Left Bottom (moved up from 85)
      { x: 85, y: 20 }, // Right Top
      { x: 88, y: 55 }, // Right Middle
      { x: 82, y: 75 }, // Right Bottom (moved up from 85)
      { x: 30, y: 5  }, // Top Center-Left
      { x: 70, y: 80 }  // Bottom Center-Right (moved up from 92)
    ]

    const arr = []
    const actualCount = Math.min(count, FIXED_POSITIONS.length)
    for (let i = 0; i < actualCount; i++) {
      const src = CAVE_PNGS[i % CAVE_PNGS.length]
      const pos = FIXED_POSITIONS[i]
      
      const size = 80 + seededRandom(i * 10) * 120 // 80px to 200px
      const x = pos.x
      const y = pos.y
      
      const rotation = -15 + seededRandom(i * 13) * 30 // -15deg to +15deg
      
      // Shuffle slightly for a more organic feel
      const zIndex = seededRandom(i * 14) > 0.5 ? 0 : 1

      arr.push({ id: i, src, size, x, y, rotation, zIndex })
    }
    return arr
  }, [count])

  return (
    <div 
      className="cave-art-layer" 
      aria-hidden="true" 
      style={{ 
        position: 'absolute', 
        inset: 0, 
        overflow: 'hidden', 
        pointerEvents: 'none', 
        zIndex: 0 
      }}
    >
      <style>
        {`
          .cave-bg-img {
            filter: invert(1) sepia(0.4) opacity(0.09);
          }
          @media (max-width: 1023px) {
            .cave-art-layer {
              display: none !important;
            }
          }
        `}
      </style>
      {items.map(item => (
        <img
          key={item.id}
          className="cave-bg-img"
          src={item.src}
          alt=""
          style={{
            position: 'absolute',
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: item.size,
            height: item.size,
            objectFit: 'contain',
            transform: `rotate(${item.rotation}deg)`,
            zIndex: item.zIndex
          }}
        />
      ))}
    </div>
  )
}
