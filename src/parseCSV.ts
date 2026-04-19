import Papa from 'papaparse'
import type { Card } from './deck'

export type LeveledCard = Card & { level: number }

export function parseCSV(text: string): LeveledCard[] {
  const { data } = Papa.parse<string[]>(text, { skipEmptyLines: true })
  const rows = data[0]?.[0]?.toLowerCase() === 'term' ? data.slice(1) : data
  return rows
    .filter(row => row.length >= 2 && row[0].trim() && row[1].trim())
    .map(row => ({
      term:       row[0].trim(),
      definition: row[1].trim(),
      level:      row[2] ? (parseInt(row[2].trim(), 10) || 1) : 1,
    }))
}
