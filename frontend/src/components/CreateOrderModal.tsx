'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Bone,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Brain,
  Activity,
  Flame,
  Check,
  Building2,
  Calendar,
  User,
  FileSpreadsheet,
} from 'lucide-react';
import { ImplantType, OrderPriority, CreateOrderPayload, Order } from '../types';
import { api } from '../lib/api';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (newOrder: Order) => void;
  existingCount: number;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  existingCount,
}) => {
  const [caseId, setCaseId] = useState('');
  const [regionCode, setRegionCode] = useState('BKK');
  const [patientRef, setPatientRef] = useState('');
  const [implantType, setImplantType] = useState<ImplantType>('CRANIAL_PLATE');
  const [priority, setPriority] = useState<OrderPriority>('STANDARD');
  const [operatorName, setOperatorName] = useState('Biomedical Intake Specialist');
  const [notes, setNotes] = useState('DICOM scans validated. Ready for 3D CAD modeling & surgical planning.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to generate a compliant HIPAA pseudo-anonymous patient hash
  const generateHipaaHash = (region: string) => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `PT-${region}-${randomDigits}`;
  };

  useEffect(() => {
    if (isOpen) {
      const nextNum = 85 + existingCount + 1;
      setCaseId(`CAS-2026-${String(nextNum).padStart(3, '0')}`);
      setPatientRef(generateHipaaHash(regionCode));
      setErrorMessage(null);
    }
  }, [isOpen, existingCount, regionCode]);

  if (!isOpen) return null;

  const handleRegeneratePatientRef = () => {
    setPatientRef(generateHipaaHash(regionCode));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreateOrderPayload = {
        case_id: caseId.trim().toUpperCase(),
        patient_ref: patientRef.trim(),
        implant_type: implantType,
        priority: priority,
        operator_name: operatorName.trim() || 'Intake Coordinator',
        notes: notes.trim() || 'Case registered into MetiTrack manufacturing queue.',
      };

      const newOrder = await api.createOrder(payload);
      onOrderCreated(newOrder);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register order into manufacturing queue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anatomy Card Options
  const anatomyOptions = [
    {
      id: 'CRANIAL_PLATE' as ImplantType,
      title: 'Cranial Plate',
      subtitle: 'Custom Titanium Cranial Plate',
      tag: 'ASTM F3001 Grade 23 ELI',
      indication: 'Decompressive craniectomy & trauma defect',
      icon: Brain,
      accent: 'border-sky-500/80 bg-sky-950/20 text-sky-400',
    },
    {
      id: 'MANDIBULAR_RECON' as ImplantType,
      title: 'Mandibular Jaw',
      subtitle: 'Mandibular Reconstruction Plate',
      tag: '30 µm Layer SLM',
      indication: 'Oncological resection & mandibular trauma',
      icon: Bone,
      accent: 'border-indigo-500/80 bg-indigo-950/20 text-indigo-400',
    },
    {
      id: 'HIP_ACETABULAR_CUP' as ImplantType,
      title: 'Acetabular Hip Cup',
      subtitle: 'Personalized Acetabular Hip Cup',
      tag: 'Trabecular Porous',
      indication: 'Complex revision total hip arthroplasty (THA)',
      icon: Activity,
      accent: 'border-amber-500/80 bg-amber-950/20 text-amber-400',
    },
    {
      id: 'SPINAL_CAGE' as ImplantType,
      title: 'Spinal Fusion Cage',
      subtitle: 'Custom Titanium Spinal Fusion Cage',
      tag: 'Diamond Lattice',
      indication: 'Lumbar interbody fusion & disc revision',
      icon: Sparkles,
      accent: 'border-emerald-500/80 bg-emerald-950/20 text-emerald-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-950 border border-sky-800/80 flex items-center justify-center text-sky-400">
              <Bone className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-100 text-sm tracking-tight">
                  Patient Case Intake & Triage (အော်ဒါလက်ခံခြင်း)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 border border-sky-800 text-sky-300 font-mono">
                  ISO 13485:2016
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                DICOM Scans Intake, Anatomical Selection & Surgical Urgency Triage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs">
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-300">Intake Validation Rejection</span>
                <p className="font-mono text-[11px] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* SECTION 1: CASE ID & HIPAA MASKED PATIENT REFERENCE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Case Identifier */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-semibold flex items-center justify-between">
                <span>Case Identifier (LOT Barcode)</span>
                <span className="text-[10px] font-mono text-zinc-500">Unique Direct Part Mark</span>
              </label>
              <input
                type="text"
                required
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="e.g. CAS-2026-086"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono text-xs focus:border-sky-500 focus:outline-none uppercase tracking-wider shadow-inner"
              />
            </div>

            {/* HIPAA Masked Patient Reference */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Patient Clinical Identifier</span>
                </span>
                <span className="text-[10px] text-emerald-400/90 font-mono">De-Identified HIPAA Compliant</span>
              </label>

              <div className="flex items-center gap-2">
                {/* Region Prefix Selector */}
                <select
                  value={regionCode}
                  onChange={(e) => {
                    const r = e.target.value;
                    setRegionCode(r);
                    setPatientRef(generateHipaaHash(r));
                  }}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2.5 text-zinc-300 font-mono text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                  title="Hospital Region Hub"
                >
                  <option value="BKK">BKK (Bangkok)</option>
                  <option value="CNX">CNX (Chiang Mai)</option>
                  <option value="PKT">PKT (Phuket)</option>
                  <option value="HDY">HDY (Hat Yai)</option>
                </select>

                {/* Patient Ref Hash Input */}
                <input
                  type="text"
                  required
                  value={patientRef}
                  onChange={(e) => setPatientRef(e.target.value)}
                  placeholder="e.g. PT-BKK-4912"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono text-xs focus:border-sky-500 focus:outline-none shadow-inner"
                />

                {/* Regenerate Random Hash Button */}
                <button
                  type="button"
                  onClick={handleRegeneratePatientRef}
                  className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition"
                  title="Generate Fresh Random HIPAA Hash"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: ANATOMICAL DESIGN SELECTOR CARDS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <Bone className="w-3.5 h-3.5 text-sky-400" />
                <span>Patient Anatomical Implant Geometry</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                ASTM F3001 Grade 23 ELI
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {anatomyOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = implantType === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => setImplantType(opt.id)}
                    className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isSelected
                        ? `${opt.accent} shadow-md shadow-sky-950/30 ring-1 ring-sky-500/50`
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-zinc-900 border border-zinc-700' : 'bg-zinc-950 border border-zinc-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-zinc-500'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-xs ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                          {opt.title}
                        </span>
                        {isSelected && (
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-black">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{opt.subtitle}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-zinc-400">
                          {opt.tag}
                        </span>
                        <span className="text-[10px] text-zinc-500 truncate">{opt.indication}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: SURGICAL URGENCY & TRIAGE PRIORITY */}
          <div className="space-y-2">
            <label className="text-zinc-300 font-semibold flex items-center justify-between">
              <span>အရေးပေါ်အဆင့် သတ်မှတ်ခြင်း (Surgical Urgency Triage)</span>
              <span className="text-[10px] font-mono text-zinc-400">Additive SLA Priority</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Standard Priority */}
              <div
                onClick={() => setPriority('STANDARD')}
                className={`p-3.5 rounded-xl border cursor-pointer transition select-none flex items-start gap-3 ${
                  priority === 'STANDARD'
                    ? 'border-zinc-600 bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-500/40'
                    : 'border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900/50 text-zinc-400'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-200">Standard Schedule</span>
                    {priority === 'STANDARD' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Standard 5-day additive manufacturing turnaround. Batch nesting on SLM plate.
                  </p>
                </div>
              </div>

              {/* Option 2: Urgent Trauma Surgery */}
              <div
                onClick={() => setPriority('URGENT')}
                className={`p-3.5 rounded-xl border cursor-pointer transition select-none flex items-start gap-3 ${
                  priority === 'URGENT'
                    ? 'border-rose-600 bg-rose-950/40 text-rose-100 shadow-md shadow-rose-950/50 ring-1 ring-rose-500'
                    : 'border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900/50 text-zinc-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    priority === 'URGENT'
                      ? 'bg-rose-900/80 border border-rose-700 text-rose-300'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-500'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold text-xs ${
                        priority === 'URGENT' ? 'text-rose-300 font-bold' : 'text-zinc-200'
                      }`}
                    >
                      🚨 Urgent Trauma Surgery
                    </span>
                    {priority === 'URGENT' && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-900 text-rose-200 text-[9px] font-bold animate-pulse">
                        EXPEDITED
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      priority === 'URGENT' ? 'text-rose-300/80' : 'text-zinc-400'
                    }`}
                  >
                    24–48h emergency hospital SLA. Immediate build plate pre-emption & expedited wire EDM.
                  </p>
                </div>
              </div>
            </div>

            {/* Glowing Urgent Alert Banner when Urgent is active */}
            {priority === 'URGENT' && (
              <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800/80 text-rose-200 text-[11px] flex items-center gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Emergency Surgical Triage Flag Active:</strong> This case will be highlighted in
                  red across the pipeline board with priority dispatch to SLM Printer #1.
                </span>
              </div>
            )}
          </div>

          {/* SECTION 4: INTAKE OPERATOR & CLINICAL NOTES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-zinc-400 block font-medium">Intake Specialist (Sign-Off)</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="e.g. Biomedical Specialist"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-zinc-100 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 block font-medium">Clinical Triage & DICOM Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hospital DICOM notes..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Regulatory Intake Callout Footnote */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>
                Enters <strong>Step 1: 3D CAD Modeling & Surgical Planning</strong>
              </span>
            </div>
            <span className="font-mono text-zinc-500 text-[10px]">ISO 13485 Initial Sealed Log</span>
          </div>

          {/* Form Actions */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-medium transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl font-semibold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50 ${
                priority === 'URGENT'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-950/60'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering Case into MES...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Register Patient Implant Case</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
