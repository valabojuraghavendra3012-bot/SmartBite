import { inferCategory, getFreshnessStatus, parseNaturalItemLines } from '../lib/food'
import { supabase } from '../lib/supabase'
import type {
  AppNotification,
  AppSettings,
  Category,
  DashboardStats,
  FoodItem,
  FoodItemDraft,
  MonthlyImpact,
  NewFoodItem,
  NotificationPreferences,
  ParsedItemsResult,
  Recipe,
  WasteAction,
  WasteEvent,
} from '../types'

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '')
const explicitDemo = import.meta.env.VITE_DEMO_MODE as string | undefined
export const IS_DEMO_MODE = explicitDemo === 'true' || (!configuredApiBase && explicitDemo !== 'false')

const storageKeys = {
  items: 'smartbite.demo.items.v1',
  events: 'smartbite.demo.events.v1',
  readNotifications: 'smartbite.demo.read-notifications.v1',
  deletedNotifications: 'smartbite.demo.deleted-notifications.v1',
  settings: 'smartbite.settings.v1',
}

const defaultPreferences: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: false,
  dailyDigest: true,
  alertDaysBefore: 3,
}

export const defaultSettings: AppSettings = {
  notificationPreferences: defaultPreferences,
  defaultUnit: 'items',
  theme: 'light',
  defaultStorageLocation: 'Fridge',
}

export class ApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const memoryStorage = new Map<string, string>()

function readLocal<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key)
    if (stored) return JSON.parse(stored) as T
  } catch {
    // Sandboxed file previews may block localStorage; keep the demo usable in memory.
  }
  const inMemory = memoryStorage.get(key)
  if (!inMemory) return fallback
  try { return JSON.parse(inMemory) as T } catch { return fallback }
}

function writeLocal<T>(key: string, value: T) {
  const serialized = JSON.stringify(value)
  memoryStorage.set(key, serialized)
  try { window.localStorage.setItem(key, serialized) } catch { /* In-memory demo fallback. */ }
}

