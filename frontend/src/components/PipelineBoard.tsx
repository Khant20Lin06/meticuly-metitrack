'use client';

import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Order, ProcessStep, RoleKey } from '../types';
import { OrderCard } from './OrderCard';

interface PipelineBoardProps {
  orders: Order[];
  steps: ProcessStep[];
  activeRole: RoleKey;
  onSelectOrder: (order: Order) => void;
  onAdvanceOrder: (order: Order) => void;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  orders,
  steps,
  activeRole,
  onSelectOrder,
  onAdvanceOrder,
}) => {
  const [showCompletedColumn, setShowCompletedColumn] = useState(true);
  const [selectedMobileStation, setSelectedMobileStation] = useState<number | 'ALL' | 'COMPLETED'>('ALL');

  const getStationShortLabel = (seq: number, fallback: string) => {
    switch (seq) {
      case 1: return 'CAD';
      case 2: return 'SLM Print';
      case 3: return 'CNC / Mill';
      case 4: return 'QA Sterile';
      case 5: return 'Packaging';
      default: return fallback;
    }
  };

  // Station Authorization Mapping for ISO 13485 Station RBAC
  const stepRequiredRoles: Record<number, { role: string; label: string; badgeColor: string }> = {
    1: {
      role: 'BIOMEDICAL_ENGINEER',
      label: 'BioMed Eng',
      badgeColor: 'text-indigo-400 bg-indigo-950/70 border-indigo-800/70',
    },
    2: {
      role: 'PRODUCTION_OPERATOR',
      label: 'Operator',
      badgeColor: 'text-amber-400 bg-amber-950/70 border-amber-800/70',
    },
    3: {
      role: 'PRODUCTION_OPERATOR',
      label: 'Operator',
      badgeColor: 'text-amber-400 bg-amber-950/70 border-amber-800/70',
    },
    4: {
      role: 'QA_SPECIALIST',
      label: 'QA Specialist',
      badgeColor: 'text-emerald-400 bg-emerald-950/70 border-emerald-800/70',
    },
    5: {
      role: 'QA_SPECIALIST',
      label: 'QA Specialist',
      badgeColor: 'text-emerald-400 bg-emerald-950/70 border-emerald-800/70',
    },
  };

  // Check if active persona is allowed to advance at this step
  const checkRolePermission = (stepSeq: number): boolean => {
    if (activeRole === 'ADMIN') return true;
    if (stepSeq === 1 && activeRole === 'BIOMEDICAL_ENGINEER') return true;
    if ((stepSeq === 2 || stepSeq === 3) && activeRole === 'PRODUCTION_OPERATOR') return true;
    if ((stepSeq === 4 || stepSeq === 5) && activeRole === 'QA_SPECIALIST') return true;
    return false;
  };

  // Completed cases
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
  const activeWipOrders = orders.filter((o) => o.status === 'IN_PROGRESS');

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      {/* Board Utility Ribbon (Responsive) */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/30 px-3 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400 select-none">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="font-semibold text-zinc-200">Floor Flow</span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-[11px] sm:text-xs">
            WIP: <strong className="text-sky-400 font-mono">{activeWipOrders.length} cases</strong>
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-[11px] sm:text-xs">
            Released: <strong className="text-emerald-400 font-mono">{completedOrders.length} implants</strong>
          </span>
        </div>

        {/* Toggle Completed Column */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-200 transition">
            <input
              type="checkbox"
              checked={showCompletedColumn}
              onChange={(e) => setShowCompletedColumn(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-sky-500 focus:ring-0 cursor-pointer"
            />
            <span className="text-[11px] font-medium">Show Released Column</span>
          </label>
        </div>
      </div>

      {/* Mobile Station Quick Jump Tabs (< md) */}
      <div className="flex md:hidden items-center gap-1.5 px-3 py-2 bg-zinc-950 border-b border-zinc-800/80 overflow-x-auto scrollbar-none select-none">
        <button
          onClick={() => setSelectedMobileStation('ALL')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition ${
            selectedMobileStation === 'ALL'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
          }`}
        >
          All Stations
        </button>
        {steps.map((st) => (
          <button
            key={st.id}
            onClick={() => setSelectedMobileStation(st.sequence_order)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition flex items-center gap-1 ${
              selectedMobileStation === st.sequence_order
                ? 'bg-sky-600 text-white shadow-sm font-bold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            <span className="font-mono text-[10px]">{st.sequence_order}.</span>
            <span>{getStationShortLabel(st.sequence_order, st.name.split(' ')[0])}</span>
          </button>
        ))}
        {showCompletedColumn && (
          <button
            onClick={() => setSelectedMobileStation('COMPLETED')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition flex items-center gap-1 ${
              selectedMobileStation === 'COMPLETED'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            <span>✓ Sealed</span>
          </button>
        )}
      </div>

      {/* Horizontal Free-Scroll Container */}
      <div className="flex-1 overflow-x-auto p-3 sm:p-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-950">
        <div className="flex items-start gap-4 min-w-max pb-4">
          {/* Render 5 Sequential Manufacturing Columns (w-80 = 320px Fixed Width) */}
          {steps.map((step) => {
            // Mobile station filter check
            if (selectedMobileStation !== 'ALL' && selectedMobileStation !== step.sequence_order) {
              return null;
            }
            const stepOrders = orders.filter(
              (o) => o.status === 'IN_PROGRESS' && o.current_step?.id === step.id
            );
            const reqInfo = stepRequiredRoles[step.sequence_order] || {
              label: 'Operator',
              badgeColor: 'text-zinc-400 bg-zinc-900 border-zinc-800',
            };
            const isUserAuthorized = checkRolePermission(step.sequence_order);

            return (
              <div
                key={step.id}
                className="w-80 min-w-80 max-w-80 shrink-0 flex flex-col rounded-2xl border border-zinc-800/90 bg-zinc-950/80 shadow-xl overflow-hidden"
              >
                {/* Station Column Header */}
                <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 text-xs font-mono font-bold">
                        {step.sequence_order}
                      </span>
                      <h3 className="text-xs font-bold text-zinc-100 tracking-tight truncate max-w-[200px]">
                        {step.name}
                      </h3>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-mono font-semibold">
                      {stepOrders.length}
                    </span>
                  </div>

                  {/* Sub-header with station phase and role authorization badge */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-zinc-400 font-semibold tracking-wide">
                      Station Phase {step.sequence_order}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${reqInfo.badgeColor}`}
                      title={`Station restricted to: ${reqInfo.label}`}
                    >
                      Req: {reqInfo.label}
                    </span>
                  </div>
                </div>

                {/* Station Cards Scrollable Queue */}
                <div className="p-3 flex flex-col gap-3 min-h-[500px] max-h-[calc(100vh-14rem)] overflow-y-auto">
                  {stepOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-44 border border-dashed border-zinc-800/80 rounded-xl p-4 text-center">
                      <Layers className="w-6 h-6 text-zinc-700 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-medium text-zinc-500">Station Idle</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">
                        Ready for upstream transfer
                      </p>
                    </div>
                  ) : (
                    stepOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onSelect={onSelectOrder}
                        onAdvance={onAdvanceOrder}
                        isAuthorizedToAdvance={isUserAuthorized}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Optional 6th Column: Completed Implants & eDHR Released (w-80 = 320px) */}
          {showCompletedColumn && (selectedMobileStation === 'ALL' || selectedMobileStation === 'COMPLETED') && (
            <div className="w-80 min-w-80 max-w-80 shrink-0 flex flex-col rounded-2xl border border-emerald-950/70 bg-emerald-950/10 shadow-xl overflow-hidden">
              <div className="p-3.5 border-b border-emerald-900/40 bg-emerald-950/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-900/80 border border-emerald-700 text-emerald-300 text-xs font-mono font-bold">
                    ✓
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-300 tracking-tight">
                      eDHR Released & Sterile
                    </h3>
                    <span className="text-[10px] text-emerald-400/80">ISO 13485 Sealed</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 text-[11px] font-mono font-semibold border border-emerald-800/50">
                  {completedOrders.length}
                </span>
              </div>

              <div className="p-3 flex flex-col gap-3 min-h-[500px] max-h-[calc(100vh-14rem)] overflow-y-auto">
                {completedOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-44 border border-dashed border-emerald-900/40 rounded-xl p-4 text-center">
                    <ShieldCheck className="w-6 h-6 text-emerald-800 mb-2 stroke-[1.5]" />
                    <p className="text-xs font-medium text-emerald-700">No Released Implants</p>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5">
                      Cases arriving after Step 5
                    </p>
                  </div>
                ) : (
                  completedOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onSelect={onSelectOrder}
                      onAdvance={onAdvanceOrder}
                      isAuthorizedToAdvance={false}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
