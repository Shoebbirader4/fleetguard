import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  SignalIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Vehicle } from '../types/vehicle';

type TrackingVehicle = Pick<
  Vehicle,
  | 'id'
  | 'vin'
  | 'make'
  | 'model'
  | 'year'
  | 'status'
  | 'gps_device_id'
  | 'last_gps_update'
  | 'last_location'
  | 'assigned_route'
  | 'depot_location'
>;

type TrackingStatus = 'moving' | 'recent' | 'stale' | 'offline';

const STALE_AFTER_MS = 15 * 60 * 1000;
const OFFLINE_AFTER_MS = 24 * 60 * 60 * 1000;

function getTrackingStatus(vehicle: TrackingVehicle): TrackingStatus {
  if (!vehicle.gps_device_id || !vehicle.last_gps_update || !vehicle.last_location) return 'offline';
  const age = Date.now() - new Date(vehicle.last_gps_update).getTime();
  if (!Number.isFinite(age) || age > OFFLINE_AFTER_MS) return 'offline';
  if (age > STALE_AFTER_MS) return 'stale';
  return 'recent';
}

function statusLabel(status: TrackingStatus): string {
  return { moving: 'Moving', recent: 'Online', stale: 'Stale update', offline: 'Offline' }[status];
}

function statusClasses(status: TrackingStatus): string {
  return {
    moving: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    recent: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    stale: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    offline: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  }[status];
}

function formatUpdatedAt(value?: string): string {
  if (!value) return 'No location received';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function getMarkerPosition(vehicle: TrackingVehicle, index: number) {
  const latitude = vehicle.last_location?.latitude;
  const longitude = vehicle.last_location?.longitude;
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return {
      left: `${Math.min(88, Math.max(12, ((longitude + 180) / 360) * 100))}%`,
      top: `${Math.min(86, Math.max(12, ((90 - latitude) / 180) * 100))}%`,
    };
  }
  return { left: `${18 + ((index * 23) % 68)}%`, top: `${22 + ((index * 31) % 58)}%` };
}

