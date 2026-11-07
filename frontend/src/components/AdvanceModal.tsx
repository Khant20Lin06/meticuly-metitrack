'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Package,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  UserCheck,
  Cpu,
  Layers,
  Sparkles,
  DollarSign,
  Gauge,
  Check,
  FileCheck,
} from 'lucide-react';
import { Order, ProcessStep, Resource, RoleKey } from '../types';
import { api } from '../lib/api';

interface AdvanceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAdvanceSuccess: (updatedOrder: Order) => void;
  activeRole: RoleKey;
  allSteps: ProcessStep[];
  allResources: Resource[];
}

interface OperatorDetail {
  name: string;
  roleTitle: string;
  badge: string;
  certId: string;
  avatarBg: string;
}

const operatorDetails: Record<RoleKey, OperatorDetail> = {
  BIOMEDICAL_ENGINEER: {
    name: 'Khant Lin',
    roleTitle: 'Lead Biomedical Engineer',
    badge: 'METI-BIO-44',
    certId: 'DICOM-CAD-CERT-908',
    avatarBg: 'bg-sky-600',
  },
  PRODUCTION_OPERATOR: {
    name: 'Natthapong Sombat',
    roleTitle: 'Senior SLM / CNC Additive Machinist',
    badge: 'METI-SLM-12',
    certId: 'SLM-SOLUTIONS-280-CERT',
    avatarBg: 'bg-amber-600',
  },
  QA_SPECIALIST: {
    name: 'Waraporn Panyasiri',
    roleTitle: 'ISO 13485 Lead Quality Inspector',
    badge: 'METI-QA-08',
    certId: 'ASQ-CMM-INSPECTOR-2026',
    avatarBg: 'bg-emerald-600',
  },
  ADMIN: {
    name: 'Plant Administrator',
    roleTitle: 'Plant Operations Lead & Admin',
    badge: 'METI-ADMIN-01',
    certId: 'ISO-13485-AUDITOR-2026',
    avatarBg: 'bg-purple-600',
  },
};

const stationPresets: Record<number, Array<{ label: string; text: string }>> = {
  1: [
    { label: 'CT Slice 0.5mm', text: 'CT DICOM 0.5mm slice thickness verified.' },
    { label: 'Surgeon Approved', text: 'Surgeon screw trajectory & fixation plan approved.' },
    { label: 'Mesh Volume OK', text: 'STL solid volume and cortical bone offset verified.' },
    { label: 'ISO 13485 CAD', text: 'Design history file updated per ISO 13485 Clause 7.3.' },
  ],
  2: [
    { label: 'Chamber O₂ < 45ppm', text: 'Inert Argon atmosphere O₂ verified < 45 ppm.' },
    { label: 'Laser 280W / 30µm', text: 'Laser power 280W, 30µm layer thickness calibrated.' },
    { label: 'Bed Preheat 200°C', text: 'Titanium build platform preheated to 200°C.' },
    { label: 'Powder Lot Verified', text: 'Ti-6Al-4V ELI Grade 23 Lot #MTC-2026-PBF confirmed.' },
  ],
  3: [
    { label: 'Vacuum Anneal 840°C', text: 'Vacuum furnace stress relief 840°C in Argon (Cycle #41).' },
    { label: 'Wire-EDM Cut Pass', text: 'Substrate wire-EDM plate separation complete.' },
    { label: '5-Axis CNC ±15µm', text: 'Critical anatomical screw counter-bores milled ±15µm.' },
    { label: 'Ultrasonic Wash', text: 'Ultrasonic degreasing & particulate wash pass.' },
  ],
  4: [
    { label: 'Zeiss CMM ±20µm Pass', text: 'Zeiss CMM 3D scan max deviation +16µm (within ±25µm limit).' },
    { label: 'Passivation ASTM F86', text: 'ASTM F86 nitric acid passivation verified.' },
    { label: 'Bioburden < 10 CFU', text: 'Cleanroom ISO Class 7 bioburden count < 10 CFU/device.' },
    { label: 'Roughness Ra 0.8µm', text: 'Surface finish roughness Ra 0.8µm verified.' },
  ],
  5: [
    { label: 'GS1-128 UDI Scanned', text: 'Laser-etched GS1-128 barcode verified Grade A scan.' },
    { label: 'Tyvek Double Barrier', text: 'Dual sterile barrier pouch sealed at 135°C, peel test OK.' },
    { label: 'Cold-Chain Release', text: 'Hospital delivery package & shipping manifest sealed.' },
    { label: 'Part 11 Seal Ready', text: 'Final release certified under US FDA 21 CFR Part 11.' },
  ],
};

