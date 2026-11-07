'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Activity,
  Layers,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Boxes,
  PlusCircle,
  RefreshCw,
  Cpu,
  Flame,
  Gauge,
  Sparkles,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { PlantAnalytics, Resource, PlantStockHealth, StepDistributionItem } from '../types';
import { api } from '../lib/api';
import { ReplenishModal } from './ReplenishModal';

interface AnalyticsViewProps {
  activeSubTab?: 'telemetry' | 'inventory';
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ activeSubTab = 'telemetry' }) => {
  const [analytics, setAnalytics] = useState<PlantAnalytics | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [stockHealth, setStockHealth] = useState<PlantStockHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Replenish Modal state
  const [selectedReplenishRes, setSelectedReplenishRes] = useState<Resource | null>(null);
  const [isReplenishOpen, setIsReplenishOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, resData, healthData] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getResources(),
        api.getResourceHealth(),
      ]);
      setAnalytics(analyticsData);
      setResources(resData);
      setStockHealth(healthData);
    } catch (err) {
      console.error('Failed to fetch analytics telemetry', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReplenish = (res: Resource) => {
    setSelectedReplenishRes(res);
    setIsReplenishOpen(true);
  };

  const handleReplenishSuccess = (updated: Resource) => {
    setResources(resources.map((r) => (r.id === updated.id ? updated : r)));
    fetchDashboardData();
  };

  // 1. Identify Station Bottleneck
  const { bottleneckStation, maxStationWip } = useMemo<{
    bottleneckStation: StepDistributionItem | null;
    maxStationWip: number;
  }>(() => {
    const dist = analytics?.step_distribution || [];
    if (dist.length === 0) return { bottleneckStation: null, maxStationWip: 0 };

    let maxCount = -1;
    let bStation: StepDistributionItem | null = null;

    dist.forEach((s) => {
      if (s.order_count > maxCount) {
        maxCount = s.order_count;
        bStation = s;
      }
    });

    return {
      bottleneckStation: maxCount > 0 ? bStation : null,
      maxStationWip: maxCount,
    };
  }, [analytics]);

  // 2. Prepare Station WIP Bar Chart Data
  const stationBarData = useMemo(() => {
    return (
      analytics?.step_distribution?.map((s) => ({
        name: `Step ${s.sequence_order}`,
        station: s.name,
        code: s.code,
        cases: s.order_count,
        isBottleneck: bottleneckStation && s.step_id === bottleneckStation.step_id && s.order_count > 0,
      })) || []
    );
  }, [analytics, bottleneckStation]);

  // 3. Extract Titanium Ti-6Al-4V ELI Powder Stats
  const titaniumStats = useMemo(() => {
    const tiRes = analytics?.resource_consumption?.find(
      (r) =>
        r.name.toLowerCase().includes('titanium') ||
        r.name.toLowerCase().includes('powder')
    );

    const totalConsumedGrams = tiRes ? Number(tiRes.total_consumed) : 0;
    const totalConsumedKg = (totalConsumedGrams / 1000).toFixed(3);
    const availableGrams = tiRes ? Number(tiRes.total_available) : 0;
    const availableKg = (availableGrams / 1000).toFixed(2);
    const costPerGram = tiRes ? Number(tiRes.cost_per_unit) : 1.25;
    const totalTiCost = (totalConsumedGrams * costPerGram).toFixed(2);

    return {
      resource: tiRes,
      totalConsumedGrams,
      totalConsumedKg,
      availableGrams,
      availableKg,
      totalTiCost,
      depletionPercent:
        availableGrams + totalConsumedGrams > 0
          ? ((totalConsumedGrams / (availableGrams + totalConsumedGrams)) * 100).toFixed(1)
          : '0.0',
    };
  }, [analytics]);

  // 4. Machine Utilization Stats
  const machineStats = useMemo(() => {
    const slmRes = analytics?.resource_consumption?.find((r) =>
      r.name.toLowerCase().includes('slm')
    );
    const cncRes = analytics?.resource_consumption?.find((r) =>
      r.name.toLowerCase().includes('cnc')
    );

    return {
      slmHours: slmRes ? Number(slmRes.total_consumed).toFixed(1) : '0.0',
      cncHours: cncRes ? Number(cncRes.total_consumed).toFixed(1) : '0.0',
    };
  }, [analytics]);

  // 5. Financial Cost Breakdown Donut Data
  const finSummary = analytics?.financial_summary || {
    material_cost: 0,
    machine_cost: 0,
    labor_cost: 0,
    total_plant_cost: 0,
    grand_total_cost: 0,
  };
  const totalPlantCost = finSummary.grand_total_cost ?? finSummary.total_plant_cost ?? 0;

  const costPieData = [
    { name: 'Materials (Ti Powder/Pouches)', value: finSummary.material_cost, color: '#38bdf8' },
    { name: 'Machine Time (SLM/EDM/CMM)', value: finSummary.machine_cost, color: '#818cf8' },
    { name: 'Labor & Engineering', value: finSummary.labor_cost, color: '#34d399' },
  ];

  return (
    <div className="flex-1 p-3 sm:p-6 bg-zinc-950 flex flex-col gap-4 sm:gap-6 overflow-y-auto">
      {/* Top Header & Telemetry Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100 tracking-tight">
              {activeSubTab === 'inventory'
                ? 'Warehouse Inventory & Raw Material Stocks'
                : 'Factory Telemetry & Bottleneck Dashboard'}
            </h2>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {activeSubTab === 'inventory'
              ? 'ASTM F3001 Grade 23 titanium powder balances, cleanroom safety thresholds, and one-click replenishment'
              : 'Real-time shop floor load analysis, bottleneck detection, and cumulative titanium powder consumption'}
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition disabled:opacity-50 self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh {activeSubTab === 'inventory' ? 'Inventory' : 'Telemetry'}</span>
        </button>
      </div>

      {/* BOTTLENECK DETECTION ALERT BANNER */}
      {activeSubTab === 'telemetry' && (
        bottleneckStation && maxStationWip > 0 ? (
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-zinc-900 border border-rose-800/80 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-900/80 border border-rose-700 flex items-center justify-center shrink-0 text-rose-300">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-rose-300 font-mono">
                    ⚠️ Shop Floor Bottleneck Detected
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-900/90 text-rose-100 font-mono text-[10px] font-bold">
                    {bottleneckStation.order_count} Cases Queued
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">
                  Cases are currently accumulating at{' '}
                  <strong className="text-white">
                    Step {bottleneckStation.sequence_order}: {bottleneckStation.name}
                  </strong>
                  . Dispatch additional certified operators or allocate machine capacity to prevent surgical lead-time delays.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono text-rose-300/80 border border-rose-800/60 px-2.5 py-1 rounded-lg self-start sm:self-auto whitespace-nowrap bg-rose-950/40">
              Station: {bottleneckStation.code}
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Optimal Line Flow:</strong> Manufacturing floor is balanced with no bottleneck congestion across the 5 stations.
            </span>
          </div>
        )
      )}

      {/* TOP 4 KEY TELEMETRY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Cases */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-xs block font-medium">Active In-Pipeline (WIP)</span>
            <span className="font-mono text-2xl font-bold text-sky-400 mt-1 block">
              {analytics?.in_progress || 0}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              Across 5 Stations
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* KPI 2: Titanium Consumed */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-xs block font-medium">Titanium Consumed</span>
            <span className="font-mono text-2xl font-bold text-zinc-100 mt-1 block">
              {titaniumStats.totalConsumedGrams.toLocaleString()} g
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              {titaniumStats.totalConsumedKg} kg Ti-6Al-4V ELI
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <Layers className="w-5 h-5 text-sky-400" />
          </div>
        </div>

        {/* KPI 3: Machine Sintering Hours */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-xs block font-medium">SLM Laser Utilization</span>
            <span className="font-mono text-2xl font-bold text-indigo-400 mt-1 block">
              {machineStats.slmHours} hrs
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              + {machineStats.cncHours} hrs CNC Milling
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Total Incurred Manufacturing Cost */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-xs block font-medium">Total Plant Cost</span>
            <span className="font-mono text-2xl font-bold text-emerald-400 mt-1 block">
              ${Number(totalPlantCost).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              Σ(Materials + Machine + Labor)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TWO PRIMARY RECHARTS VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: WORK-IN-PROGRESS (WIP) & BOTTLENECK DETECTION BAR CHART */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-zinc-100">
                  Station Work-In-Progress (WIP) & Bottlenecks
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  Bar Chart
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Red bar highlights station with highest load accumulation
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block" />
                Normal Load
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" />
                Bottleneck
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stationBarData}
                margin={{ top: 15, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis
                  dataKey="name"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  formatter={(val: any, name: any, item: any) => [
                    `${val} Cases (${item.payload.station}) ${
                      item.payload.isBottleneck ? '⚠️ [BOTTLENECK]' : ''
                    }`,
                    'Queue Count',
                  ]}
                />
                <Bar dataKey="cases" radius={[6, 6, 0, 0]}>
                  {stationBarData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isBottleneck ? '#f43f5e' : '#0284c7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: PLANT FINANCIAL ALLOCATION DONUT CHART */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-zinc-100">
                  Plant Cost Composition & Domain Allocation
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  Donut Chart
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Cumulative capital split: Materials vs Machine Run-Time vs Engineering Labor
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              Financial Breakdown
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {costPieData.every((d) => d.value === 0) ? (
              <div className="text-zinc-500 text-xs">No cost consumption recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {costPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Allocated']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* DEDICATED TITANIUM POWDER LIFECYCLE & INVENTORY TRACKER */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100">
                Titanium Ti-6Al-4V ELI Powder Tracking
              </h3>
              <p className="text-[11px] text-zinc-400">
                ASTM F3001 Grade 23 Virgin vs Sieve Recycled Powder Batch Balance
              </p>
            </div>
          </div>

          {titaniumStats.resource && (
            <button
              onClick={() => handleOpenReplenish(titaniumStats.resource! as any)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition self-start sm:self-auto shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Restock Titanium Powder</span>
            </button>
          )}
        </div>

        {/* Titanium Powder Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total Powder Consumed</span>
            <div className="font-mono text-lg font-bold text-zinc-100">
              {titaniumStats.totalConsumedGrams.toLocaleString()} g
            </div>
            <div className="text-[10px] text-sky-400 font-mono">
              = {titaniumStats.totalConsumedKg} kg Sintered in Builds
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Warehouse Stock Available</span>
            <div className="font-mono text-lg font-bold text-emerald-400">
              {Number(titaniumStats.availableGrams).toLocaleString()} g
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              = {titaniumStats.availableKg} kg Certified Virgin/Sieved
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total Powder Valuation</span>
            <div className="font-mono text-lg font-bold text-zinc-100">
              ${Number(titaniumStats.totalTiCost).toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              @ $1.25 / gram Ti-6Al-4V ELI
            </div>
          </div>
        </div>

        {/* Depletion Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Inventory Depletion Rate</span>
            <span className="font-mono text-zinc-300 font-semibold">
              {titaniumStats.depletionPercent}% Consumed
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, Number(titaniumStats.depletionPercent)))}%` }}
            />
          </div>
        </div>
      </div>

      {/* ALL RESOURCES STOCK & REPLENISHMENT TABLE */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-zinc-100">
              Warehouse Stock Balances & Safety Levels
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            Safety Stock Monitoring Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">Resource Target</th>
                <th className="py-2.5 px-3">Domain Category</th>
                <th className="py-2.5 px-3">Unit Cost</th>
                <th className="py-2.5 px-3">Available Stock</th>
                <th className="py-2.5 px-3">Stock Health Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {resources.map((res) => {
                const stockVal = Number(res.total_available);
                const isCriticallyLow = stockVal <= 10;
                const isLow = stockVal < 50 && stockVal > 10;

                return (
                  <tr key={res.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3 px-3 font-semibold text-zinc-200">
                      {res.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                        {res.category_display}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      ${Number(res.cost_per_unit).toFixed(2)} / {res.unit.toLowerCase()}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-zinc-100">
                      {stockVal.toLocaleString()} {res.unit.toLowerCase()}
                    </td>
                    <td className="py-3 px-3">
                      {isCriticallyLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Critical Depletion</span>
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Low Stock Alert</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Optimal Level</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenReplenish(res)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition"
                      >
                        <PlusCircle className="w-3 h-3 text-sky-400" />
                        <span>Replenish</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Replenish Warehouse Stock Modal */}
      <ReplenishModal
        resource={selectedReplenishRes}
        isOpen={isReplenishOpen}
        onClose={() => setIsReplenishOpen(false)}
        onSuccess={handleReplenishSuccess}
      />
    </div>
  );
};
