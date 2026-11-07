'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Layers,
  PlusCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Search,
  Filter,
  ShieldCheck,
  PackageCheck,
  TrendingDown,
  Sparkles,
  Flame,
  Cpu,
} from 'lucide-react';
import { Resource, PlantStockHealth, PlantAnalytics } from '../types';
import { api } from '../lib/api';
import { ReplenishModal } from './ReplenishModal';

export const WarehouseStockView: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [stockHealth, setStockHealth] = useState<PlantStockHealth | null>(null);
  const [analytics, setAnalytics] = useState<PlantAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedHealthFilter, setSelectedHealthFilter] = useState<string>('ALL');

  // Replenish Modal state
  const [selectedReplenishRes, setSelectedReplenishRes] = useState<Resource | null>(null);
  const [isReplenishOpen, setIsReplenishOpen] = useState(false);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const [resData, healthData, analyticsData] = await Promise.all([
        api.getResources(),
        api.getResourceHealth(),
        api.getAnalyticsOverview(),
      ]);
      setResources(resData);
      setStockHealth(healthData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to fetch warehouse stock data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReplenish = (res: Resource) => {
    setSelectedReplenishRes(res);
    setIsReplenishOpen(true);
  };

  const handleReplenishSuccess = (updated: Resource) => {
    setResources((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    fetchStockData();
  };

  // Titanium Ti-6Al-4V ELI Powder Stats
  const titaniumStats = useMemo(() => {
    const tiRes = resources.find(
      (r) =>
        r.name.toLowerCase().includes('titanium') ||
        r.name.toLowerCase().includes('powder')
    );
    const tiAnalytics = analytics?.resource_consumption?.find(
      (r) =>
        r.name.toLowerCase().includes('titanium') ||
        r.name.toLowerCase().includes('powder')
    );

    const totalConsumedGrams = tiAnalytics ? Number(tiAnalytics.total_consumed) : 0;
    const totalConsumedKg = (totalConsumedGrams / 1000).toFixed(3);
    const availableGrams = tiRes ? Number(tiRes.total_available) : 0;
    const availableKg = (availableGrams / 1000).toFixed(2);
    const costPerGram = tiRes ? Number(tiRes.cost_per_unit) : 1.25;
    const totalTiValuation = (availableGrams * costPerGram).toFixed(2);
    const totalSinteredCost = (totalConsumedGrams * costPerGram).toFixed(2);

    const totalLot = availableGrams + totalConsumedGrams;
    const depletionPercent = totalLot > 0
      ? ((totalConsumedGrams / totalLot) * 100).toFixed(1)
      : '0.0';

    return {
      resource: tiRes,
      totalConsumedGrams,
      totalConsumedKg,
      availableGrams,
      availableKg,
      totalTiValuation,
      totalSinteredCost,
      depletionPercent,
    };
  }, [resources, analytics]);

  // Secondary Cleanroom Consumable Metrics
  const consumablesStats = useMemo(() => {
    const argon = resources.find((r) => r.name.toLowerCase().includes('argon'));
    const tyvek = resources.find((r) => r.name.toLowerCase().includes('tyvek') || r.name.toLowerCase().includes('pouch'));
    const criticalCount = resources.filter((r) => Number(r.total_available) <= 10).length;
    const lowCount = resources.filter((r) => Number(r.total_available) > 10 && Number(r.total_available) < 50).length;

    return {
      argonAvailable: argon ? Number(argon.total_available).toLocaleString() : '0',
      tyvekAvailable: tyvek ? Number(tyvek.total_available).toLocaleString() : '0',
      criticalCount,
      lowCount,
      totalInventoryValuation: resources.reduce((acc, r) => acc + (Number(r.total_available) * Number(r.cost_per_unit)), 0),
    };
  }, [resources]);

  // Filtered resources list
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = res.name.toLowerCase().includes(q);
        const matchCat = res.category_display.toLowerCase().includes(q);
        if (!matchName && !matchCat) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && res.category !== selectedCategory) {
        return false;
      }

      // Stock health filter
      const stockVal = Number(res.total_available);
      if (selectedHealthFilter === 'CRITICAL' && stockVal > 10) return false;
      if (selectedHealthFilter === 'LOW' && (stockVal <= 10 || stockVal >= 50)) return false;
      if (selectedHealthFilter === 'HEALTHY' && stockVal < 50) return false;

      return true;
    });
  }, [resources, searchQuery, selectedCategory, selectedHealthFilter]);

  return (
    <div className="flex-1 p-3 sm:p-6 bg-zinc-950 flex flex-col gap-4 sm:gap-6 overflow-y-auto">
      {/* 1. TOP HEADER & TELEMETRY CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              <Boxes className="w-4 h-4 text-sky-400" />
              <span>Warehouse Inventory & Raw Material Stores</span>
            </h2>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            ASTM F3001 Grade 23 titanium powder balances, cleanroom safety thresholds, and certified batch replenishment (ISO 13485:2016 Clause 7.4.3)
          </p>
        </div>

        <button
          onClick={fetchStockData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition disabled:opacity-50 self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* 2. TOP 4 KEY INVENTORY TELEMETRY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Certified Titanium ELI Available */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5 sm:p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-[11px] block font-medium">Ti-6Al-4V Available</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-sky-400 mt-1 block">
              {titaniumStats.availableKg} kg
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              {Number(titaniumStats.availableGrams).toLocaleString()} g in Canisters
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* KPI 2: Argon 99.999% Shielding Gas */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5 sm:p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-[11px] block font-medium">Argon Purge Gas</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-indigo-400 mt-1 block">
              {consumablesStats.argonAvailable} L
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              O₂ &lt; 50 ppm Chamber Purge
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* KPI 3: Tyvek Double Sterile Pouches */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5 sm:p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-[11px] block font-medium">Tyvek Sterile Pouches</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-400 mt-1 block">
              {consumablesStats.tyvekAvailable} pcs
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              Station 5 Packaging Ready
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
            <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* KPI 4: Stock Safety Health & Total Valuation */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5 sm:p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-zinc-500 text-[11px] block font-medium">Total Stores Value</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-400 mt-1 block">
              ${consumablesStats.totalInventoryValuation.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
              {consumablesStats.criticalCount > 0 ? (
                <span className="text-rose-400 font-bold">⚠️ {consumablesStats.criticalCount} Below Safety Stock</span>
              ) : (
                <span className="text-emerald-400 font-bold">✓ 100% Safety Stock OK</span>
              )}
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* 3. DEDICATED TITANIUM POWDER LIFECYCLE & SINTERING BALANCE */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100">
                Titanium Ti-6Al-4V ELI Powder Lifecycle
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
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">On-Hand Powder Valuation</span>
            <div className="font-mono text-lg font-bold text-zinc-100">
              ${Number(titaniumStats.totalTiValuation).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
              {titaniumStats.depletionPercent}% Consumed Across Plant
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

      {/* 4. INVENTORY TOOLBAR: SEARCH & CATEGORY FILTERS */}
      <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/70 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search material, gas, tooling..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>

        {/* Category & Health Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 shrink-0">
            <Filter className="w-3 h-3 text-zinc-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-zinc-900 text-zinc-200">All Categories</option>
              <option value="RAW_MATERIAL" className="bg-zinc-900 text-zinc-200">Raw Materials</option>
              <option value="MACHINE_TIME" className="bg-zinc-900 text-zinc-200">Machine Time</option>
              <option value="CONSUMABLE" className="bg-zinc-900 text-zinc-200">Consumables & Packaging</option>
            </select>
          </div>

          {/* Health Status Filter */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 shrink-0">
            <select
              value={selectedHealthFilter}
              onChange={(e) => setSelectedHealthFilter(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-zinc-900 text-zinc-200">All Statuses</option>
              <option value="HEALTHY" className="bg-zinc-900 text-emerald-400">✓ Healthy Stock</option>
              <option value="LOW" className="bg-zinc-900 text-amber-400">⚠️ Low Stock (&lt;50)</option>
              <option value="CRITICAL" className="bg-zinc-900 text-rose-400">🚨 Critical Depletion (&lt;10)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. ALL RESOURCES STOCK & REPLENISHMENT TABLE (Desktop View) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-zinc-100">
              Cleanroom Warehouse Stock Ledger ({filteredResources.length} materials)
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            Safety Stock Monitoring Active
          </span>
        </div>

        {/* Responsive Table for Desktop & Tablet */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">Resource Target</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Unit Cost</th>
                <th className="py-2.5 px-3">Available Stock</th>
                <th className="py-2.5 px-3">Stock Health Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No resources match the active search or category criteria.
                  </td>
                </tr>
              ) : (
                filteredResources.map((res) => {
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
                            <span>Optimal Stock</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenReplenish(res)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sky-400 text-[11px] font-medium transition"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Restock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Responsive Cards for Mobile View (< sm) */}
        <div className="block sm:hidden space-y-2.5">
          {filteredResources.map((res) => {
            const stockVal = Number(res.total_available);
            const isCriticallyLow = stockVal <= 10;
            const isLow = stockVal < 50 && stockVal > 10;

            return (
              <div
                key={res.id}
                className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-2 select-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-zinc-100 block">{res.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                      {res.category_display} • ${Number(res.cost_per_unit).toFixed(2)} / {res.unit.toLowerCase()}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenReplenish(res)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-semibold transition active:scale-95 shrink-0"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>Restock</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/80">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-zinc-500">Available:</span>
                    <strong className="text-white">{stockVal.toLocaleString()} {res.unit.toLowerCase()}</strong>
                  </div>

                  <div>
                    {isCriticallyLow ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Critical</span>
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Low Stock</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Optimal</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. MODAL DIALOG: RESTOCK FORM */}
      <ReplenishModal
        resource={selectedReplenishRes}
        isOpen={isReplenishOpen}
        onClose={() => setIsReplenishOpen(false)}
        onSuccess={handleReplenishSuccess}
      />
    </div>
  );
};