async function authHeaders() {
  const headers: Record<string, string> = {}
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`
  }
  return headers
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!configuredApiBase) {
    throw new ApiError('No API URL is configured. Add VITE_API_BASE_URL to connect your FastAPI service.')
  }
  const tokenHeaders = await authHeaders()
  const headers = new Headers(init.headers)
  Object.entries(tokenHeaders).forEach(([key, value]) => headers.set(key, value))
  if (!(init.body instanceof FormData) && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${configuredApiBase}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('We could not reach the SmartBite API. Check your connection and try again.')
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      detail = body.detail || body.message || body.error || detail
    } catch {
      // Keep the useful status fallback if the API did not return JSON.
    }
    if (response.status === 401) detail = 'Your session has expired. Please sign in again.'
    throw new ApiError(detail, response.status)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function pick<T>(object: Record<string, unknown>, camel: string, snake?: string): T | undefined {
  return (object[camel] ?? (snake ? object[snake] : undefined)) as T | undefined
}

function normalizeFoodItem(value: unknown): FoodItem {
  const envelope = (value ?? {}) as Record<string, unknown>
  const nested = envelope.data && typeof envelope.data === 'object' ? envelope.data as Record<string, unknown> : null
  const nestedItem = envelope.item && typeof envelope.item === 'object' ? envelope.item as Record<string, unknown> : null
  const item = nestedItem ?? nested ?? envelope
  const name = String(item.name ?? item.item ?? 'Food item')
  const rawCategory = String(item.category ?? inferCategory(name)).toLowerCase()
  const allowedCategories: Category[] = ['dairy', 'vegetables', 'fruits', 'meat', 'bakery', 'pantry', 'other']
  return {
    id: String(item.id ?? item._id ?? crypto.randomUUID()),
    userId: pick<string>(item, 'userId', 'user_id'),
    name,
    quantity: Number(item.quantity ?? 1),
    unit: String(item.unit ?? 'item'),
    expiresAt: String(pick<string>(item, 'expiresAt', 'expires_at') ?? pick<string>(item, 'expiryDate', 'expiry_date') ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
    purchasedAt: pick<string>(item, 'purchasedAt', 'purchased_at'),
    category: allowedCategories.includes(rawCategory as Category) ? (rawCategory as Category) : inferCategory(name),
    storageLocation: pick<string>(item, 'storageLocation', 'storage_location'),
    createdAt: String(pick<string>(item, 'createdAt', 'created_at') ?? new Date().toISOString()),
    updatedAt: pick<string>(item, 'updatedAt', 'updated_at'),
    notes: typeof item.notes === 'string' ? item.notes : undefined,
    weightKg: Number.isFinite(Number(item.weightKg ?? item.weight_kg)) ? Number(item.weightKg ?? item.weight_kg) : undefined,
  }
}

function normalizeDraft(value: unknown): FoodItemDraft {
  const item = normalizeFoodItem(value)
  return {
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    expiresAt: item.expiresAt,
    category: item.category,
  }
}

function normalizeNotification(value: unknown): AppNotification {
  const item = (value ?? {}) as Record<string, unknown>
  const type = String(item.type ?? 'expiry')
  return {
    id: String(item.id ?? crypto.randomUUID()),
    title: String(item.title ?? 'A pantry update'),
    message: String(item.message ?? item.body ?? ''),
    type: (['expiry', 'tip', 'impact', 'system'].includes(type) ? type : 'system') as AppNotification['type'],
    createdAt: String(pick<string>(item, 'createdAt', 'created_at') ?? new Date().toISOString()),
    read: Boolean(item.read ?? item.is_read ?? false),
    itemId: pick<string>(item, 'itemId', 'item_id'),
    actionLabel: pick<string>(item, 'actionLabel', 'action_label'),
  }
}

function normalizeRecipe(value: unknown): Recipe {
  const recipe = (value ?? {}) as Record<string, unknown>
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.map((value) => {
    if (typeof value === 'string') return { name: value, fromInventory: false }
    const ingredient = value as Record<string, unknown>
    return {
      name: String(ingredient.name ?? ingredient.item ?? 'Ingredient'),
      quantity: ingredient.quantity ? Number(ingredient.quantity) : undefined,
      unit: typeof ingredient.unit === 'string' ? ingredient.unit : undefined,
      itemId: pick<string>(ingredient, 'itemId', 'item_id'),
      expiresAt: pick<string>(ingredient, 'expiresAt', 'expires_at'),
      fromInventory: Boolean(ingredient.fromInventory ?? ingredient.from_inventory ?? ingredient.itemId ?? ingredient.item_id),
    }
  }) : []
  const difficulty = String(recipe.difficulty ?? 'Easy')
  const missingRaw = recipe.missingIngredients ?? recipe.missing_ingredients
  const expiringRaw = recipe.expiringIngredientsUsed ?? recipe.expiring_ingredients_used
  return {
    id: String(recipe.id ?? crypto.randomUUID()),
    name: String(recipe.name ?? 'A little something from your pantry'),
    description: typeof recipe.description === 'string' ? recipe.description : undefined,
    prepMinutes: Number(recipe.prepMinutes ?? recipe.prep_minutes ?? 15),
    difficulty: (['Easy', 'Medium', 'A little project'].includes(difficulty) ? difficulty : 'Easy') as Recipe['difficulty'],
    servings: Number(recipe.servings ?? 2),
    ingredients,
    missingIngredients: Array.isArray(missingRaw) ? missingRaw.map(String) : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions.map(String) : [],
    expiringIngredientsUsed: Array.isArray(expiringRaw) ? expiringRaw.map(String) : [],
    imageUrl: typeof recipe.imageUrl === 'string' ? recipe.imageUrl : undefined,
    source: 'api',
  }
}

function asList<T>(response: unknown, key: string): T[] {
  if (Array.isArray(response)) return response as T[]
  const object = response as Record<string, unknown> | null
  const nested = object?.data
  const nestedObject = nested && typeof nested === 'object' ? nested as Record<string, unknown> : null
  const value = object?.[key] ?? nestedObject?.[key] ?? nested
  return Array.isArray(value) ? (value as T[]) : []
}

function getLocalItems() {
  return readLocal<FoodItem[]>(storageKeys.items, [])
}

function getLocalEvents() {
  return readLocal<WasteEvent[]>(storageKeys.events, [])
}

function monthSeries(events: WasteEvent[]): MonthlyImpact[] {
  const now = new Date()
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthEvents = events.filter((event) => event.createdAt.slice(0, 7) === key)
    const value: MonthlyImpact = {
      month: date.toLocaleDateString('en', { month: 'short' }),
      used: monthEvents.filter((event) => event.action === 'used').length,
      donated: monthEvents.filter((event) => event.action === 'donated').length,
      composted: monthEvents.filter((event) => event.action === 'composted').length,
      expired: monthEvents.filter((event) => event.action === 'expired').length,
    }
    const knownKg = monthEvents.reduce((total, event) => total + (event.estimatedKg ?? 0), 0)
    if (knownKg > 0) value.estimatedKg = knownKg
    return value
  })
}

function localDashboardStats(): DashboardStats {
  const items = getLocalItems()
  const events = getLocalEvents()
  const eventCount = (action: WasteAction) => events.filter((event) => event.action === action).length
  const weightedEstimate = events.reduce((total, event) => total + (event.estimatedKg ?? 0), 0)
  const hasEstimate = events.some((event) => typeof event.estimatedKg === 'number')
  return {
    totalItems: items.length,
    freshItems: items.filter((item) => getFreshnessStatus(item.expiresAt) === 'fresh').length,
    expiringSoon: items.filter((item) => getFreshnessStatus(item.expiresAt) === 'expiring_soon').length,
    expired: items.filter((item) => getFreshnessStatus(item.expiresAt) === 'expired').length,
    itemsConsumed: eventCount('used'),
    itemsExpired: eventCount('expired'),
    itemsDonated: eventCount('donated'),
    itemsComposted: eventCount('composted'),
    estimatedWastePreventedKg: hasEstimate ? weightedEstimate : undefined,
    monthlyWasteTrend: monthSeries(events),
  }
}

function localNotifications(): AppNotification[] {
  const items = getLocalItems()
  const settings = readLocal<AppSettings>(storageKeys.settings, defaultSettings)
  const readIds = readLocal<string[]>(storageKeys.readNotifications, [])
  const deletedIds = readLocal<string[]>(storageKeys.deletedNotifications, [])
  return items
    .filter((item) => getFreshnessStatus(item.expiresAt, settings.notificationPreferences.alertDaysBefore) !== 'fresh')
    .map((item) => {
      const status = getFreshnessStatus(item.expiresAt, settings.notificationPreferences.alertDaysBefore)
      const days = Math.round((new Date(`${item.expiresAt}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000)
      const detail = status === 'expired'
        ? `${item.name} passed its best-before date. Check it before you decide what to do.`
        : days === 0
          ? `${item.name} is best used today. Could it become tonight's dinner?`
          : `${item.name} is coming up soon. There's still time to use or share it.`
      return {
        id: `expiry-${item.id}`,
        title: status === 'expired' ? `${item.name} needs a quick check` : `${item.name} is coming up soon`,
        message: detail,
        type: 'expiry' as const,
        createdAt: item.updatedAt ?? item.createdAt,
        read: readIds.includes(`expiry-${item.id}`),
        itemId: item.id,
        actionLabel: status === 'expired' ? 'Review item' : 'Find a recipe',
      }
    })
    .filter((notification) => !deletedIds.includes(notification.id))
    .sort((a, b) => Number(a.read) - Number(b.read))
}

