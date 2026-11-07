'use client';

import React from 'react';
import {
  Kanban,
  TableProperties,
  BarChart3,
  Boxes,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export type ActiveView = 'board' | 'table' | 'analytics' | 'inventory' | 'security';

interface SlimSidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  unresolvedAlertCount?: number;
}

export const SlimSidebar: React.FC<SlimSidebarProps> = ({
  activeView,
  onViewChange,
  unresolvedAlertCount = 0,
}) => {
  const navItems = [
    {
      id: 'board' as ActiveView,
      label: 'Manufacturing Pipeline',
      shortLabel: 'Board',
      icon: Kanban,
    },
    {
      id: 'table' as ActiveView,
      label: 'Master Case Table',
      shortLabel: 'Table',
      icon: TableProperties,
    },
    {
      id: 'analytics' as ActiveView,
      label: 'Telemetry & Financials',
      shortLabel: 'Metrics',
      icon: BarChart3,
    },
    {
      id: 'inventory' as ActiveView,
      label: 'Inventory & Raw Materials',
      shortLabel: 'Stock',
      icon: Boxes,
      badge: unresolvedAlertCount > 0 ? unresolvedAlertCount : undefined,
    },
    {
      id: 'security' as ActiveView,
      label: 'Security & Compliance Audit Trail',
      shortLabel: 'Security',
      icon: ShieldCheck,
    },
  ];

  return (
    <aside className="w-[68px] min-w-[68px] h-screen bg-zinc-950 border-r border-zinc-800/80 flex flex-col items-center justify-between py-4 select-none z-30">
      {/* Top Branding Logo */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <div
          className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-lg shadow-sky-950/50 cursor-pointer"
          onClick={() => onViewChange('board')}
          title="Meticuly MetiTrack MES"
        >
          <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center text-sky-400 font-bold font-mono tracking-tighter text-lg">
            M<span className="text-[10px] text-cyan-300">µ</span>
          </div>
        </div>
        <div className="h-px w-8 bg-zinc-800/80 my-1" />
      </div>

      {/* Main Navigation Stack */}
      <nav className="flex flex-col items-center gap-2.5 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`relative group w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
              }`}
              title={item.label}
            >
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? 'text-sky-400' : ''}`} />
              <span className="text-[9px] font-medium tracking-tight mt-0.5">{item.shortLabel}</span>

              {/* Active left indicator pill */}
              {isActive && (
                <span className="absolute -left-2 top-2.5 bottom-2.5 w-1 bg-sky-500 rounded-r-full shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
              )}

              {/* Alert notification badge */}
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-950">
                  {item.badge}
                </span>
              )}

              {/* Hover Tooltip */}
              <div className="absolute left-[72px] px-2.5 py-1 bg-zinc-900 text-zinc-100 text-xs font-medium rounded-md whitespace-nowrap shadow-xl border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                {item.label}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Plant Telemetry & Regulatory Badge */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <div className="h-px w-8 bg-zinc-800/80" />

        {/* Live Status indicator */}
        <div
          className="group relative flex flex-col items-center cursor-default"
          title="SLM Titanium Additive Plant Online"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:border-zinc-700">
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="flex h-2 w-2 relative -mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>

          {/* Plant status tooltip */}
          <div className="absolute left-[72px] bottom-0 p-3 bg-zinc-900 text-zinc-200 text-xs rounded-lg shadow-2xl border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 w-52">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Plant Telemetry Online</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Meticuly Bangkok Plant #1
              <br />
              Chamber Argon: <strong className="text-zinc-200">99.999%</strong>
              <br />
              ISO 13485:2016 Compliant
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
