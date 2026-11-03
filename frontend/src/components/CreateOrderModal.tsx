'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Layers,
  AlertCircle,
  ShieldCheck,
  User,
  Sparkles,
  Loader2
} from 'lucide-react';
import { ImplantType, Priority, CreateOrderPayload, Order } from '@/types';
import { createOrder } from '@/lib/api';

interface CreateOrderModalProps {
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

export default function CreateOrderModal({ onClose, onSuccess }: CreateOrderModalProps) {
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const [caseId, setCaseId] = useState(`CAS-2026-${randomSuffix}`);
  const [patientRef, setPatientRef] = useState(`PT-BKK-${Math.floor(100 + Math.random() * 900)}`);
  const [implantType, setImplantType] = useState<ImplantType>('CRANIAL_PLATE');
  const [priority, setPriority] = useState<Priority>('STANDARD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload: CreateOrderPayload = {
        case_id: caseId.trim(),
        patient_ref: patientRef.trim(),
        implant_type: implantType,
        priority: priority,
      };

      const newOrder = await createOrder(payload);
      onSuccess(newOrder);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create implant order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0B101E] border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-[#0E1528] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">New Patient Implant Order</h3>
              <p className="text-[11px] text-slate-400">Initiate Step 1: 3D CAD Modeling</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Case ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Case ID / DHR Number</label>
            <input
              type="text"
              required
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              placeholder="e.g. CAS-2026-090"
            />
          </div>

          {/* Patient Reference */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Anonymized Patient Reference
            </label>
            <input
              type="text"
              required
              value={patientRef}
              onChange={(e) => setPatientRef(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              placeholder="e.g. PT-BKK-802"
            />
            <p className="text-[10px] text-slate-400">
              HIPAA compliant de-identification for medical traceability.
            </p>
          </div>

          {/* Implant Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Implant Geometry Category</label>
            <select
              value={implantType}
              onChange={(e) => setImplantType(e.target.value as ImplantType)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="CRANIAL_PLATE">Custom Titanium Cranial Plate (Head/Skull)</option>
              <option value="MANDIBULAR_RECON">Mandibular Reconstruction Plate (Jaw)</option>
              <option value="HIP_ACETABULAR_CUP">Personalized Acetabular Hip Cup (Pelvis)</option>
              <option value="SPINAL_CAGE">Custom Titanium Spinal Fusion Cage (Spine)</option>
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Surgical Urgency</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPriority('STANDARD')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  priority === 'STANDARD'
                    ? 'bg-slate-800 text-slate-100 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300'
                }`}
              >
                Standard (Routine)
              </button>

              <button
                type="button"
                onClick={() => setPriority('URGENT')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                  priority === 'URGENT'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Urgent Emergency</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
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
                  <span>Initiating DHR...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Implant Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
