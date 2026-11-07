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
  RefreshCw,
  Cpu,
  Flame,
  Gauge,
  Sparkles,
  Clock,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { PlantAnalytics, StepDistributionItem } from '../types';
import { api } from '../lib/api';

export const AnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<PlantAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const analyticsData = await api.getAnalyticsOverview();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to fetch analytics telemetry', err);
    } finally {
      setIsLoading(false);
    }
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

    dist.forEach((item) => {
      if (item.order_count > maxCount) {
        maxCount = item.order_count;
        bStation = item;
      }
    });

    return { bottleneckStation: bStation, maxStationWip: maxCount };
  }, [analytics]);

  // 2. Bar Chart Data (WIP by Station)
  const stationBarData = useMemo(() => {
    const dist = analytics?.step_distribution || [];
    return dist.map((d) => {
      const isBottleneck =
        bottleneckStation !== null &&
        bottleneckStation.sequence_order === d.sequence_order &&
        maxStationWip > 0;

      // Clean, concise station labels
      const shortStationName =
        d.sequence_order === 1
          ? '1. CAD'
          : d.sequence_order === 2
          ? '2. SLM Print'
          : d.sequence_order === 3
          ? '3. CNC Mill'
          : d.sequence_order === 4
          ? '4. QA Sterile'
          : '5. Packaging';

      return {
        name: shortStationName,
        cases: d.order_count,
        station: d.name,
        isBottleneck,
      };
    });
  }, [analytics, bottleneckStation, maxStationWip]);

  // 3. Titanium Powder Consumed in Builds
  const titaniumConsumedStats = useMemo(() => {
    const tiRes = analytics?.resource_consumption?.find(
      (r) =>
        r.name.toLowerCase().includes('titanium') ||
        r.name.toLowerCase().includes('powder')
    );

    const totalConsumedGrams = tiRes ? Number(tiRes.total_consumed) : 0;
    const totalConsumedKg = (totalConsumedGrams / 1000).toFixed(3);
    const costPerGram = tiRes ? Number(tiRes.cost_per_unit) : 1.25;
    const totalTiCost = (totalConsumedGrams * costPerGram).toFixed(2);

    return {
      totalConsumedGrams,
      totalConsumedKg,
      totalTiCost,
    };
  }, [analytics]);

  // 4. Machine Hours Utilization Stats
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
      {/* 1. TOP HEADER & TELEMETRY CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Factory Telemetry & Operational Analytics</span>
            </h2>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time shop floor load analysis, bottleneck detection, additive machine runtime, and cumulative cost allocation
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition disabled:opacity-50 self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* 2. BOTTLENECK DETECTION ALERT BANNER */}
      {bottleneckStation && maxStationWip > 0 ? (
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
            Station {bottleneckStation.sequence_order}: {bottleneckStation.name}
          </span>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Optimal Line Flow:</strong> Manufacturing floor is balanced with no bottleneck congestion across the 5 stations.
          </span>
        </div>
      )}

      {/* 3. TOP 4 KEY TELEMETRY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Active Cases */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5 sm:p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-[11px] block font-medium">Active WIP</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-sky-400 mt-1 block">
              {analytics?.in_progress || 0}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              Across 5 Stations
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
        </div>

        {/* KPI 2: Titanium Consumed */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5 sm:p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-[11px] block font-medium">Titanium Sintered</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-indigo-400 mt-1 block">
              {titaniumConsumedStats.totalConsumedKg} kg
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              {titaniumConsumedStats.totalConsumedGrams.toLocaleString()} g Ti-6Al-4V
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* KPI 3: Machine Hours Logged */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5 sm:p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-[11px] block font-medium">Machine Hours</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-amber-400 mt-1 block">
              {(Number(machineStats.slmHours) + Number(machineStats.cncHours)).toFixed(1)} hrs
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              SLM {machineStats.slmHours}h • CNC {machineStats.cncHours}h
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400 shrink-0">
            <Gauge className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* KPI 4: Total Incurred Manufacturing Cost */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5 sm:p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-[11px] block font-medium">Total Plant Cost</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-400 mt-1 block">
              ${Number(totalPlantCost).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              Materials + Machines + Labor
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* 4. TWO PRIMARY RECHARTS VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* CHART 1: WORK-IN-PROGRESS (WIP) & BOTTLENECK DETECTION BAR CHART */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 flex flex-col justify-between shadow-xl">
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
                Normal
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 flex flex-col justify-between shadow-xl">
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

      {/* 5. MACHINE UTILIZATION & POWER SPECS (Cleanroom Hardware Breakdown) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-zinc-100">
              Cleanroom Additive & Machining Fleet Utilization
            </h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">
            Hardware Health: 100% Operational
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-200">SLM 280 3D Metal Printer</span>
              <span className="font-mono text-sky-400 font-bold">{machineStats.slmHours} hrs logged</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Laser Power: 280W Yb-fiber laser • Inert Argon Chamber O₂ &lt; 50 ppm
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-200">5-Axis CNC Precision Mill</span>
              <span className="font-mono text-indigo-400 font-bold">{machineStats.cncHours} hrs logged</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Sub-millimeter tolerance interface milling (±15µm anatomical precision)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