export default function GPSTrackingPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | TrackingStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const vehiclesQuery = useQuery<TrackingVehicle[]>({
    queryKey: ['gps-tracking-vehicles', user?.tenantId],
    enabled: Boolean(user?.tenantId),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(
          'id, vin, make, model, year, status, gps_device_id, last_gps_update, last_location, assigned_route, depot_location'
        )
        .eq('tenant_id', user!.tenantId)
        .order('make', { ascending: true });
      if (error) throw error;
      return (data || []) as TrackingVehicle[];
    },
  });

  useEffect(() => {
    if (!user?.tenantId) return;
    const channel = supabase
      .channel(`gps-tracking-${user.tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles', filter: `tenant_id=eq.${user.tenantId}` },
        () => queryClient.invalidateQueries({ queryKey: ['gps-tracking-vehicles', user.tenantId] })
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.tenantId]);

  const vehicles = vehiclesQuery.data || [];
  const enrichedVehicles = useMemo(
    () => vehicles.map((vehicle) => ({ ...vehicle, trackingStatus: getTrackingStatus(vehicle) })),
    [vehicles]
  );
  const filteredVehicles = enrichedVehicles.filter((vehicle) => {
    const haystack = `${vehicle.make} ${vehicle.model} ${vehicle.vin} ${vehicle.assigned_route || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (filter === 'all' || vehicle.trackingStatus === filter);
  });
  const selectedVehicle = enrichedVehicles.find((vehicle) => vehicle.id === selectedId) || filteredVehicles[0];
  const counts = enrichedVehicles.reduce(
    (summary, vehicle) => {
      summary[vehicle.trackingStatus] += 1;
      return summary;
    },
    { moving: 0, recent: 0, stale: 0, offline: 0 } as Record<TrackingStatus, number>
  );

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-2 text-white"><SignalIcon className="h-6 w-6" /></div>
              <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">GPS Tracking</h1><p className="text-sm text-gray-500 dark:text-gray-400">Live fleet visibility and location health</p></div>
            </div>
          </div>
          <button onClick={() => void vehiclesQuery.refetch()} disabled={vehiclesQuery.isFetching} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
            <ArrowPathIcon className={`h-4 w-4 ${vehiclesQuery.isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {([['recent', 'Online', 'text-green-600'], ['moving', 'Moving', 'text-blue-600'], ['stale', 'Stale', 'text-amber-600'], ['offline', 'Offline', 'text-gray-500']] as const).map(([key, label, color]) => (
            <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)} className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 dark:border-gray-800 dark:bg-gray-900 ${filter === key ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/40' : 'border-gray-200'}`}>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{counts[key]}</p>
            </button>
          ))}
        </section>

        {vehiclesQuery.isError && <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"><ExclamationTriangleIcon className="h-5 w-5 shrink-0" /><div><p className="font-semibold">Unable to load vehicle locations</p><p className="text-sm">{vehiclesQuery.error instanceof Error ? vehiclesQuery.error.message : 'Check your connection and try again.'}</p></div></div>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
              <div className="relative min-w-[220px] flex-1"><MapPinIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicle, VIN, or route" className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-900/40" /></div>
              <select value={filter} onChange={(event) => setFilter(event.target.value as 'all' | TrackingStatus)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"><option value="all">All signal states</option><option value="recent">Online</option><option value="moving">Moving</option><option value="stale">Stale update</option><option value="offline">Offline</option></select>
            </div>
            <div className="relative h-[460px] overflow-hidden bg-slate-100 dark:bg-slate-950">
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_75%_70%,rgba(16,185,129,0.14),transparent_25%)]" />
              {vehiclesQuery.isLoading ? <div className="absolute inset-0 grid place-items-center text-sm text-gray-500">Loading fleet locations…</div> : filteredVehicles.map((vehicle, index) => {
                const status = vehicle.trackingStatus;
                const position = getMarkerPosition(vehicle, index);
                return <button key={vehicle.id} onClick={() => setSelectedId(vehicle.id)} style={position} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-1.5 shadow-lg transition hover:scale-110 ${selectedVehicle?.id === vehicle.id ? 'z-20 bg-blue-600 ring-4 ring-blue-200 dark:ring-blue-900' : status === 'offline' ? 'bg-gray-500' : status === 'stale' ? 'bg-amber-500' : 'bg-emerald-500'}`} title={`${vehicle.make} ${vehicle.model}`}><TruckIcon className="h-5 w-5 text-white" /></button>;
              })}
              {!vehiclesQuery.isLoading && filteredVehicles.length === 0 && <div className="absolute inset-0 grid place-items-center p-8 text-center"><div><MapPinIcon className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-3 font-semibold text-gray-700 dark:text-gray-200">No vehicles match this view</p><p className="mt-1 text-sm text-gray-500">Add GPS data to a vehicle or clear the filters.</p></div></div>}
              <div className="absolute bottom-4 left-4 rounded-lg border border-gray-200/80 bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300">Map preview uses the latest coordinates stored for each vehicle</div>
            </div>
          </section>

          <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 p-4 dark:border-gray-800"><h2 className="font-semibold text-gray-900 dark:text-white">Vehicle details</h2><p className="mt-1 text-sm text-gray-500">Select a marker to inspect its latest signal.</p></div>
            {selectedVehicle ? <div className="space-y-5 p-5"><div><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-bold text-gray-900 dark:text-white">{selectedVehicle.make} {selectedVehicle.model}</p><p className="text-sm text-gray-500">{selectedVehicle.year} · {selectedVehicle.vin}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(selectedVehicle.trackingStatus)}`}>{statusLabel(selectedVehicle.trackingStatus)}</span></div></div><dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-gray-500">GPS device</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{selectedVehicle.gps_device_id || 'Not configured'}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Last update</dt><dd className="text-right font-medium text-gray-900 dark:text-gray-100">{formatUpdatedAt(selectedVehicle.last_gps_update)}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Coordinates</dt><dd className="text-right font-medium text-gray-900 dark:text-gray-100">{selectedVehicle.last_location ? `${selectedVehicle.last_location.latitude.toFixed(5)}, ${selectedVehicle.last_location.longitude.toFixed(5)}` : 'Unavailable'}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Route</dt><dd className="text-right font-medium text-gray-900 dark:text-gray-100">{selectedVehicle.assigned_route || 'Unassigned'}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Depot</dt><dd className="text-right font-medium text-gray-900 dark:text-gray-100">{selectedVehicle.depot_location || 'Not recorded'}</dd></div></dl><div className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800/70"><p className="font-medium text-gray-800 dark:text-gray-100">Signal guidance</p><p className="mt-1 text-gray-500 dark:text-gray-400">Online is updated within 15 minutes. Stale signals should be checked before dispatch.</p></div></div> : <div className="grid min-h-[300px] place-items-center p-6 text-center"><TruckIcon className="mx-auto h-10 w-10 text-gray-400" /><p className="mt-3 font-medium text-gray-700 dark:text-gray-200">No vehicle selected</p><p className="mt-1 text-sm text-gray-500">Choose a vehicle marker or add GPS coordinates.</p></div>}
          </aside>
        </div>
      </main>
    </div>
  );
}
