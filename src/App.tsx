import { useEffect, useRef, useState } from 'react'
import type { Card } from './deck'
import Flashcard from './Flashcard'
import { parseCSV } from './parseCSV'
import './App.css'

const INITIAL_BATCH = 5
const DRAW_BATCH = 3

type Snapshot = { cards: Card[]; queue: Card[]; index: number; removed: number }

type PersistedState = {
  cards: Card[]
  queue: Card[]
  total: number
  removed: number
  currentIndex: number
  history: Snapshot[]
  definitionFirst: boolean
}

const STORAGE_KEY = 'flashcards-state'

function loadSaved(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : null
  } catch {
    return null
  }
}

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [queue, setQueue] = useState<Card[]>([])
  const [total, setTotal] = useState(0)
  const [removed, setRemoved] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [flipped, setFlipped] = useState(false)
  const [definitionFirst, setDefinitionFirst] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const originalCardsRef = useRef<Card[]>([])

  useEffect(() => {
    fetch('/flashcards.csv')
      .then(res => {
        if (!res.ok) throw new Error(`Could not load flashcards.csv (${res.status})`)
        return res.text()
      })
      .then(text => {
        const parsed = parseCSV(text)
        if (parsed.length === 0) throw new Error('No valid cards found in flashcards.csv')
        for (let i = parsed.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [parsed[i], parsed[j]] = [parsed[j], parsed[i]]
        }
        originalCardsRef.current = parsed
        const saved = loadSaved()
        if (saved && saved.total === parsed.length) {
          setCards(saved.cards)
          setQueue(saved.queue ?? [])
          setTotal(saved.total)
          setRemoved(saved.removed)
          setCurrentIndex(saved.currentIndex)
          setHistory(saved.history)
          setDefinitionFirst(saved.definitionFirst)
        } else {
          setCards(parsed.slice(0, INITIAL_BATCH))
          setQueue(parsed.slice(INITIAL_BATCH))
          setTotal(parsed.length)
        }
      })
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    if (total === 0) return
    const state: PersistedState = { cards, queue, total, removed, currentIndex, history, definitionFirst }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [cards, queue, total, removed, currentIndex, history, definitionFirst])

  function reset() {
    localStorage.removeItem(STORAGE_KEY)
    window.location.reload()
  }

  const currentCard = cards[currentIndex] ?? null
  const active = removed + cards.length

  function save() {
    setHistory(h => [...h, { cards: [...cards], queue: [...queue], index: currentIndex, removed }])
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

  function drawFromQueue() {
    if (queue.length === 0) return
    save()
    const batch = queue.slice(0, DRAW_BATCH)
    setCards(c => [...c, ...batch])
    setQueue(q => q.slice(DRAW_BATCH))
  }

  function undo() {
    const prev = history[history.length - 1]
    if (!prev) return
    setHistory(h => h.slice(0, -1))
    setCards(prev.cards)
    setQueue(prev.queue)
    setCurrentIndex(prev.index)
    setRemoved(prev.removed)
    setFlipped(false)
  }

  if (error) return <div className="app"><p className="error">{error}</p></div>
  if (total === 0) return <div className="app"><p className="loading">Loading…</p></div>

  return (
    <div className="app">
      <button
        className="btn-toggle-mode"
        onClick={() => { setDefinitionFirst(d => !d); setFlipped(false) }}
      >
        Show {definitionFirst ? 'term' : 'definition'} first
      </button>

      <div className="stats">
        <span>{active} active</span>
        <span className="divider">·</span>
        <span>{removed} mastered</span>
        <span className="divider">·</span>
        <span>{total} total</span>
      </div>

      {currentCard ? (
        <>
          <Flashcard
            card={currentCard}
            flipped={flipped}
            definitionFirst={definitionFirst}
            onFlip={() => setFlipped(f => !f)}
            onSwipeLeft={addToBack}
            onSwipeRight={removeFromDeck}
          />
          <div className="buttons">
            <button className="btn-undo"  onClick={undo}          disabled={history.length === 0}>Undo</button>
            <button className="btn-draw"  onClick={drawFromQueue} disabled={queue.length === 0}>Draw {Math.min(DRAW_BATCH, queue.length)}</button>
            <button className="btn-reset" onClick={reset}>Reset</button>
          </div>
        </>
      ) : (
        <div className="finished">
          <p className="finished-pct">{Math.round((removed / total) * 100)}%</p>
          <p className="finished-label">mastered</p>
          <span className="finished-detail">{removed} of {total} cards</span>
          <div className="buttons">
            <button className="btn-draw"  onClick={drawFromQueue} disabled={queue.length === 0}>Draw {Math.min(DRAW_BATCH, queue.length)}</button>
            <button className="btn-reset" onClick={reset}>Reset</button>
          </div>
        </div>
      )}
    </div>
  )
}
