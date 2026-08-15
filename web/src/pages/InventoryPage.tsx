import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArchiveBoxIcon, ArrowTrendingDownIcon, MagnifyingGlassIcon, PlusIcon, ShoppingCartIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { SparePart } from '../types/inventory';
import { useAuthStore } from '../stores/authStore';
import ReceiveStockModal from '../components/ReceiveStockModal';

const currency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

function stockState(part: SparePart) {
  if (part.current_quantity <= 0) return { label: 'Out of stock', tone: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' };
  if (part.current_quantity <= part.reorder_level) return { label: 'Needs reorder', tone: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' };
  return { label: 'Healthy', tone: 'bg-lime-50 text-lime-700 border-lime-100', dot: 'bg-lime-500' };
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [receiveStockPart, setReceiveStockPart] = useState<SparePart | null>(null);

  const partsQuery = useQuery<SparePart[]>({
    queryKey: ['spare-parts', category, search, lowStockOnly, user?.tenantId],
    enabled: Boolean(user?.tenantId),
    queryFn: async () => {
      let query = supabase.from('spare_parts').select('*, vendors(vendor_name)').eq('tenant_id', user!.tenantId).order('part_number', { ascending: true });
      if (category !== 'all') query = query.eq('category', category);
      if (search.trim()) query = query.or(`part_number.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      const result = (data || []) as SparePart[];
      return lowStockOnly ? result.filter((part) => part.current_quantity <= part.reorder_level) : result;
    },
  });

  const categoriesQuery = useQuery<string[]>({
    queryKey: ['part-categories', user?.tenantId],
    enabled: Boolean(user?.tenantId),
    queryFn: async () => {
      const { data, error } = await supabase.from('spare_parts').select('category').eq('tenant_id', user!.tenantId).order('category');
      if (error) throw error;
      return Array.from(new Set((data || []).map((item: { category: string }) => item.category).filter(Boolean)));
    },
  });

  const parts = partsQuery.data || [];
  const hasFilters = Boolean(search.trim() || category !== 'all' || lowStockOnly);
  const totalValue = useMemo(() => parts.reduce((sum, part) => sum + part.current_quantity * part.unit_cost, 0), [parts]);
  const lowStockCount = parts.filter((part) => part.current_quantity <= part.reorder_level).length;
  const totalUnits = parts.reduce((sum, part) => sum + part.current_quantity, 0);

  return (
    <div className="min-h-screen bg-transparent">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-5 px-4 py-7 sm:px-6 lg:px-10">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-indigo-600"><ArchiveBoxIcon className="h-4 w-4" /> Parts intelligence</div><h1 className="text-slate-950 dark:text-white">Inventory control</h1><p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">Keep every workshop moving with a live view of critical parts, stock risk, and purchasing actions.</p></div>
          <div className="flex flex-wrap gap-3"><button onClick={() => navigate('/inventory/purchase-orders')} className="btn-secondary"><ShoppingCartIcon className="h-4 w-4" /> Purchase orders</button><button onClick={() => navigate('/inventory/parts/new')} className="btn-primary"><PlusIcon className="h-4 w-4" /> Add part</button></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-7 sm:px-6 lg:px-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card relative overflow-hidden"><div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-lime-200/40 blur-2xl" /><div className="relative"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Inventory value</span><span className="rounded-xl bg-lime-100 p-2 text-lime-700"><ArchiveBoxIcon className="h-5 w-5" /></span></div><div className="mt-5 text-3xl font-semibold text-slate-950 dark:text-white">{currency(totalValue)}</div><p className="mt-1 text-sm text-slate-500">Across {parts.length} cataloged parts</p></div></div>
          <div className="card"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Units on hand</span><span className="rounded-xl bg-indigo-50 p-2 text-indigo-700"><WrenchScrewdriverIcon className="h-5 w-5" /></span></div><div className="mt-5 text-3xl font-semibold text-slate-950 dark:text-white">{totalUnits.toLocaleString()}</div><p className="mt-1 text-sm text-slate-500">Ready for workshop demand</p></div>
          <div className="card"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Reorder queue</span><span className="rounded-xl bg-amber-50 p-2 text-amber-700"><ArrowTrendingDownIcon className="h-5 w-5" /></span></div><div className="mt-5 text-3xl font-semibold text-amber-600">{lowStockCount}</div><p className="mt-1 text-sm text-slate-500">Parts below their threshold</p></div>
          <div className="rounded-2xl bg-[#0b1220] p-5 text-white shadow-xl shadow-slate-900/10"><div className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Operations pulse</div><div className="mt-5 flex items-end justify-between"><div><div className="text-3xl font-semibold">{parts.length ? Math.round(((parts.length - lowStockCount) / parts.length) * 100) : 0}%</div><div className="mt-1 text-sm text-slate-400">stock health</div></div><div className="h-16 w-16 rounded-full border-[7px] border-slate-700 border-t-[#b8f36b] border-r-[#b8f36b]" /></div></div>
        </section>

        <section className="card !p-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg text-slate-950 dark:text-white">Parts catalog</h2><p className="mt-1 text-sm text-slate-500">{lowStockOnly ? 'Showing only parts that need attention.' : 'Search, review, and act on every stocked component.'}</p></div><div className="flex flex-wrap items-center gap-3"><label className="relative min-w-[240px] flex-1"><MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input-field pl-10" placeholder="Search part number or description" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="input-field min-w-[160px]"><option value="all">All categories</option>{categoriesQuery.data?.map((item) => <option key={item} value={item}>{item}</option>)}</select><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"><input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} className="h-4 w-4 accent-indigo-600" /> Needs reorder</label></div></div>
          {partsQuery.isLoading ? <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3"><div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /><div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /><div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /></div> : partsQuery.isError ? <div className="p-12 text-center"><p className="font-semibold text-rose-600">Unable to load inventory</p><p className="mt-1 text-sm text-slate-500">{partsQuery.error instanceof Error ? partsQuery.error.message : 'Please try again.'}</p></div> : parts.length === 0 ? <div className="p-14 text-center"><ArchiveBoxIcon className="mx-auto h-12 w-12 text-slate-300" /><h3 className="mt-4 text-lg text-slate-900 dark:text-white">{hasFilters ? 'No parts match these filters' : 'Your parts catalog is empty'}</h3><p className="mt-1 text-sm text-slate-500">{hasFilters ? 'Try clearing a filter or changing your search.' : 'Add your first spare part to start tracking workshop readiness.'}</p>{!hasFilters && <button onClick={() => navigate('/inventory/parts/new')} className="btn-primary mt-5"><PlusIcon className="h-4 w-4" /> Add first part</button>}</div> : <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">{parts.map((part) => { const state = stockState(part); const fill = Math.min(100, part.reorder_level ? (part.current_quantity / Math.max(part.reorder_level * 2, 1)) * 100 : 100); return <article key={part.id} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><div className="font-mono text-xs font-bold uppercase tracking-[.12em] text-indigo-600">{part.part_number}</div><h3 className="mt-2 text-lg text-slate-900 dark:text-white">{part.description}</h3><p className="mt-1 text-sm text-slate-500">{part.category} · {part.unit_of_measure}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${state.tone}`}><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${state.dot}`} />{state.label}</span></div><div className="mt-6 flex items-end justify-between"><div><div className="text-3xl font-semibold text-slate-950 dark:text-white">{part.current_quantity.toLocaleString()}</div><div className="text-xs font-medium text-slate-500">on hand · reorder at {part.reorder_level}</div></div><div className="text-right"><div className="font-semibold text-slate-900 dark:text-white">{currency(part.unit_cost)}</div><div className="text-xs text-slate-500">per {part.unit_of_measure}</div></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${state.dot}`} style={{ width: `${fill}%` }} /></div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"><button onClick={() => navigate(`/inventory/parts/${part.id}/edit`)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Edit details</button><button onClick={() => setReceiveStockPart(part)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">Receive stock</button></div></article>; })}</div>}
        </section>
      </main>
      {receiveStockPart && <ReceiveStockModal isOpen={Boolean(receiveStockPart)} onClose={() => setReceiveStockPart(null)} part={receiveStockPart} />}
    </div>
  );
}
