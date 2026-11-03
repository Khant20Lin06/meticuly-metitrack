'use client';

import React from 'react';
import { Resource } from '@/types';
import { Boxes, Cpu, User, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface InventoryViewProps {
  resources: Resource[];
}

export default function InventoryView({ resources }: InventoryViewProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MATERIAL':
        return <Package className="w-4 h-4 text-cyan-400" />;
      case 'MACHINE_TIME':
        return <Cpu className="w-4 h-4 text-amber-400" />;
      case 'LABOR':
        return <User className="w-4 h-4 text-indigo-400" />;
      default:
        return <Boxes className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#070B14]">
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Boxes className="w-5 h-5 text-cyan-400" />
          Plant Inventory & Equipment Allocation Ledger
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Real-time stock deduction, available machine capacities, and specialist labor rates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((res) => {
          const available = parseFloat(res.total_available);
          const isLow = available < 100 && res.unit === 'UNITS';

          return (
            <div
              key={res.id}
              className="p-5 rounded-2xl border border-slate-800 bg-[#0C121F] space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                  {getCategoryIcon(res.category)}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {res.category.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-100 leading-snug">{res.name}</h3>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Rate: ${parseFloat(res.cost_per_unit).toFixed(2)} / {res.unit.toLowerCase()}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Available Balance
                  </span>
                  <span className="font-mono text-lg font-bold text-slate-100">
                    {available.toLocaleString()} {res.unit.toLowerCase()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>In Stock</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
