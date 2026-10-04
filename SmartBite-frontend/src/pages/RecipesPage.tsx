import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Clock3, Leaf, Plus, Sparkles, Utensils } from 'lucide-react'
import { api } from '../services/api'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import type { FoodItem, Recipe } from '../types'
import { getExpiryTimeHint, getFreshnessStatus } from '../lib/food'
import { EmptyState, ErrorState, SectionHeader, LoadingState, ConfirmDialog } from '../components/Common'
import { RecipeCard } from '../components/SmartComponents'
import { useQuickAdd } from '../components/Layout'

export function RecipesPage() {
  const { items, performAction } = useAppData()
  const { toast } = useToast()
  const openQuickAdd = useQuickAdd()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [cooking, setCooking] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try { setRecipes(await api.getRecipes()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not find recipe ideas right now.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [items.length])

  const useFirst = useMemo(() => items.filter((item) => getFreshnessStatus(item.expiresAt) === 'expiring_soon').sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)), [items])
  const recipeInventoryItems = (recipe: Recipe) => recipe.ingredients.map((ingredient) => ingredient.itemId).filter((id): id is string => Boolean(id)).map((id) => items.find((item) => item.id === id)).filter((item): item is FoodItem => Boolean(item))

  const cookThis = async () => {
    if (!selectedRecipe) return
    setCooking(true)
    try {
      const toMark = recipeInventoryItems(selectedRecipe)
      await Promise.all(toMark.map((item) => performAction(item.id, 'used')))
      toast(toMark.length ? `${toMark.length} ${toMark.length === 1 ? 'ingredient' : 'ingredients'} marked as used. Enjoy!` : 'Enjoy cooking — your recipe is ready.', 'success')
      setSelectedRecipe(null)
      await load()
    } catch (reason) { toast(reason instanceof Error ? reason.message : 'Could not update those ingredients.', 'error') }
    finally { setCooking(false) }
  }

  return (
    <div className="animate-in">
      <SectionHeader eyebrow="Good food, good ideas" title="Recipes" description="Ideas that start with what’s already in your kitchen — especially what needs using first." action={<button onClick={openQuickAdd} className="btn-secondary !min-h-[41px] !rounded-[11px] !px-3.5 !py-2 !text-xs"><Plus size={14} />Add ingredients</button>} />

      {useFirst.length > 0 && <section className="relative mb-5 overflow-hidden rounded-[21px] bg-[#eaf2e8] p-4 sm:p-5"><div className="absolute -right-5 -top-12 h-36 w-36 rounded-full border-[22px] border-white/20" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/85 text-[#4d8058]"><Sparkles size={17} /></span><div><p className="font-display text-[15px] font-extrabold tracking-[-.03em] text-[#355640]">Use these first</p><p className="mt-1 text-xs leading-5 text-[#7b8d7b]">A few things are getting close to their best-by date.</p><div className="mt-2 flex flex-wrap gap-1.5">{useFirst.slice(0, 4).map((item) => <span key={item.id} className="rounded-full border border-white/75 bg-white/65 px-2.5 py-1 text-[10px] font-bold text-[#5e795e]">{item.name} · {getExpiryTimeHint(item.expiresAt).toLowerCase()}</span>)}</div></div></div><Link to="/app/inventory?filter=expiring" className="relative inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-[#c9dbc7] bg-white px-3.5 text-[11px] font-bold text-[#47724d] hover:bg-[#fcfefb]">View pantry <ArrowRight size={13} /></Link></div></section>}

      {error && <div className="mb-5"><ErrorState message={error} onRetry={() => void load()} /></div>}
      <div className="mb-4 flex items-center justify-between gap-3"><div><p className="eyebrow">Made for your pantry</p><h2 className="mt-1 font-display text-[18px] font-extrabold tracking-[-.04em] text-[#304638]">A few ideas to try</h2></div><span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f5ee] px-3 py-1.5 text-[10px] font-bold text-[#65806a]"><Leaf size={12} />{recipes.length} suggestions</span></div>
      {loading ? <LoadingState label="Finding ideas for your ingredients…" /> : recipes.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onCook={setSelectedRecipe} />)}</div> : items.length === 0 ? <EmptyState icon={Utensils} title="Good recipes start with what you have" description="Add a few ingredients to your kitchen and SmartBite can find ideas that make the most of them." action={<button onClick={openQuickAdd} className="btn-primary !text-xs"><Plus size={14} />Add ingredients</button>} /> : <EmptyState icon={Sparkles} title="No recipe suggestions just yet" description="Your recipe service will use near-expiry ingredients to find relevant ideas. Try refreshing, or add a couple more items to your pantry." action={<div className="flex flex-wrap justify-center gap-2"><button onClick={() => void load()} className="btn-secondary !text-xs">Try again</button><button onClick={() => navigate('/app/inventory')} className="btn-primary !text-xs">View inventory <ArrowRight size={13} /></button></div>} />}

      {recipes.length > 0 && <p className="mt-4 flex items-start gap-2 rounded-xl border border-[#e7ece5] bg-white px-3.5 py-3 text-[10px] leading-4 text-[#89958d]"><Clock3 size={13} className="mt-0.5 shrink-0 text-[#7e9a7b]" />Use your judgment when cooking. Recipe suggestions don't replace food-safety guidance, and you can always swap ingredients to suit your kitchen.</p>}
      <ConfirmDialog open={Boolean(selectedRecipe)} title="Ready to cook?" message={selectedRecipe ? `This will mark ${recipeInventoryItems(selectedRecipe).length} inventory ${recipeInventoryItems(selectedRecipe).length === 1 ? 'ingredient' : 'ingredients'} as used. You can change those entries later if needed.` : ''} confirmLabel="Let's cook" loading={cooking} onCancel={() => setSelectedRecipe(null)} onConfirm={() => void cookThis()} />
    </div>
  )
}
