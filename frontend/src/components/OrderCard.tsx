'use client';

import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
  User
} from 'lucide-react';
import { Order, ImplantType } from '@/types';

interface OrderCardProps {
  order: Order;
  onSelect: (order: Order) => void;
  onAdvanceClick: (order: Order, e: React.MouseEvent) => void;
}

const implantLabels: Record<ImplantType, { label: string; iconColor: string; bg: string }> = {
  CRANIAL_PLATE: {
    label: 'Titanium Cranial Plate',
    iconColor: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
  },
  MANDIBULAR_RECON: {
    label: 'Mandibular Recon Plate',
    iconColor: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  },
  HIP_ACETABULAR_CUP: {
    label: 'Acetabular Hip Cup',
    iconColor: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
  },
  SPINAL_CAGE: {
    label: 'Spinal Fusion Cage',
    iconColor: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  },
};

export default function OrderCard({ order, onSelect, onAdvanceClick }: OrderCardProps) {
  const isUrgent = order.priority === 'URGENT';
  const isCompleted = order.status === 'COMPLETED';
  const implantInfo = implantLabels[order.implant_type] || {
    label: order.implant_type,
    iconColor: 'text-slate-400',
    bg: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  // Calculate material grams and machine hours from consumptions
  let titaniumGrams = 0;
  let machineHours = 0;
  order.consumptions.forEach((c) => {
    if (c.unit.toLowerCase() === 'grams') {
      titaniumGrams += parseFloat(c.quantity) || 0;
    } else if (c.unit.toLowerCase() === 'hours') {
      machineHours += parseFloat(c.quantity) || 0;
    }
  });

  return (
    <div
      onClick={() => onSelect(order)}
      className={`group relative rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
        isUrgent
          ? 'bg-[#121828]/95 border-rose-500/40 hover:border-rose-500/70 shadow-[0_4px_20px_rgba(244,63,94,0.12)]'
          : 'bg-[#101726]/95 border-slate-800/90 hover:border-slate-700 hover:bg-[#131B2E] shadow-sm hover:shadow-md'
      }`}
    >
      {/* Top row: Case ID, Urgent badge, Cost */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          {isUrgent && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              URGENT
            </span>
          )}
          <span className="font-mono font-bold text-sm text-slate-100 tracking-tight">
            {order.case_id}
          </span>
        </div>

        {/* Cost Badge */}
        <div className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-900/90 border border-slate-700/80 text-emerald-400/90 font-mono">
          ${order.total_cost.toFixed(2)}
        </div>
      </div>

      {/* Patient Reference & Date */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-slate-300 font-medium">{order.patient_ref}</span>
        </div>
        <div className="text-[11px] text-slate-400">
          {new Date(order.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Implant Geometry Tag */}
      <div className="mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${implantInfo.bg}`}
        >
          <Layers className="w-3 h-3" />
          <span>{implantInfo.label}</span>
        </span>
      </div>

      {/* Consumption Footprint Summary */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 py-2 border-t border-slate-800/80 my-2">
        <div className="flex items-center gap-1">
          <Boxes className="w-3.5 h-3.5 text-cyan-400/80" />
          <span>
            {order.consumptions.length > 0 ? (
              <>
                {titaniumGrams > 0 && <strong className="text-slate-300">{titaniumGrams}g Ti</strong>}
                {titaniumGrams > 0 && machineHours > 0 && <span className="mx-1">•</span>}
                {machineHours > 0 && <strong className="text-slate-300">{machineHours}h Ops</strong>}
              </>
            ) : (
              <span className="text-slate-400 italic">No resources logged yet</span>
            )}
          </span>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(order);
          }}
          className="text-xs font-medium text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors px-1 py-1 rounded"
        >
          <span>3D & Audit</span>
          <ExternalLink className="w-3 h-3" />
        </button>

        {!isCompleted ? (
          <button
            type="button"
            onClick={(e) => onAdvanceClick(order, e)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 hover:border-cyan-400 transition-all shadow-[0_0_8px_rgba(6,182,212,0.1)] cursor-pointer"
          >
            <span>Advance</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Dispatched</span>
          </span>
        )}
      </div>
    </div>
  );
}