function localRecipeSuggestions(): Recipe[] {
  const items = getLocalItems().sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
  const usableItems = items.filter((item) => getFreshnessStatus(item.expiresAt) !== 'expired')
  if (!usableItems.length) return []
  const expiring = usableItems.filter((item) => getFreshnessStatus(item.expiresAt) === 'expiring_soon')
  const picked = (expiring.length ? expiring : usableItems).slice(0, 4)
  const ingredientNames = picked.map((item) => item.name)
  const recipeName = picked.some((item) => /spinach|greens|kale/i.test(item.name))
    ? 'A little greener, use-it-up skillet'
    : picked.some((item) => /bread|toast|bagel/i.test(item.name))
      ? 'The last-slice pantry toast'
      : 'Your fridge-first kitchen bowl'
  return [{
    id: 'demo-recipe-use-it-up',
    name: recipeName,
    description: `A flexible starting point built around ${ingredientNames.slice(0, 2).join(' and ')}. Adjust it to what you love.`,
    prepMinutes: 15,
    difficulty: 'Easy',
    servings: 2,
    ingredients: picked.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      itemId: item.id,
      expiresAt: item.expiresAt,
      fromInventory: true,
    })),
    missingIngredients: [],
    instructions: [
      `Gather and prep ${ingredientNames.join(', ')}. Use your judgment for anything that needs cooking first.`,
      'Warm a pan or bowl with a little oil, broth, or a sauce you already enjoy.',
      'Combine the ingredients that cook at a similar pace, season to taste, and serve while fresh.',
    ],
    expiringIngredientsUsed: picked.filter((item) => getFreshnessStatus(item.expiresAt) !== 'fresh').map((item) => item.name),
    source: 'demo',
  }]
}

