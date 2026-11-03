'use client';

import React from 'react';
import {
  Search,
  Filter,
  AlertCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Layers,
  ShieldCheck,
  Package
} from 'lucide-react';
import { ImplantType, Priority } from '@/types';

interface TopBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  urgentOnly: boolean;
  setUrgentOnly: (val: boolean) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenNewCaseModal: () => void;
  totalActiveCount: number;
  urgentCount: number;
}

export default function TopBar({
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
  urgentOnly,
  setUrgentOnly,
  onRefresh,
  isRefreshing,
  onOpenNewCaseModal,
  totalActiveCount,
  urgentCount,
}: TopBarProps) {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B101B]/95 backdrop-blur px-6 flex items-center justify-between gap-4 shrink-0 z-30">
      {/* Left: Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              MetiTrack MES
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Linear Flow
              </span>
            </h1>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">
              Titanium Additive Manufacturing
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> ISO 13485:2016 Compliant
            </span>
            <span className="text-slate-600">|</span>
            <span>Cleanroom Plant #1</span>
          </div>
        </div>
      </div>

      {/* Middle: Clean Search & Filters */}
      <div className="flex items-center gap-3 max-w-xl flex-1 justify-center">
        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Case ID or Patient Ref..."
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-200"
            >
              ×
            </button>
          )}
        </div>

        {/* Implant Type Filter */}
        <div className="relative">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/60 cursor-pointer transition-all"
          >
            <option value="ALL">All Implant Types</option>
            <option value="CRANIAL_PLATE">Cranial Plates</option>
            <option value="MANDIBULAR_RECON">Mandibular Reconstruction</option>
            <option value="HIP_ACETABULAR_CUP">Acetabular Hip Cups</option>
            <option value="SPINAL_CAGE">Spinal Fusion Cages</option>
          </select>
        </div>

        {/* Urgent Only Filter Button */}
        <button
          onClick={() => setUrgentOnly(!urgentOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            urgentOnly
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
              : 'bg-slate-900/90 text-slate-400 border-slate-700/80 hover:text-slate-200 hover:border-slate-600'
          }`}
        >
          <AlertCircle className={`w-3.5 h-3.5 ${urgentOnly ? 'text-rose-400' : 'text-slate-400'}`} />
          <span>Urgent</span>
          {urgentCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                urgentOnly ? 'bg-rose-500 text-white' : 'bg-rose-500/30 text-rose-300'
              }`}
            >
              {urgentCount}
            </span>
          )}
        </button>
      </div>

      {/* Right: Refresh & New Case CTA */}
      <div className="flex items-center gap-3">
        {/* Active counter pill */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>{totalActiveCount} Active Implants</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600 transition-all disabled:opacity-50"
          title="Reload manufacturing pipeline"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        {/* Primary CTA */}
        <button
          onClick={onOpenNewCaseModal}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Implant Case</span>
        </button>
      </div>
    </header>
  );
}
