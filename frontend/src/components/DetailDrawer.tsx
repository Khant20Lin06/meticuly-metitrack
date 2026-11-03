'use client';

import React, { useState } from 'react';
import {
  X,
  Layers,
  Boxes,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Clock,
  User,
  Calendar,
  DollarSign,
  Printer,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Order, OrderStepLog, OrderResourceConsumption } from '@/types';
import ThreeImplantViewer from './ThreeImplantViewer';

interface DetailDrawerProps {
  order: Order | null;
  onClose: () => void;
  onAdvanceClick: (order: Order) => void;
}

export default function DetailDrawer({ order, onClose, onAdvanceClick }: DetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'3d' | 'resources' | 'audit' | 'udi'>('3d');

  if (!order) return null;

  const isCompleted = order.status === 'COMPLETED';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dim Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl h-full bg-[#0B101D] border-l border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 bg-[#0E1526] flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="font-mono text-xl font-extrabold text-slate-100 tracking-tight">
                {order.case_id}
              </span>
              {order.priority === 'URGENT' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  URGENT
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                  isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                }`}
              >
                {isCompleted ? 'DISPATCHED' : `STEP ${order.current_step.sequence_order} ACTIVE`}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {order.patient_ref}
              </span>
              <span>•</span>
              <span className="text-slate-300 font-sans font-medium">
                {order.implant_type.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted && (
              <button
                type="button"
                onClick={() => {
                  onAdvanceClick(order);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                <span>Advance Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-[#090D17] px-5 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('3d')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === '3d'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3D Mesh & Geometry</span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'resources'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Resource Ledger ({order.consumptions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'audit'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ISO 13485 DHR</span>
          </button>

          <button
            onClick={() => setActiveTab('udi')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'udi'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>UDI Label</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: 3D Geometry */}
          {activeTab === '3d' && (
            <div className="space-y-4">
              <ThreeImplantViewer implantType={order.implant_type} caseId={order.case_id} />

              {/* Manufacturing Stage Info */}
              <div className="rounded-xl border border-slate-800 bg-[#0E1526] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Current Production Stage</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    Step {order.current_step.sequence_order} of 5
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-100">
                  {order.current_step.name}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {order.current_step.description}
                </p>
              </div>

              {/* Specifications Card */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60">
                  <div className="text-slate-400 text-[11px] mb-1">Material Specification</div>
                  <div className="font-semibold text-slate-200">Ti-6Al-4V ELI (Grade 23)</div>
                  <div className="text-[10px] text-emerald-400 mt-1">ISO 5832-3 Medical Implant</div>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60">
                  <div className="text-slate-400 text-[11px] mb-1">Cumulative Production Cost</div>
                  <div className="font-mono text-base font-bold text-emerald-400">
                    ${order.total_cost.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {order.consumptions.length} ledger postings
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Resource Ledger */}
          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Itemized Bill of Materials & Machine Allocation
                </h4>
                <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  Total: ${order.total_cost.toFixed(2)}
                </div>
              </div>

              {order.consumptions.length > 0 ? (
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0D1322]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#111A2E] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Resource / Station</th>
                        <th className="py-2.5 px-3">Step</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
                      {order.consumptions.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-sans">
                            <div className="font-medium text-slate-200">{c.resource_name}</div>
                            <div className="text-[10px] text-slate-400">
                              Logged by {c.logged_by}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400">Step {c.step}</td>
                          <td className="py-2.5 px-3 text-right text-slate-200">
                            {parseFloat(c.quantity).toFixed(1)} {c.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            ${parseFloat(c.cost_per_unit).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            ${c.subtotal_cost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
                  No resources have been logged yet for this implant.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ISO 13485 DHR Audit Trail */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Device History Record (DHR)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Complies with 21 CFR 820.184 & ISO 13485:2016 Clause 7.5.9
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Immutable Log
                </span>
              </div>

              <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {order.step_logs.map((log) => (
                  <div key={log.id} className="relative group">
                    {/* Circle icon */}
                    <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0E1526] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-100">
                          {log.from_step_name ? `${log.from_step_name} → ` : 'Case Created → '}
                          <span className="text-cyan-400">{log.to_step_name || 'Completed & Dispatched'}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(log.transitioned_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        "{log.notes}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Signed by: <strong className="text-slate-300">{log.operator_name}</strong></span>
                        <span>{new Date(log.transitioned_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: UDI Label */}
          {activeTab === 'udi' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Hospital Packaging & UDI Label
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Medical Device Single Audit Program (MDSAP) Sterile Specimen
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Label</span>
                </button>
              </div>

              {/* Printable Medical Device Label Mockup */}
              <div className="p-5 rounded-xl bg-white text-black font-sans shadow-lg border border-slate-300 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="font-black tracking-wider text-sm">METICULY CO., LTD.</div>
                  <div className="text-[10px] font-bold border border-black px-1.5 py-0.5 rounded">
                    STERILE R
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase">
                    Custom-Made Medical Device
                  </div>
                  <div className="text-base font-extrabold text-black">
                    {order.implant_type.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t">
                  <div>
                    <span className="text-gray-500 text-[10px] block">CASE / LOT ID</span>
                    <strong className="text-sm">{order.case_id}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">PATIENT REF</span>
                    <strong className="text-sm">{order.patient_ref}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">MATERIAL</span>
                    <span>Ti-6Al-4V Grade 23</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">MANUFACTURE DATE</span>
                    <span>{new Date(order.created_at).toISOString().split('T')[0]}</span>
                  </div>
                </div>

                {/* GS1 Barcode mockup */}
                <div className="pt-3 border-t flex flex-col items-center justify-center">
                  <div className="h-10 w-full bg-[repeating-linear-gradient(90deg,#000,#000_2px,#fff_2px,#fff_5px,#000_5px,#000_8px)] rounded-sm" />
                  <div className="text-[10px] font-mono tracking-widest mt-1 text-gray-700">
                    (01)08851234567890(17)311226(10){order.case_id}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