const getDefaultNoteForStep = (seq: number, caseId: string, implantType: string) => {
  switch (seq) {
    case 1:
      return `3D anatomical CAD modeling complete for ${caseId} (${implantType}). DICOM slices aligned and surgeon screw fixation approved.`;
    case 2:
      return `SLM laser additive manufacturing complete. Ti-6Al-4V Grade 23 powder melted at 280W. Chamber O₂: 42 ppm, 0 build anomalies.`;
    case 3:
      return `Vacuum stress relief anneal (840°C) and wire-EDM completed. 5-axis CNC interface milled within ±15µm anatomical tolerance.`;
    case 4:
      return `Zeiss CMM dimensional metrology passed (max dev +16µm). ASTM F86 passivation and bioburden testing verified for cleanroom sterile release.`;
    case 5:
      return `Medical packaging and GS1-128 UDI labeling complete. Double Tyvek sterile barrier sealed. Case ready for final eDHR cryptographic signing.`;
    default:
      return `Station ${seq} verification complete. Parameters within certified tolerances.`;
  }
};

export const AdvanceModal: React.FC<AdvanceModalProps> = ({
  order,
  isOpen,
  onClose,
  onAdvanceSuccess,
  activeRole,
  allSteps,
  allResources,
}) => {
  const [operatorName, setOperatorName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedResources, setSelectedResources] = useState<
    Array<{ resource_id: number; quantity: number }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeOp = operatorDetails[activeRole] || operatorDetails.ADMIN;

  useEffect(() => {
    if (order && isOpen) {
      setOperatorName(`${activeOp.name} (${activeOp.roleTitle})`);
      setNotes(getDefaultNoteForStep(order.current_step?.sequence_order || 1, order.case_id, order.implant_type_display));
      setErrorMessage(null);

      // Pre-fill suggested resources for this station
      const suggestedIds = order.current_step?.suggested_resource_ids || [];
      const initialResources: Array<{ resource_id: number; quantity: number }> = [];

      suggestedIds.forEach((resId) => {
        const found = allResources.find((r) => r.id === resId);
        if (found) {
          let defaultQty = 1;
          if (found.unit === 'GRAMS') defaultQty = order.implant_type.includes('CRANIAL') ? 140 : 85;
          if (found.unit === 'HOURS') defaultQty = found.category === 'MACHINE_TIME' ? 4.5 : 2.0;
          if (found.unit === 'CYCLES') defaultQty = 1;
          if (found.unit === 'UNITS') defaultQty = 1;

          initialResources.push({
            resource_id: resId,
            quantity: defaultQty,
          });
        }
      });

      setSelectedResources(initialResources);
    }
  }, [order?.id, isOpen, activeRole]);

  // Financial Live Cost Calculations - Always called unconditionally at the top level (React Rules of Hooks)
  const { stepCost, projectedTotal, hasStockError } = useMemo(() => {
    if (!order) {
      return { stepCost: 0, projectedTotal: 0, hasStockError: false };
    }
    let cost = 0;
    let stockError = false;

    selectedResources.forEach((item) => {
      const res = allResources.find((r) => r.id === item.resource_id);
      if (res) {
        cost += Number(item.quantity) * Number(res.cost_per_unit);
        if (Number(item.quantity) > Number(res.total_available)) {
          stockError = true;
        }
      }
    });

    const currentCost = Number(order.total_cost || 0);
    return {
      stepCost: cost,
      projectedTotal: currentCost + cost,
      hasStockError: stockError,
    };
  }, [selectedResources, allResources, order?.total_cost]);

  if (!isOpen || !order) return null;

  const currentSeq = order.current_step?.sequence_order || 1;
  const nextSeq = currentSeq + 1;
  const nextStep = allSteps.find((s) => s.sequence_order === nextSeq);
  const isFinalStep = currentSeq === 5;

  // RBAC permission check
  const isRoleAuthorized = (): boolean => {
    if (activeRole === 'ADMIN') return true;
    if (currentSeq === 1 && activeRole === 'BIOMEDICAL_ENGINEER') return true;
    if ((currentSeq === 2 || currentSeq === 3) && activeRole === 'PRODUCTION_OPERATOR') return true;
    if ((currentSeq === 4 || currentSeq === 5) && activeRole === 'QA_SPECIALIST') return true;
    return false;
  };

  const authorized = isRoleAuthorized();

  const handleAddResource = () => {
    const unused = allResources.find(
      (r) => !selectedResources.some((sr) => sr.resource_id === r.id)
    );
    if (unused) {
      let defaultQty = 1;
      if (unused.unit === 'GRAMS') defaultQty = 50;
      if (unused.unit === 'HOURS') defaultQty = 1.0;
      setSelectedResources([
        ...selectedResources,
        { resource_id: unused.id, quantity: defaultQty },
      ]);
    }
  };

  const handleRemoveResource = (index: number) => {
    setSelectedResources(selectedResources.filter((_, i) => i !== index));
  };

  const handleUpdateResource = (index: number, field: 'resource_id' | 'quantity', value: any) => {
    const updated = [...selectedResources];
    if (field === 'resource_id') {
      updated[index].resource_id = Number(value);
    } else {
      const numVal = parseFloat(value);
      updated[index].quantity = isNaN(numVal) ? 0 : Math.max(0, numVal);
    }
    setSelectedResources(updated);
  };

  const handleStepQuantity = (index: number, delta: number) => {
    const updated = [...selectedResources];
    const current = Number(updated[index].quantity) || 0;
    const res = allResources.find((r) => r.id === updated[index].resource_id);
    let stepAmount = delta;
    if (res?.unit === 'GRAMS') stepAmount = delta * 10;
    else if (res?.unit === 'HOURS') stepAmount = delta * 0.5;

    const nextVal = Math.max(0.1, Number((current + stepAmount).toFixed(2)));
    updated[index].quantity = nextVal;
    setSelectedResources(updated);
  };

  const handleApplyPreset = (text: string) => {
    if (notes.includes(text)) return;
    setNotes((prev) => (prev ? `${prev.trim()} ${text}` : text));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasStockError) {
      setErrorMessage('One or more resources exceed current available plant inventory.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updatedOrder = await api.advanceOrder(
        order.id,
        {
          operator_name: operatorName,
          notes: notes,
          resources: selectedResources,
          expected_step_sequence: order.current_step?.sequence_order,
        },
        activeRole
      );

      onAdvanceSuccess(updatedOrder);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to advance order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800/80 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-white tracking-wide">
              Advance Case: <span className="text-sky-400">{order.case_id}</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-300 font-mono bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60">
              {order.patient_ref}
            </span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
              {order.implant_type_display}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5-Station Visual Stepper Pipeline Header */}
        <div className="px-5 py-3 bg-zinc-900/40 border-b border-zinc-800/80">
          <div className="flex items-center justify-between gap-1">
            {[1, 2, 3, 4, 5].map((seq) => {
              const isPast = seq < currentSeq;
              const isCurrent = seq === currentSeq;
              const isTarget = seq === nextSeq;
              const shortName = seq === 1 ? 'CAD' : seq === 2 ? 'SLM Print' : seq === 3 ? 'CNC / Anneal' : seq === 4 ? 'QA Sterile' : 'UDI Release';

              let badgeClass = 'bg-zinc-900 text-zinc-500 border-zinc-800';
              if (isPast) badgeClass = 'bg-emerald-950/40 text-emerald-400 border-emerald-700/50';
              if (isCurrent) badgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500 font-bold shadow-[0_0_10px_rgba(14,165,233,0.3)]';
              if (isTarget) badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold animate-pulse';

              return (
                <div key={seq} className="flex-1 flex items-center">
                  <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] w-full justify-center ${badgeClass}`}>
                    <span className="font-mono font-bold">{seq}</span>
                    <span className="truncate">{shortName}</span>
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                    {isPast && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                  {seq < 5 && <span className="text-zinc-700 mx-0.5 text-xs">›</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-rose-300">
                  Domain Verification Rejection
                </span>
                <p className="text-[11px] leading-relaxed font-mono">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Authenticated Operator Credential Card (FDA 21 CFR Part 11 / ISO 13485) */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>Certified Station Sign-Off Credential</span>
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                authorized
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {authorized ? '✓ Role Authorized' : '⚠️ Role Discrepancy'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/90">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${activeOp.avatarBg} flex items-center justify-center font-bold text-white text-xs shadow-inner`}>
                  {activeOp.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-zinc-100 text-xs">
                    {activeOp.name}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {activeOp.roleTitle}
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-[10px] space-y-0.5">
                <div className="text-zinc-300 font-medium">Badge: <span className="text-sky-400">{activeOp.badge}</span></div>
                <div className="text-zinc-500">Cert: {activeOp.certId}</div>
              </div>
            </div>

            {!authorized && (
              <div className="text-[10px] text-amber-400/90 bg-amber-950/40 p-2 rounded border border-amber-800/40 leading-relaxed">
                <strong>Attention:</strong> Station {currentSeq} is strictly restricted to {currentSeq === 1 ? 'BIOMEDICAL_ENGINEER' : (currentSeq === 2 || currentSeq === 3) ? 'PRODUCTION_OPERATOR' : 'QA_SPECIALIST'}. Active session role is <strong>{activeRole}</strong>.
              </div>
            )}
          </div>

          {/* Manufacturing Parameters & Inspection Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-semibold flex items-center gap-1.5 text-xs">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Station Manufacturing Parameters & Notes</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">ISO 13485 Clause 7.5.8</span>
            </div>

            {/* Quick Parameter Presets */}
            <div className="flex flex-wrap gap-1.5">
              {(stationPresets[currentSeq] || []).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset.text)}
                  className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-[10px] font-mono transition flex items-center gap-1 shadow-sm"
                  title={preset.text}
                >
                  <Plus className="w-2.5 h-2.5 text-amber-400" />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record chamber oxygen PPM, laser speed, dimensional tolerance, or CMM deviation..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-100 font-mono text-[11px] leading-relaxed focus:border-sky-400 focus:ring-1 focus:ring-sky-400 focus:outline-none"
            />
          </div>

          {/* Bill of Materials (BOM) & High-Contrast Resource Allocation */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-zinc-200 font-semibold flex items-center gap-1.5 text-xs">
                <Package className="w-3.5 h-3.5 text-sky-400" />
                <span>Station Resource & Material Allocation (BOM)</span>
              </label>
              <button
                type="button"
                onClick={handleAddResource}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sky-400 hover:text-sky-300 border border-zinc-700 flex items-center gap-1 text-[11px] font-medium transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add Resource</span>
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
              {selectedResources.length === 0 ? (
                <div className="p-3 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                  No resources allocated for this step.
                </div>
              ) : (
                selectedResources.map((item, index) => {
                  const resObj = allResources.find((r) => r.id === item.resource_id);
                  const available = Number(resObj?.total_available || 0);
                  const isExceeded = item.quantity > available;
                  const lineCost = Number(item.quantity || 0) * Number(resObj?.cost_per_unit || 0);

                  return (
                    <div
                      key={index}
                      className={`p-2.5 rounded-xl border transition flex flex-col gap-2 ${
                        isExceeded
                          ? 'bg-rose-950/30 border-rose-600/80'
                          : 'bg-zinc-900/90 border-zinc-700/80 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Select Resource */}
                        <select
                          value={item.resource_id}
                          onChange={(e) => handleUpdateResource(index, 'resource_id', e.target.value)}
                          className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs font-medium focus:border-sky-400 focus:outline-none"
                        >
                          {allResources.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} (${Number(r.cost_per_unit).toFixed(2)} / {r.unit.toLowerCase()})
                            </option>
                          ))}
                        </select>

                        {/* Numerical Stepper Input */}
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(index, -1)}
                            className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-l-lg font-bold text-xs transition"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => handleUpdateResource(index, 'quantity', e.target.value)}
                            className="w-20 bg-zinc-950 border-y border-zinc-700 px-1 py-1.5 text-center font-mono font-bold text-white text-xs focus:border-sky-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(index, 1)}
                            className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-r-lg font-bold text-xs transition"
                          >
                            +
                          </button>
                        </div>

                        {/* Unit Badge */}
                        <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 px-1.5 py-1 rounded border border-zinc-700/60 uppercase">
                          {resObj?.unit.toLowerCase() || ''}
                        </span>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveResource(index)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 transition rounded hover:bg-zinc-800"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Stock availability & Line Cost Subtotal */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/80 font-mono">
                        <span className={isExceeded ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                          {isExceeded ? (
                            `⚠️ Exceeds Available Stock (Available: ${available} ${resObj?.unit.toLowerCase()})`
                          ) : (
                            `Available Stock: ${available} ${resObj?.unit.toLowerCase()}`
                          )}
                        </span>

                        <span className="font-bold text-sky-400">
                          Subtotal: ${lineCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Live Step Financial Accounting Bar */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Estimated Step Cost</span>
                <span className="font-mono font-bold text-sm text-emerald-400">
                  +${stepCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Projected Case Total</span>
                <span className="font-mono font-bold text-sm text-zinc-200">
                  ${projectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="text-[11px] text-zinc-500">
              Station {currentSeq} ➔ Station {isFinalStep ? 'Final Release' : nextSeq}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium transition border border-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || hasStockError}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md shadow-sky-950/60 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Advancing Station...</span>
                  </>
                ) : (
                  <>
                    <span>Advance to {isFinalStep ? 'Final Release' : nextStep?.name || 'Next Station'}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
