'use client';

import React from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Sparkles,
  Inbox,
  Cpu,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { ProcessStep, Order } from '@/types';
import OrderCard from './OrderCard';

interface PipelineBoardProps {
  steps: ProcessStep[];
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onAdvanceClick: (order: Order, e: React.MouseEvent) => void;
}

export default function PipelineBoard({
  steps,
  orders,
  onSelectOrder,
  onAdvanceClick,
}: PipelineBoardProps) {
  // Sort steps strictly by sequence_order
  const sortedSteps = [...steps].sort((a, b) => a.sequence_order - b.sequence_order);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070B14]">
      {/* Top Sequence Roadmap Banner */}
      <div className="px-6 py-3 border-b border-slate-800/80 bg-[#090E19] flex items-center justify-between gap-4 overflow-x-auto shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold font-mono">
            5S
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-200">
              Personalized Implant Additive Manufacturing Workflow
            </h2>
            <p className="text-[11px] text-slate-400">
              Strict 5-Step GMP Sequence • Zero Step-Skipping Allowed
            </p>
          </div>
        </div>

        {/* Mini progress tracker */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {sortedSteps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
                  {step.sequence_order}
                </span>
                <span className="truncate max-w-[120px] font-medium">{step.name}</span>
              </div>
              {idx < sortedSteps.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Kanban Board Container with Smooth Horizontal Scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-5 h-full items-start">
          {sortedSteps.map((step) => {
            // Filter orders at this step
            const columnOrders = orders.filter(
              (o) => o.current_step && o.current_step.id === step.id
            );

            return (
              <div
                key={step.id}
                className="w-[340px] shrink-0 h-full flex flex-col rounded-2xl bg-[#0C121F]/90 border border-slate-800/90 shadow-lg"
              >
                {/* Column Header */}
                <div className="p-4 border-b border-slate-800/80 bg-[#0F1626]/80 rounded-t-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-xs font-bold font-mono">
                        {step.sequence_order}
                      </span>
                      <h3 className="font-bold text-xs text-slate-100 tracking-tight leading-snug">
                        {step.name}
                      </h3>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800/90 text-slate-300 border border-slate-700/80">
                      {columnOrders.length}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mt-1">
                    {step.description}
                  </p>
                </div>

                {/* Column Body / Orders List */}
                <div className="flex-1 p-3.5 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
                  {columnOrders.length > 0 ? (
                    columnOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onSelect={onSelectOrder}
                        onAdvanceClick={onAdvanceClick}
                      />
                    ))
                  ) : (
                    <div className="h-48 border border-dashed border-slate-800/80 rounded-xl flex flex-col items-center justify-center p-4 text-center text-slate-400">
                      <Inbox className="w-7 h-7 text-slate-400 mb-2 stroke-[1.5]" />
                      <div className="text-xs font-medium text-slate-400">Station Idle</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        No implant cases waiting
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
