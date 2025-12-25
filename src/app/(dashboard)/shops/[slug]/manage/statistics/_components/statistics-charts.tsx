"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getShopStats } from "@/features/shops/actions";
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

    const [loading, setLoading] = useState(true);
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

                const result = await getShopStats(slug, timeframe, startDate, endDate);
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
    }, [slug, timeframe, customStart, customEnd]);

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
