import type { Card } from './deck'

/** Parse a two-column CSV (term, definition) into Card[].
 *  - First row is skipped if it looks like a header (case-insensitive "term").
 *  - Supports RFC 4180 quoted fields (commas and newlines inside quotes).
 */
export function parseCSV(text: string): Card[] {
  const rows = splitRows(text)
  const cards: Card[] = []

  for (let i = 0; i < rows.length; i++) {
    const cols = splitRow(rows[i])
    if (cols.length < 2) continue

    const term = cols[0].trim()
    const definition = cols[1].trim()

    // Skip empty rows and header row
    if (!term || !definition) continue
    if (i === 0 && term.toLowerCase() === 'term') continue

    cards.push({ term, definition })
  }

  return cards
}

/** Split CSV text into rows, respecting quoted newlines. */
function splitRows(text: string): string[] {
  const rows: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      rows.push(current)
      current = ''
    } else {
      current += ch
    }
  }

  if (current) rows.push(current)
  return rows
}

/** Split a single CSV row into columns, respecting quoted commas. */
function splitRow(row: string): string[] {
  const cols: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(current)
      current = ''
    } else {
      current += ch
    }
  }

  cols.push(current)
  return cols
}
