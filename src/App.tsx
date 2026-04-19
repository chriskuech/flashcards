import { useEffect, useState } from 'react'
import type { Card } from './deck'
import Flashcard from './Flashcard'
import { parseCSV } from './parseCSV'
import './App.css'

type Snapshot = { cards: Card[]; index: number; removed: number }

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [total, setTotal] = useState(0)
  const [removed, setRemoved] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [flipped, setFlipped] = useState(false)
  const [definitionFirst, setDefinitionFirst] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/flashcards.csv')
      .then(res => {
        if (!res.ok) throw new Error(`Could not load flashcards.csv (${res.status})`)
        return res.text()
      })
      .then(text => {
        const parsed = parseCSV(text)
        if (parsed.length === 0) throw new Error('No valid cards found in flashcards.csv')
        setCards(parsed)
        setTotal(parsed.length)
      })
      .catch(err => setError(err.message))
  }, [])

  const currentCard = cards[currentIndex] ?? null
  const pct = total === 0 ? 0 : Math.round((removed / total) * 100)

  function save() {
    setHistory(h => [...h, { cards: [...cards], index: currentIndex, removed }])
  }

  function addToBack() {
    if (!currentCard) return
    save()
    const next = [...cards]
    const [card] = next.splice(currentIndex, 1)
    next.push(card)
    setCards(next)
    setCurrentIndex(i => (i >= next.length ? 0 : i))
    setFlipped(false)
  }

  function removeFromDeck() {
    if (!currentCard) return
    save()
    const next = [...cards]
    next.splice(currentIndex, 1)
    setCards(next)
    setRemoved(r => r + 1)
    setCurrentIndex(i => (i >= next.length ? Math.max(0, next.length - 1) : i))
    setFlipped(false)
  }

  function undo() {
    const prev = history[history.length - 1]
    if (!prev) return
    setHistory(h => h.slice(0, -1))
    setCards(prev.cards)
    setCurrentIndex(prev.index)
    setRemoved(prev.removed)
    setFlipped(false)
  }

  if (error) {
    return (
      <div className="app">
        <p className="error">{error}</p>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="app">
        <p className="loading">Loading…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <button
        className="btn-toggle-mode"
        onClick={() => { setDefinitionFirst(d => !d); setFlipped(false) }}
      >
        Show {definitionFirst ? 'term' : 'definition'} first
      </button>
      <div className="stats">
        <span className="progress">{currentIndex + 1} / {cards.length} remaining</span>
        <span className="divider">·</span>
        <span className="success-rate">
          <span className="success-pct">{pct}%</span> mastered
          <span className="success-detail"> ({removed} / {total})</span>
        </span>
      </div>
      {currentCard ? (
        <>
          <Flashcard card={currentCard} flipped={flipped} definitionFirst={definitionFirst} onFlip={() => setFlipped(f => !f)} />
          <div className="buttons">
            <button className="btn-undo" onClick={undo} disabled={history.length === 0}>Undo</button>
            <button className="btn-add-back" onClick={addToBack}>Add to Back</button>
            <button className="btn-remove" onClick={removeFromDeck}>Remove from Deck</button>
          </div>
        </>
      ) : (
        <div className="finished">
          <p className="finished-pct">{pct}%</p>
          <p className="finished-label">mastered — deck complete!</p>
          <span className="finished-detail">{removed} of {total} cards</span>
        </div>
      )}
    </div>
  )
}
