import type { Card } from './deck'

interface Props {
  card: Card
  flipped: boolean
  definitionFirst: boolean
  onFlip: () => void
}

export default function Flashcard({ card, flipped, definitionFirst, onFlip }: Props) {
  const front = definitionFirst
    ? { label: 'Definition', text: card.definition }
    : { label: 'Term',       text: card.term }
  const back = definitionFirst
    ? { label: 'Term',       text: card.term }
    : { label: 'Definition', text: card.definition }

  return (
    <div className={`flashcard-container${flipped ? ' flipped' : ''}`} onClick={onFlip}>
      <div className="flashcard">
        <div className="flashcard-face flashcard-front">
          <span className="face-label">{front.label}</span>
          <p className="face-content">{front.text}</p>
        </div>
        <div className="flashcard-face flashcard-back">
          <span className="face-label">{back.label}</span>
          <p className="face-content">{back.text}</p>
        </div>
      </div>
    </div>
  )
}
