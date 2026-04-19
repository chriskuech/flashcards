
export type Card = {
    term: string
    definition: string
}

export class Deck {

    private cards: Card[]
    private currentCardIndex = 0
    private history: Array<{ cards: Card[]; index: number }> = []

    constructor(cards: Card[] = []) {
        this.cards = [...cards]
    }

    get size() {
        return this.cards.length
    }

    currentCard(): Card | null {
        return this.cards[this.currentCardIndex] ?? null
    }

    private saveHistory() {
        this.history.push({ cards: [...this.cards], index: this.currentCardIndex })
    }

    addToBack() {
        if (!this.currentCard()) return
        this.saveHistory()
        const [card] = this.cards.splice(this.currentCardIndex, 1)
        this.cards.push(card)
        if (this.currentCardIndex >= this.cards.length) this.currentCardIndex = 0
    }

    removeFromDeck() {
        if (!this.currentCard()) return
        this.saveHistory()
        this.cards.splice(this.currentCardIndex, 1)
        if (this.currentCardIndex >= this.cards.length) {
            this.currentCardIndex = Math.max(0, this.cards.length - 1)
        }
    }

    undo() {
        const prev = this.history.pop()
        if (!prev) return
        this.cards = prev.cards
        this.currentCardIndex = prev.index
    }

    canUndo() {
        return this.history.length > 0
    }

    nextCard() {
        if (this.cards.length === 0) return
        this.currentCardIndex = (this.currentCardIndex + 1) % this.cards.length
    }
}
