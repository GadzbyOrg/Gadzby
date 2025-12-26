"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getShopStats } from "@/features/shops/actions";
import { getShopEvents } from "@/features/events/actions";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { formatPrice } from "@/lib/utils";

type Timeframe = '7d' | '30d' | '90d' | 'all' | 'custom';

interface StatisticsChartsProps {
    slug: string;
}

export function StatisticsCharts({ slug }: StatisticsChartsProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const timeframe = (searchParams.get("timeframe") as Timeframe) || "30d";
    const customStart = searchParams.get("from") || "";
    const customEnd = searchParams.get("to") || "";
    const eventIdParam = searchParams.get("eventId") || "all";

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
    const [data, setData] = useState<{
        summary: { totalRevenue: number; totalExpenses: number; profit: number };
        chartData: { date: string; revenue: number; expenses: number; profit: number }[];
    } | null>(null);

    const updateParams = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`);
        });
    };

    const handleTimeframeChange = (t: Timeframe) => {
        if (t === 'custom') {
            updateParams({ timeframe: t });
        } else {
            updateParams({ timeframe: t, from: null, to: null });
        }
    };

    const handleDateChange = (type: 'from' | 'to', value: string) => {
        updateParams({ [type]: value });
    };

    const handleEventChange = (value: string) => {
        updateParams({ eventId: value === 'all' ? null : value });
    };

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                 // We need shopId, but we only have slug. 
                 // Note: getShopEvents requires shopId, but getShopStats uses slug. 
                 // We might need to fetch shop first or update getShopEvents to accept slug or we can guess shopId if available?
                 // Actually getShopEvents takes shopId. We don't have it in props. 
                 // Let's rely on getShopBySlug or assume we can get it.
                 // Ideally we should pass shopId to this component or fetch it.
                 // For now let's assume we can't easily get shopId without fetching shop.
                 // Wait, getShopBySlug is available.
            } catch (e) {
                console.error(e);
            }
        };
        // fetchEvents(); // We'll do it inside the main effect or separate
    }, [slug]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch events if not loaded? 
                // We'll just do it here for simplicity or separate it. 
                // Since this effect runs on dependency change, we should be careful.
                
                // Let's fetch shop id first if we don't have it, to get events?
                // Or better: update getShopEvents to take slug? 
                // Or update the parent to pass initial data?
                // Let's modify this component to finding the shop first if needed, 
                // BUT actually, we can just use a server action that takes slug for events?
                // Or just import the action that takes shopId and fetch shop first.
            } catch(e) {}
        };
    }, []);

    // Re-writing the effect to handle data fetching properly
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let startDate: Date | undefined;
                let endDate: Date | undefined;

                if (timeframe === 'custom' && customStart && customEnd) {
                    startDate = new Date(customStart);
                    endDate = new Date(customEnd);
                }

                if (timeframe === 'custom' && (!customStart || !customEnd)) {
                    setLoading(false);
                    return; // Wait for both dates
                }

                const result = await getShopStats(slug, timeframe, startDate, endDate, eventIdParam === 'all' ? undefined : eventIdParam);
                if ('error' in result) {
                    console.error(result.error);
                } else {
                    setData(result);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug, timeframe, customStart, customEnd, eventIdParam]);

    // Separate effect for loading events list once
    useEffect(() => {
        const loadEvents = async () => {
             // We need a way to get shopId or use an action that takes slug.
             // Let's use getShopBySlug to get the ID then get events.
             const { getShopBySlug } = await import("@/features/shops/actions");
             const shopRes = await getShopBySlug(slug);
             if (shopRes.shop) {
                 const eventsRes = await getShopEvents(shopRes.shop.id);
                 setEvents(eventsRes);
             }
        };
        loadEvents();
    }, [slug]);

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-dark-900 p-4 rounded-xl border border-dark-800">
                <div className="flex bg-dark-800 rounded-lg p-1">
                    {(['7d', '30d', '90d', 'all', 'custom'] as Timeframe[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => handleTimeframeChange(t)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                timeframe === t
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                            }`}
                        >
                            {t === '7d' && '7 Jours'}
                            {t === '30d' && '30 Jours'}
                            {t === '90d' && '3 mois'}
                            {t === 'all' && 'Tout'}
                            {t === 'custom' && 'Personnalisé'}
                        </button>
                    ))}
                </div>

                {timeframe === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => handleDateChange('from', e.target.value)}
                            className="bg-dark-800 border-dark-700 text-white rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => handleDateChange('to', e.target.value)}
                            className="bg-dark-800 border-dark-700 text-white rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                )}

                <div className="w-[200px]">
                    <select
                        value={eventIdParam}
                        onChange={(e) => handleEventChange(e.target.value)}
                        className="w-full bg-dark-800 border border-dark-700 text-white text-sm rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer"
                    >
                        <option value="all">Tous les événements</option>
                        {events.map((e) => (
                            <option key={e.id} value={e.id}>
                                {e.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {(loading || isPending) ? (
                <div className="h-64 flex items-center justify-center text-gray-400">
                    Chargement des statistiques...
                </div>
            ) : data ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-dark-900 p-6 rounded-xl border border-dark-800">
                            <p className="text-sm text-gray-400 font-medium">Chiffre d'affaires</p>
                            <p className="text-2xl font-bold text-green-400 mt-2">
                                {formatPrice(data.summary.totalRevenue)}
                            </p>
                        </div>
                        <div className="bg-dark-900 p-6 rounded-xl border border-dark-800">
                            <p className="text-sm text-gray-400 font-medium">Dépenses</p>
                            <p className="text-2xl font-bold text-red-400 mt-2">
                                {formatPrice(data.summary.totalExpenses)}
                            </p>
                        </div>
                        <div className="bg-dark-900 p-6 rounded-xl border border-dark-800">
                            <p className="text-sm text-gray-400 font-medium">Bénéfice</p>
                            <p className={`text-2xl font-bold mt-2 ${data.summary.profit >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                {data.summary.profit > 0 ? '+' : ''}{formatPrice(data.summary.profit)}
                            </p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="bg-dark-900 p-6 rounded-xl border border-dark-800">
                        <h3 className="text-lg font-medium text-white mb-6">Évolution des revenus et dépenses</h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="#6b7280" 
                                        fontSize={12}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                    />
                                    <YAxis 
                                        stroke="#6b7280" 
                                        fontSize={12}
                                        tickFormatter={(value) => `${value / 100}€`}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem' }}
                                        formatter={(value?: number) => [`${((value || 0) / 100).toFixed(2)}€`, '']}
                                        labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    />
                                    <Legend />
                                    <Area 
                                        type="monotone" 
                                        dataKey="revenue" 
                                        name="Revenus"
                                        stroke="#4ade80" 
                                        fillOpacity={1} 
                                        fill="url(#colorRevenue)" 
                                        strokeWidth={2}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="expenses" 
                                        name="Dépenses"
                                        stroke="#f87171" 
                                        fillOpacity={1} 
                                        fill="url(#colorExpenses)" 
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}
