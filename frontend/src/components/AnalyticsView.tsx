'use client';

import React from 'react';
import { AnalyticsOverview, Resource, Order } from '@/types';
import {
  Activity,
  Boxes,
  Layers,
  DollarSign,
  TrendingUp,
  Cpu,
  UserCheck,
  ShieldCheck
} from 'lucide-react';

interface AnalyticsViewProps {
  analytics: AnalyticsOverview | null;
  resources: Resource[];
  orders: Order[];
}

export default function AnalyticsView({ analytics, resources, orders }: AnalyticsViewProps) {
  if (!analytics) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
        Loading manufacturing analytics...
      </div>
    );
  }

  // Calculate total material grams and machine hours
  let totalTitaniumConsumed = 0;
  let totalMachineHours = 0;
  let totalLaborHours = 0;

  orders.forEach((o) => {
    o.consumptions.forEach((c) => {
      const qty = parseFloat(c.quantity) || 0;
      if (c.unit.toLowerCase() === 'grams') {
        totalTitaniumConsumed += qty;
      } else if (c.resource_category === 'MACHINE_TIME') {
        totalMachineHours += qty;
      } else if (c.resource_category === 'LABOR') {
        totalLaborHours += qty;
      }
    });
  });

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#070B14]">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Manufacturing Intelligence & Resource Utilization
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Cleanroom Plant #1 Real-Time Additive Line Telemetry (ISO 13485:2016)
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Plant Cost */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0C121F] space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cumulative Production Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            ${analytics.total_plant_cost.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-400 font-medium">
            Across {analytics.total_orders} custom implants
          </div>
        </div>

        {/* Titanium Consumed */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0C121F] space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ti-6Al-4V Consumed</span>
            <Boxes className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {totalTitaniumConsumed.toFixed(0)} <span className="text-sm font-normal text-slate-400">grams</span>
          </div>
          <div className="text-[10px] text-cyan-400 font-medium">Medical Grade 23 Powder</div>
        </div>

        {/* Machine Hours */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0C121F] space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Machine Hours</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {totalMachineHours.toFixed(1)} <span className="text-sm font-normal text-slate-400">hrs</span>
          </div>
          <div className="text-[10px] text-amber-400 font-medium">SLM 3D & 5-Axis CNC Mill</div>
        </div>

        {/* Engineering Labor */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0C121F] space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Specialist Labor</span>
            <UserCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {totalLaborHours.toFixed(1)} <span className="text-sm font-normal text-slate-400">hrs</span>
          </div>
          <div className="text-[10px] text-indigo-400 font-medium">Biomedical & QA Inspection</div>
        </div>
      </div>

      {/* Sequential Pipeline Flow Breakdown */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#0C121F] space-y-4">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Case Distribution by Manufacturing Step</span>
        </h3>

        <div className="space-y-3">
          {analytics.step_distribution.map((s) => {
            const percentage =
              analytics.total_orders > 0
                ? Math.round((s.order_count / analytics.total_orders) * 100)
                : 0;

            return (
              <div key={s.step_id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-[11px]">
                      {s.step_order}
                    </span>
                    <span className="font-medium text-slate-200">{s.step_name}</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-300">
                    {s.order_count} cases ({percentage}%)
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
