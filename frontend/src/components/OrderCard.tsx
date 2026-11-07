'use client';

import React from 'react';
import {
  ArrowRight,
  FileCheck2,
  Hash,
  Bone,
} from 'lucide-react';
import { Order } from '../types';

interface OrderCardProps {
  order: Order;
  onSelect: (order: Order) => void;
  onAdvance: (order: Order) => void;
  isAuthorizedToAdvance?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onSelect,
  onAdvance,
  isAuthorizedToAdvance = true,
}) => {
  const isCompleted = order.status === 'COMPLETED';
  const currentStepNum = order.current_step?.sequence_order || 1;

  // Priority color scheme
  const priorityStyles: Record<string, string> = {
    URGENT: 'bg-rose-950/80 text-rose-300 border-rose-800/80 animate-pulse',
    EMERGENCY: 'bg-rose-950/80 text-rose-300 border-rose-800/80 animate-pulse',
    RUSH: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    STANDARD: 'bg-zinc-800 text-zinc-300 border-zinc-700/60',
    NORMAL: 'bg-zinc-800 text-zinc-300 border-zinc-700/60',
  };

  // Implant Anatomy Label & Color
  const getImplantInfo = (type: string) => {
    const t = String(type).toUpperCase();
    if (t.includes('CRANIAL')) return { label: 'Cranial Plate', color: 'text-sky-400' };
    if (t.includes('MANDIB')) return { label: 'Mandible Jaw', color: 'text-indigo-400' };
    if (t.includes('SPINAL')) return { label: 'Spinal Cage', color: 'text-emerald-400' };
    if (t.includes('HIP') || t.includes('ACETABULAR') || t.includes('ORTHO')) {
      return { label: 'Acetabular Cup', color: 'text-amber-400' };
    }
    return { label: type, color: 'text-zinc-300' };
  };

  const implantInfo = getImplantInfo(order.implant_type);

  return (
    <div
      onClick={() => onSelect(order)}
      className={`group relative rounded-xl border bg-zinc-900/90 p-3.5 shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 select-none ${
        order.priority === 'URGENT'
          ? 'border-rose-900/50 hover:border-rose-700 bg-zinc-900/95 hover:shadow-rose-950/20'
          : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-lg'
      }`}
    >
      {/* Top Header: Case ID & Priority Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-zinc-100 group-hover:text-sky-400 transition-colors">
            {order.case_id}
          </span>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            priorityStyles[order.priority] || priorityStyles.STANDARD
          }`}
        >
          {order.priority}
        </span>
      </div>

      {/* Mid Section: Patient Ref & Anatomical Implant Type */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
            <Hash className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="truncate max-w-[120px]">{order.patient_ref}</span>
          </span>
          <span className={`text-[11px] font-medium flex items-center gap-1 ${implantInfo.color}`}>
            <Bone className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[120px]">{implantInfo.label}</span>
          </span>
        </div>

        {/* Step Progress (ဥပမာ- Step 2 of 5) & 5-Segment Bar */}
        <div className="flex flex-col gap-1 w-full pt-0.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-300 font-medium text-[11px]">
              {isCompleted ? '✓ Completed (eDHR Sealed)' : `Step ${currentStepNum} of 5`}
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              {isCompleted ? '100%' : `${currentStepNum * 20}%`}
            </span>
          </div>

          <div className="flex items-center gap-1 w-full">
            {[1, 2, 3, 4, 5].map((stepIdx) => {
              const isFinished = stepIdx < currentStepNum || isCompleted;
              const isCurrent = stepIdx === currentStepNum && !isCompleted;

              return (
                <div
                  key={stepIdx}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    isFinished
                      ? 'bg-emerald-500'
                      : isCurrent
                      ? 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.8)]'
                      : 'bg-zinc-800'
                  }`}
                  title={`Station ${stepIdx}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Footer: Accumulated Cost & Single "Advance ➔" Action Button */}
      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/80">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-500 font-medium">Accumulated Cost</span>
          <span className="font-mono text-xs font-semibold text-zinc-200">
            ${Number(order.total_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Single Dedicated Action Button */}
        {isCompleted ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-[11px] font-medium">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>eDHR Sealed</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(order);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
              isAuthorizedToAdvance
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-950/40 active:scale-[0.98]'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
            }`}
            title={
              isAuthorizedToAdvance
                ? 'Advance to Next Manufacturing Station'
                : 'Role Authorization Check Required'
            }
          >
            <span>Advance</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>
    </div>
  );
};