function normalizeStats(value: unknown): DashboardStats {
  const envelope = (value ?? {}) as Record<string, unknown>
  const source = envelope.data && typeof envelope.data === 'object' ? envelope.data as Record<string, unknown> : envelope
  const trend = source.monthlyWasteTrend ?? source.monthly_waste_trend ?? source.monthly ?? []
  const maybeKg = source.estimatedWastePreventedKg ?? source.estimated_waste_prevented_kg
  return {
    totalItems: Number(source.totalItems ?? source.total_items ?? 0),
    freshItems: Number(source.freshItems ?? source.fresh_items ?? 0),
    expiringSoon: Number(source.expiringSoon ?? source.expiring_soon ?? 0),
    expired: Number(source.expired ?? source.expired_items ?? 0),
    itemsConsumed: Number(source.itemsConsumed ?? source.items_consumed ?? source.used ?? 0),
    itemsExpired: Number(source.itemsExpired ?? source.items_expired ?? source.expired_count ?? 0),
    itemsDonated: Number(source.itemsDonated ?? source.items_donated ?? source.donated ?? 0),
    itemsComposted: Number(source.itemsComposted ?? source.items_composted ?? source.composted ?? 0),
    estimatedWastePreventedKg: maybeKg == null ? undefined : Number(maybeKg),
    monthlyWasteTrend: Array.isArray(trend) ? trend.map((row: Record<string, unknown>) => ({
      month: String(row.month ?? row.label ?? ''),
      used: Number(row.used ?? row.consumed ?? 0),
      donated: Number(row.donated ?? 0),
      composted: Number(row.composted ?? 0),
      expired: Number(row.expired ?? 0),
      estimatedKg: row.estimatedKg == null && row.estimated_kg == null ? undefined : Number(row.estimatedKg ?? row.estimated_kg),
    })) : [],
  }
}

function normalizeParsedResult(response: unknown): ParsedItemsResult {
  const envelope = (response ?? {}) as Record<string, unknown>
  const payload = (envelope.data ?? envelope) as Record<string, unknown>
  const rawItems = Array.isArray(response) ? response : (payload.items ?? payload.parsed_items ?? [])
  const message = payload.message ?? envelope.message
  return {
    items: Array.isArray(rawItems) ? rawItems.map(normalizeDraft) : [],
    message: typeof message === 'string' ? message : undefined,
  }
}

