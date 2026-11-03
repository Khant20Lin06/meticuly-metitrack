'use client';

import React from 'react';
import Image from 'next/image';
import {
  Layers,
  Activity,
  Boxes,
  FileCheck2,
  ShieldCheck,
  Settings,
  HelpCircle,
  Cpu
} from 'lucide-react';

interface SlimSidebarProps {
  activeTab: 'pipeline' | 'analytics' | 'inventory' | 'audit';
  setActiveTab: (tab: 'pipeline' | 'analytics' | 'inventory' | 'audit') => void;
}

export default function SlimSidebar({ activeTab, setActiveTab }: SlimSidebarProps) {
  const navItems = [
    { id: 'pipeline', label: 'Sequential Pipeline', icon: Layers, badge: null },
    { id: 'analytics', label: 'Production Telemetry', icon: Activity, badge: 'Live' },
    { id: 'inventory', label: 'Titanium & Resources', icon: Boxes, badge: null },
    { id: 'audit', label: 'ISO 13485 DHR Audit', icon: ShieldCheck, badge: null },
  ] as const;

  return (
    <aside className="w-[68px] h-screen bg-[#090D16] border-r border-slate-800/80 flex flex-col justify-between items-center py-4 select-none shrink-0 z-40">
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group cursor-pointer" title="Meticuly Medical Device MES">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:border-cyan-400 transition-all">
            <Image
              src="/meticuly-logo.png"
              alt="Meticuly"
              width={34}
              height={34}
              className="object-contain"
            />
          </div>
          <span className="absolute left-16 ml-2 top-2 px-2.5 py-1 bg-slate-900 border border-slate-700 text-cyan-400 text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Meticuly MES v2.4
          </span>
        </div>

        {/* Cleanroom validation pill */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-pointer relative group"
          title="Cleanroom Plant #1 — Validated ISO 13485:2016"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="absolute left-16 ml-2 top-1 px-2.5 py-1 bg-slate-900 border border-slate-700 text-emerald-400 text-xs rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Cleanroom #1 Active • ISO 13485
          </span>
        </div>
      </div>

      {/* Middle Navigation Icons */}
      <nav className="flex flex-col items-center gap-2 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center relative transition-all group ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-5 h-5 stroke-[1.8]" />

              {/* Tooltip on hover */}
              <span className="absolute left-16 ml-2 top-2.5 px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {item.label}
              </span>

              {/* Active Indicator Bar on Left */}
              {isActive && (
                <span className="absolute -left-2 top-2.5 bottom-2.5 w-1 bg-cyan-400 rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile / Hardware Telemetry */}
      <div className="flex flex-col items-center gap-3">
        {/* Machine station status icon */}
        <div
          className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-300 relative group cursor-pointer"
          title="SLM 3D Metal Printer & 5-Axis CNC Online"
        >
          <Cpu className="w-5 h-5 text-cyan-400/90" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="absolute left-16 ml-2 bottom-2 px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Hardware: SLM 3D Printer (Ready) • CNC (Online)
          </span>
        </div>

        {/* Operator Badge Avatar */}
        <div
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600/80 flex items-center justify-center font-bold text-xs text-cyan-300 shadow-md relative group cursor-pointer"
          title="Operator: Khant Lin (Lead Biomedical Engineer)"
        >
          <span>KL</span>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#090D16]" />
          <span className="absolute left-16 ml-2 bottom-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            <div className="font-semibold text-cyan-400">Khant Lin</div>
            <div className="text-[11px] text-slate-400">Biomedical Engineer (RBAC Lead)</div>
          </span>
        </div>
      </div>
    </aside>
  );
}
