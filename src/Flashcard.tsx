import { useEffect, useRef, useState } from 'react'
import type { Card } from './deck'

interface Props {
  card: Card
  flipped: boolean
  definitionFirst: boolean
  onFlip: () => void
  onSwipeLeft: () => void   // fail — add to back
  onSwipeRight: () => void  // pass — remove from deck
}

const SWIPE_THRESHOLD = 72

function FaceContent({ text }: { text: string }) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length > 1) {
    return (
      <ul className="face-list">
        {lines.map((line, i) => (
          <li key={i} className={/^\d+\./.test(line) ? 'numbered' : undefined}>{line}</li>
        ))}
      </ul>
    )
  }
  return <p className="face-content">{text}</p>
}

export default function Flashcard({ card, flipped, definitionFirst, onFlip, onSwipeLeft, onSwipeRight }: Props) {
  const front = definitionFirst ? { label: 'Definition', text: card.definition } : { label: 'Term',       text: card.term }
  const back  = definitionFirst ? { label: 'Term',       text: card.term       } : { label: 'Definition', text: card.definition }

  const containerRef = useRef<HTMLDivElement>(null)
  const startX   = useRef<number | null>(null)
  const startY   = useRef<number | null>(null)
  const dragging = useRef(false)
  const dragXRef = useRef(0)
  // Keep callbacks in refs so the stable useEffect closure always calls the latest version
  const cbLeft  = useRef(onSwipeLeft)
  const cbRight = useRef(onSwipeRight)
  const [dragX, setDragX] = useState(0)

  useEffect(() => { cbLeft.current  = onSwipeLeft  }, [onSwipeLeft])
  useEffect(() => { cbRight.current = onSwipeRight }, [onSwipeRight])

  // Non-passive touchmove so we can preventDefault and stop page scroll during horizontal drag
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onMove = (e: TouchEvent) => {
      if (startX.current === null) return
      const dx = e.touches[0].clientX - startX.current
      const dy = e.touches[0].clientY - startY.current!
      if (!dragging.current) {
        if (Math.abs(dy) >= Math.abs(dx) || Math.abs(dx) < 6) return
        dragging.current = true
      }
      e.preventDefault()
      dragXRef.current = dx
      setDragX(dx)
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    dragging.current = false
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (dragging.current) {
      e.preventDefault() // suppress the synthetic click that would otherwise flip the card
      const dx = dragXRef.current
      if      (dx >=  SWIPE_THRESHOLD) cbRight.current()
      else if (dx <= -SWIPE_THRESHOLD) cbLeft.current()
    }
    dragXRef.current = 0
    setDragX(0)
    startX.current  = null
    dragging.current = false
  }

  const absX = Math.abs(dragX)
  const labelOpacity = Math.min(absX / SWIPE_THRESHOLD, 1)

  return (
    <div
      ref={containerRef}
      className={`flashcard-container${flipped ? ' flipped' : ''}`}
      style={{
        transform:  dragX !== 0 ? `translateX(${dragX}px) rotate(${dragX * 0.025}deg)` : undefined,
        transition: dragX === 0 ? 'transform 0.25s ease' : 'none',
      }}
      onClick={onFlip}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {dragX < -6 && (
        <div className="swipe-label swipe-label-left" style={{ opacity: labelOpacity }}>GOT IT</div>
      )}
      {dragX > 6 && (
        <div className="swipe-label swipe-label-right" style={{ opacity: labelOpacity }}>AGAIN</div>
      )}
      <div className="flashcard">
        <div className="flashcard-face flashcard-front">
          <div className="face-inner">
            <span className="face-label">{front.label}</span>
            <FaceContent text={front.text} />
          </div>
        </div>
        <div className="flashcard-face flashcard-back">
          <div className="face-inner">
            <span className="face-label">{back.label}</span>
            <FaceContent text={back.text} />
          </div>
        </div>
      </div>
    </div>
  )
}
