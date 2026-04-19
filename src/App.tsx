import { useEffect, useRef, useState } from 'react'
import type { Card } from './deck'
import Flashcard from './Flashcard'
import { parseCSV } from './parseCSV'
import './App.css'

const INITIAL_BATCH = 5
const INTRODUCE_BATCH = 3
const THRESHOLD = 0.7

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
  const [notification, setNotification] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const originalCardsRef = useRef<Card[]>([])
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/flashcards.csv')
      .then(res => {
        if (!res.ok) throw new Error(`Could not load flashcards.csv (${res.status})`)
        return res.text()
      })
      .then(text => {
        const parsed = parseCSV(text)
        if (parsed.length === 0) throw new Error('No valid cards found in flashcards.csv')
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

  function notify(msg: string) {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    setNotification(msg)
    notifTimerRef.current = setTimeout(() => setNotification(null), 2500)
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY)
    const original = originalCardsRef.current
    setCards(original.slice(0, INITIAL_BATCH))
    setQueue(original.slice(INITIAL_BATCH))
    setTotal(original.length)
    setRemoved(0)
    setCurrentIndex(0)
    setHistory([])
    setFlipped(false)
    setDefinitionFirst(false)
    setNotification(null)
  }

  const currentCard = cards[currentIndex] ?? null
  const introduced = removed + cards.length
  const pct = total === 0 ? 0 : Math.round((removed / total) * 100)
  const introPct = introduced === 0 ? 0 : Math.round((removed / introduced) * 100)

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
    const newRemoved = removed + 1

    // Check if success rate crosses threshold — if so, introduce next batch
    const newIntroduced = newRemoved + next.length
    const rate = newIntroduced === 0 ? 0 : newRemoved / newIntroduced
    let finalCards = next
    let finalQueue = queue
    if (rate >= THRESHOLD && queue.length > 0) {
      const batch = queue.slice(0, INTRODUCE_BATCH)
      finalQueue = queue.slice(INTRODUCE_BATCH)
      finalCards = [...next, ...batch]
      notify(`+${batch.length} new card${batch.length === 1 ? '' : 's'} introduced`)
    }

    setCards(finalCards)
    setQueue(finalQueue)
    setRemoved(newRemoved)
    setCurrentIndex(i => (i >= finalCards.length ? Math.max(0, finalCards.length - 1) : i))
    setFlipped(false)
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
      {notification && <div className="notification">{notification}</div>}
      <button
        className="btn-toggle-mode"
        onClick={() => { setDefinitionFirst(d => !d); setFlipped(false) }}
      >
        Show {definitionFirst ? 'term' : 'definition'} first
      </button>
      <div className="stats">
        <span className="progress">{currentIndex + 1} / {cards.length} active</span>
        <span className="divider">·</span>
        <span className="success-rate">
          <span className="success-pct">{introPct}%</span> of introduced
          <span className="success-detail"> ({removed} / {introduced})</span>
        </span>
        {queue.length > 0 && (
          <>
            <span className="divider">·</span>
            <span className="queue-count">{queue.length} in queue</span>
          </>
        )}
        {queue.length === 0 && (
          <>
            <span className="divider">·</span>
            <span className="overall-pct">{pct}% overall</span>
          </>
        )}
      </div>
      {currentCard ? (
        <>
          <Flashcard card={currentCard} flipped={flipped} definitionFirst={definitionFirst} onFlip={() => setFlipped(f => !f)} />
          <div className="buttons">
            <button className="btn-undo" onClick={undo} disabled={history.length === 0}>Undo</button>
            <button className="btn-add-back" onClick={addToBack}>Add to Back</button>
            <button className="btn-remove" onClick={removeFromDeck}>Remove from Deck</button>
            <button className="btn-reset" onClick={reset}>Reset</button>
          </div>
          {queue.length > 0 && (
            <p className="intro-hint">
              Master {Math.ceil(introduced * THRESHOLD) - removed} more to unlock {Math.min(INTRODUCE_BATCH, queue.length)} new card{Math.min(INTRODUCE_BATCH, queue.length) === 1 ? '' : 's'}
            </p>
          )}
        </>
      ) : (
        <div className="finished">
          <p className="finished-pct">{pct}%</p>
          <p className="finished-label">mastered — deck complete!</p>
          <span className="finished-detail">{removed} of {total} cards</span>
          <button className="btn-reset" onClick={reset}>Reset</button>
        </div>
      )}
    </div>
  )
}