export const api = {
  async getItems(): Promise<FoodItem[]> {
    if (IS_DEMO_MODE) return getLocalItems().sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
    const response = await request<unknown>('/items')
    return asList<unknown>(response, 'items').map(normalizeFoodItem).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
  },

  async getItem(id: string): Promise<FoodItem> {
    if (IS_DEMO_MODE) {
      const item = getLocalItems().find((value) => value.id === id)
      if (!item) throw new ApiError('This item could not be found.', 404)
      return item
    }
    return normalizeFoodItem(await request<unknown>(`/items/${encodeURIComponent(id)}`))
  },

  async createItem(item: NewFoodItem): Promise<FoodItem> {
    if (IS_DEMO_MODE) {
      const created: FoodItem = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
      writeLocal(storageKeys.items, [...getLocalItems(), created])
      return created
    }
    const response = await request<unknown>('/items', {
      method: 'POST',
      body: JSON.stringify({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expires_at: item.expiresAt,
        category: item.category,
        purchased_at: item.purchasedAt,
        storage_location: item.storageLocation,
        notes: item.notes,
        weight_kg: item.weightKg,
      }),
    })
    return normalizeFoodItem(response)
  },

  async updateItem(id: string, changes: Partial<NewFoodItem>): Promise<FoodItem> {
    if (IS_DEMO_MODE) {
      const updated = getLocalItems().map((item) => item.id === id ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item)
      const result = updated.find((item) => item.id === id)
      if (!result) throw new ApiError('This item could not be found.', 404)
      writeLocal(storageKeys.items, updated)
      return result
    }
    const payload = Object.fromEntries(Object.entries(changes).map(([key, value]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), value,
    ]))
    return normalizeFoodItem(await request<unknown>(`/items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }))
  },

  async deleteItem(id: string): Promise<void> {
    if (IS_DEMO_MODE) {
      writeLocal(storageKeys.items, getLocalItems().filter((item) => item.id !== id))
      return
    }
    await request<void>(`/items/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  async applyItemAction(id: string, action: WasteAction): Promise<WasteEvent> {
    if (IS_DEMO_MODE) {
      const items = getLocalItems()
      const item = items.find((value) => value.id === id)
      if (!item) throw new ApiError('This item could not be found.', 404)
      const event: WasteEvent = {
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        action,
        quantity: item.quantity,
        unit: item.unit,
        createdAt: new Date().toISOString(),
        estimatedKg: item.weightKg,
      }
      writeLocal(storageKeys.events, [...getLocalEvents(), event])
      writeLocal(storageKeys.items, items.filter((value) => value.id !== id))
      return event
    }
    const response = await request<Record<string, unknown>>(`/items/${encodeURIComponent(id)}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
    const itemName = String(response.item_name ?? response.itemName ?? 'Food item')
    return {
      id: String(response.id ?? crypto.randomUUID()),
      itemId: id,
      itemName,
      action,
      quantity: Number(response.quantity ?? 1),
      unit: String(response.unit ?? 'item'),
      createdAt: String(response.created_at ?? response.createdAt ?? new Date().toISOString()),
      estimatedKg: response.estimated_kg == null ? undefined : Number(response.estimated_kg),
    }
  },

  async parseText(text: string): Promise<ParsedItemsResult> {
    if (IS_DEMO_MODE) return { items: parseNaturalItemLines(text) }
    return normalizeParsedResult(await request<unknown>('/items/parse', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }))
  },

  async parseVoice(transcript: string): Promise<ParsedItemsResult> {
    if (IS_DEMO_MODE) return { items: parseNaturalItemLines(transcript) }
    return normalizeParsedResult(await request<unknown>('/items/voice', {
      method: 'POST',
      body: JSON.stringify({ transcript, text: transcript }),
    }))
  },

  async parseReceipt(file: File): Promise<ParsedItemsResult> {
    if (IS_DEMO_MODE) {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        return { items: parseNaturalItemLines(await file.text()) }
      }
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const rows = (await file.text()).split(/\r?\n/).filter(Boolean).slice(1)
        const items = rows.flatMap((row) => {
          const [name, quantity, expiresAt, category] = row.split(',').map((part) => part.trim())
          if (!name || !expiresAt) return []
          return [{ name, quantity: Number(quantity) || 1, unit: 'item', expiresAt, category: (category || inferCategory(name)) as Category }]
        })
        return { items, message: items.length ? 'Receipt rows ready to review.' : 'No complete rows found. Add a name and expiry date to each CSV row.' }
      }
      throw new ApiError('Receipt OCR needs the FastAPI receipt service. You can still try the capture flow here, or add a line by text.')
    }
    const body = new FormData()
    body.append('file', file)
    return normalizeParsedResult(await request<unknown>('/items/receipt', { method: 'POST', body }))
  },

  async getDashboardStats(): Promise<DashboardStats> {
    if (IS_DEMO_MODE) return localDashboardStats()
    return normalizeStats(await request<unknown>('/analytics'))
  },

  async getAnalytics(): Promise<DashboardStats> {
    if (IS_DEMO_MODE) return localDashboardStats()
    return normalizeStats(await request<unknown>('/analytics'))
  },

  async getRecipes(): Promise<Recipe[]> {
    if (IS_DEMO_MODE) return localRecipeSuggestions()
    const response = await request<unknown>('/recipes?include_near_expiry=true')
    return asList<unknown>(response, 'recipes').map(normalizeRecipe)
  },

  async getNotifications(): Promise<AppNotification[]> {
    if (IS_DEMO_MODE) return localNotifications()
    const response = await request<unknown>('/notifications')
    return asList<unknown>(response, 'notifications').map(normalizeNotification)
  },

  async markNotificationRead(id: string): Promise<void> {
    if (IS_DEMO_MODE) {
      const read = readLocal<string[]>(storageKeys.readNotifications, [])
      if (!read.includes(id)) writeLocal(storageKeys.readNotifications, [...read, id])
      return
    }
    await request<void>(`/notifications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    })
  },

  async deleteNotification(id: string): Promise<void> {
    if (IS_DEMO_MODE) {
      const deleted = readLocal<string[]>(storageKeys.deletedNotifications, [])
      if (!deleted.includes(id)) writeLocal(storageKeys.deletedNotifications, [...deleted, id])
      return
    }
    await request<void>(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  async getSettings(): Promise<AppSettings> {
    if (IS_DEMO_MODE) return readLocal<AppSettings>(storageKeys.settings, defaultSettings)
    const response = await request<Partial<AppSettings>>('/settings')
    return {
      ...defaultSettings,
      ...response,
      notificationPreferences: { ...defaultPreferences, ...response.notificationPreferences },
    }
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    if (IS_DEMO_MODE) {
      writeLocal(storageKeys.settings, settings)
      return settings
    }
    const response = await request<Partial<AppSettings>>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
    return { ...settings, ...response, notificationPreferences: { ...settings.notificationPreferences, ...response.notificationPreferences } }
  },
}
