'use client';

import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Order, Resource, AdvanceOrderPayload } from '@/types';
import { advanceOrder } from '@/lib/api';

interface AdvanceModalProps {
  order: Order | null;
  resources: Resource[];
  onClose: () => void;
  onSuccess: (updatedOrder: Order) => void;
}

interface ResourceEntry {
  resource_id: number;
  quantity: number;
}

export default function AdvanceModal({
  order,
  resources,
  onClose,
  onSuccess,
}: AdvanceModalProps) {
  const [operatorName, setOperatorName] = useState('Khant Lin (Biomedical Engineer)');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize with intelligent default suggestions based on current step
  const getDefaultEntries = (): ResourceEntry[] => {
    if (!order) return [];
    const seq = order.current_step.sequence_order;
    const entries: ResourceEntry[] = [];

    // Find resources by name or category
    const titanium = resources.find((r) => r.name.includes('Titanium'));
    const printer = resources.find((r) => r.name.includes('SLM'));
    const cnc = resources.find((r) => r.name.includes('CNC'));
    const engineer = resources.find((r) => r.name.includes('Biomedical Engineer'));
    const qa = resources.find((r) => r.name.includes('QA Specialist'));
    const kit = resources.find((r) => r.name.includes('Packaging Kit'));

    if (seq === 1 && engineer) {
      entries.push({ resource_id: engineer.id, quantity: 4.5 });
    } else if (seq === 2) {
      if (titanium) entries.push({ resource_id: titanium.id, quantity: 180.0 });
      if (printer) entries.push({ resource_id: printer.id, quantity: 6.0 });
    } else if (seq === 3 && cnc) {
      entries.push({ resource_id: cnc.id, quantity: 3.5 });
    } else if (seq === 4 && qa) {
      entries.push({ resource_id: qa.id, quantity: 2.0 });
    } else if (seq === 5 && kit) {
      entries.push({ resource_id: kit.id, quantity: 1.0 });
    }

    return entries.length > 0
      ? entries
      : resources.length > 0
      ? [{ resource_id: resources[0].id, quantity: 1 }]
      : [];
  };

  const [selectedResources, setSelectedResources] = useState<ResourceEntry[]>(getDefaultEntries());

  if (!order) return null;

  const currentStep = order.current_step;
  const isFinalStep = currentStep.sequence_order === 5;
  const nextStepOrder = currentStep.sequence_order + 1;

  const handleAddResource = () => {
    if (resources.length > 0) {
      setSelectedResources([...selectedResources, { resource_id: resources[0].id, quantity: 1 }]);
    }
  };

  const handleRemoveResource = (index: number) => {
    setSelectedResources(selectedResources.filter((_, idx) => idx !== index));
  };

  const handleUpdateResource = (index: number, field: keyof ResourceEntry, value: number) => {
    const updated = [...selectedResources];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedResources(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload: AdvanceOrderPayload = {
        operator_name: operatorName,
        notes: notes || `Advanced step signed by ${operatorName}`,
        resources: selectedResources.filter((r) => r.quantity > 0),
      };

      const updated = await advanceOrder(order.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to advance manufacturing step');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0B101E] border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-[#0E1528] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-100">
                Advance {order.case_id}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Step Transition
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              GMP Sequential Handover & Resource Allocation
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transition Summary Banner */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 flex-1">
            <span className="text-[10px] text-slate-400 block">From Step {currentStep.sequence_order}</span>
            <span className="font-semibold text-slate-200 truncate block">{currentStep.name}</span>
          </div>

          <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />

          <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/60 flex-1">
            <span className="text-[10px] text-cyan-400 block">
              {isFinalStep ? 'Final Outcome' : `To Step ${nextStepOrder}`}
            </span>
            <span className="font-semibold text-cyan-300 truncate block">
              {isFinalStep ? 'Sterile Dispatch (Completed)' : 'Next Sequential Station'}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Error notice */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Resources Logged Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                <span>Log Consumed Resources (Step {currentStep.sequence_order})</span>
              </label>

              <button
                type="button"
                onClick={handleAddResource}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Resource</span>
              </button>
            </div>

            {selectedResources.length > 0 ? (
              <div className="space-y-2">
                {selectedResources.map((entry, index) => {
                  const resObj = resources.find((r) => r.id === entry.resource_id);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs"
                    >
                      {/* Resource Selector */}
                      <select
                        value={entry.resource_id}
                        onChange={(e) =>
                          handleUpdateResource(index, 'resource_id', parseInt(e.target.value))
                        }
                        className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 flex-1 focus:outline-none focus:border-cyan-500"
                      >
                        {resources.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} (${parseFloat(r.cost_per_unit).toFixed(2)} / {r.unit})
                          </option>
                        ))}
                      </select>

                      {/* Quantity Input */}
                      <div className="flex items-center gap-1 w-28">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          required
                          value={entry.quantity}
                          onChange={(e) =>
                            handleUpdateResource(index, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-right text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <span className="text-[11px] text-slate-400 font-mono">
                          {resObj?.unit.toLowerCase() || 'qty'}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
                No resources specified for this step transition.
              </div>
            )}
          </div>

          {/* Operator Signature */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Electronic Signature (Operator Name)
            </label>
            <input
              type="text"
              required
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Khant Lin (Lead Biomedical Engineer)"
            />
          </div>

          {/* ISO Transition Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              ISO 13485 Verification Notes / Observations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. SLM build layer-by-layer inspection passed. Stress-relief cycle complete."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording & Advancing...</span>
                </>
              ) : (
                <>
                  <span>Sign & Advance Case</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
