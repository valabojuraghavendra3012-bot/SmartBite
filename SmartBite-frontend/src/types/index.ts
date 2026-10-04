export type Category =
  | 'dairy'
  | 'vegetables'
  | 'fruits'
  | 'meat'
  | 'bakery'
  | 'pantry'
  | 'other'

export type FreshnessStatus = 'fresh' | 'expiring_soon' | 'expired'
export type WasteAction = 'used' | 'donated' | 'composted' | 'expired'
export type SortOption = 'expiry' | 'recent' | 'category' | 'quantity'

export interface User {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
}

export interface FoodItem {
  id: string
  userId?: string
  name: string
  quantity: number
  unit: string
  expiresAt: string
  purchasedAt?: string
  category: Category
  storageLocation?: string
  createdAt: string
  updatedAt?: string
  notes?: string
  weightKg?: number
}

export type NewFoodItem = Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
export type FoodItemDraft = Omit<NewFoodItem, 'purchasedAt' | 'storageLocation' | 'notes' | 'weightKg'>

export interface RecipeIngredient {
  name: string
  quantity?: number
  unit?: string
  itemId?: string
  expiresAt?: string
  fromInventory: boolean
}

export interface Recipe {
  id: string
  name: string
  description?: string
  prepMinutes: number
  difficulty: 'Easy' | 'Medium' | 'A little project'
  servings?: number
  ingredients: RecipeIngredient[]
  missingIngredients: string[]
  instructions: string[]
  expiringIngredientsUsed: string[]
  imageUrl?: string
  source?: 'api' | 'demo'
}

export interface AppNotification {
  id: string
  title: string
  message: string
  type: 'expiry' | 'tip' | 'impact' | 'system'
  createdAt: string
  read: boolean
  itemId?: string
  actionLabel?: string
}

export interface WasteEvent {
  id: string
  itemId?: string
  itemName: string
  action: WasteAction
  quantity: number
  unit: string
  createdAt: string
  estimatedKg?: number
}

export interface MonthlyImpact {
  month: string
  used: number
  donated: number
  composted: number
  expired: number
  estimatedKg?: number
}

export interface DashboardStats {
  totalItems: number
  freshItems: number
  expiringSoon: number
  expired: number
  itemsConsumed: number
  itemsExpired: number
  itemsDonated: number
  itemsComposted: number
  estimatedWastePreventedKg?: number
  monthlyWasteTrend: MonthlyImpact[]
}

export interface NotificationPreferences {
  pushEnabled: boolean
  emailEnabled: boolean
  dailyDigest: boolean
  alertDaysBefore: number
}

export interface AppSettings {
  notificationPreferences: NotificationPreferences
  defaultUnit: 'items' | 'grams' | 'kilograms' | 'cups'
  theme: 'light' | 'system'
  defaultStorageLocation: string
}

export interface ParsedItemsResult {
  items: FoodItemDraft[]
  message?: string
}

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'dairy', label: 'Dairy' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'meat', label: 'Meat & seafood' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'other', label: 'Other' },
]
