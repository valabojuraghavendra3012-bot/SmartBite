import type { Category, FoodItem, FoodItemDraft, FreshnessStatus } from '../types'

const monthNames = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
const numberWords: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  dozen: 12,
}

export function localDateInput(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateAtLocalMidnight(dateString: string) {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function daysUntil(dateString: string, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = dateAtLocalMidnight(dateString)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function getFreshnessStatus(dateString: string, alertDays = 3): FreshnessStatus {
  const days = daysUntil(dateString)
  if (days < 0) return 'expired'
  if (days <= alertDays) return 'expiring_soon'
  return 'fresh'
}

export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions) {
  if (!dateString) return '—'
  const date = dateAtLocalMidnight(dateString)
  return new Intl.DateTimeFormat('en', options ?? { month: 'short', day: 'numeric' }).format(date)
}

export function relativeExpiry(dateString: string) {
  const days = daysUntil(dateString)
  if (days < 0) return `Expired ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago`
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  if (days <= 3) return `Expires in ${days} days`
  return `Good for ${days} days`
}

export function getExpiryTimeHint(dateString: string) {
  const days = daysUntil(dateString)
  if (days < 0) return 'Past its best'
  if (days === 0) return 'Use today'
  if (days === 1) return 'Use within 24 hours'
  if (days <= 3) return `Use in ${days} days`
  return `${days} days left`
}

export function inferCategory(name: string): Category {
  const text = name.toLowerCase()
  if (/milk|cheese|yogurt|yoghurt|butter|cream|paneer|curd|dairy/.test(text)) return 'dairy'
  if (/spinach|lettuce|kale|broccoli|carrot|tomato|potato|onion|pepper|cucumber|vegetable|greens|cabbage|celery|mushroom/.test(text)) return 'vegetables'
  if (/apple|banana|orange|berry|berries|lemon|lime|grape|mango|pear|peach|fruit|avocado/.test(text)) return 'fruits'
  if (/chicken|beef|pork|fish|salmon|shrimp|prawn|meat|turkey|tofu/.test(text)) return 'meat'
  if (/bread|bagel|muffin|croissant|tortilla|bakery|rolls/.test(text)) return 'bakery'
  if (/rice|pasta|beans|lentil|flour|oil|sugar|oats|cereal|spice|tin|can|pantry|coffee|tea/.test(text)) return 'pantry'
  return 'other'
}

function parseDate(match: string): string | undefined {
  const clean = match.trim().replace(/\.$/, '')
  let date: Date | null = null

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
    const [year, month, day] = clean.split('-').map(Number)
    date = new Date(year, month - 1, day)
  } else if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(clean)) {
    const [first, second, yearPart] = clean.split('/').map(Number)
    const year = yearPart ? (yearPart < 100 ? 2000 + yearPart : yearPart) : new Date().getFullYear()
    // For the quick-entry format, numeric dates are interpreted as month/day.
    date = new Date(year, first - 1, second)
  } else {
    const parsed = new Date(clean)
    if (!Number.isNaN(parsed.getTime())) {
      const includesYear = /\b\d{4}\b/.test(clean)
      date = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
      if (!includesYear) date.setFullYear(new Date().getFullYear())
    }
  }

  if (!date || Number.isNaN(date.getTime())) return undefined
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // A month/day with no year that has already passed is assumed to be next year.
  if (!/\b\d{4}\b/.test(clean) && date < today) date.setFullYear(date.getFullYear() + 1)
  return localDateInput(date)
}

function extractDate(line: string): { date?: string; remaining: string } {
  const patterns = [
    /\b\d{4}-\d{1,2}-\d{1,2}\b/,
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\b/i,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,
  ]
  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match?.[0]) {
      return { date: parseDate(match[0]), remaining: line.replace(match[0], ' ') }
    }
  }
  return { remaining: line }
}

function extractQuantity(text: string): { quantity: number; unit: string; remaining: string } {
  const leading = text.trim().match(/^(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|dozen)\s+([a-z]+)?(?:\s+of)?\s+/i)
  if (!leading) return { quantity: 1, unit: 'item', remaining: text.trim() }
  const rawNumber = leading[1].toLowerCase()
  const quantity = Number(rawNumber) || numberWords[rawNumber] || 1
  const rawUnit = (leading[2] || '').toLowerCase()
  const unit = rawUnit && !['of'].includes(rawUnit) ? rawUnit.replace(/s$/, '') : 'item'
  return { quantity, unit, remaining: text.trim().slice(leading[0].length) }
}

/** Parses the lightweight text formats used by Quick Add. Backend parsing takes precedence when configured. */
export function parseNaturalItemLines(input: string): FoodItemDraft[] {
  return input
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[•*-]\s*/, ''))
    .filter(Boolean)
    .flatMap((line) => {
      const { date, remaining } = extractDate(line)
      if (!date) return []
      const cleanLine = remaining
        .replace(/\b(?:expires?|expiring|expire|by|on)\b/gi, ' ')
        .replace(/[–—,:]+/g, ' ')
        .replace(/\s+-\s+/g, ' ')
        .trim()
      const { quantity, unit, remaining: name } = extractQuantity(cleanLine)
      const normalizedName = name.replace(/\s+/g, ' ').replace(/[-–—,]+$/, '').trim()
      if (!normalizedName) return []
      return [{
        name: normalizedName.replace(/\b\w/g, (char) => char.toUpperCase()),
        quantity,
        unit,
        expiresAt: date,
        category: inferCategory(normalizedName),
      }]
    })
}

export function shortQuantity(item: Pick<FoodItem, 'quantity' | 'unit'>) {
  const quantity = Number.isInteger(item.quantity) ? item.quantity.toString() : item.quantity.toFixed(1)
  const unit = item.unit || 'item'
  if (unit === 'item') return `${quantity} ${Number(item.quantity) === 1 ? 'item' : 'items'}`
  const plural = Number(item.quantity) === 1 || unit.endsWith('s') ? unit : `${unit}s`
  return `${quantity} ${plural}`
}

export function formatCompactDate(dateString: string) {
  const date = dateAtLocalMidnight(dateString)
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

export function getGreetingName(name?: string, email?: string) {
  if (name?.trim()) return name.trim().split(/\s+/)[0]
  if (email) return email.split('@')[0].split(/[._-]/)[0]
  return 'there'
}

export function getCurrentGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function categoryLabel(category: Category) {
  return category === 'meat' ? 'Meat & seafood' : category.charAt(0).toUpperCase() + category.slice(1)
}

export function formatDistanceToNow(dateString: string) {
  const diff = Math.max(0, Date.now() - new Date(dateString).getTime())
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export function buildFoodDraft(overrides: Partial<FoodItemDraft> = {}): FoodItemDraft {
  return {
    name: '',
    quantity: 1,
    unit: 'item',
    expiresAt: localDateInput(),
    category: 'other',
    ...overrides,
  }
}

export const monthAbbreviations = monthNames
