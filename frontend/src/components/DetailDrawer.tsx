'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Box,
  FileText,
  DollarSign,
  History,
  QrCode,
  CheckCircle2,
  Lock,
  Printer,
  Calendar,
  User,
  ShieldCheck,
  Building,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { Order, DHRPackage, OrderCostBreakdown, ImplantType, OrderPriority } from '../types';
import { api } from '../lib/api';
import { ThreeImplantViewer } from './ThreeImplantViewer';
import { UDILabelGenerator } from './UDILabelGenerator';

interface DetailDrawerProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateMetadata: (id: number, payload: { patient_ref?: string; priority?: OrderPriority }) => Promise<void>;
  onAdvanceClick: (order: Order) => void;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateMetadata,
  onAdvanceClick,
}) => {
  const [activeTab, setActiveTab] = useState<'3d' | 'specs' | 'costs' | 'dhr' | 'udi'>('3d');
  const [dhrData, setDhrData] = useState<DHRPackage | null>(null);
  const [costData, setCostData] = useState<OrderCostBreakdown | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Metadata edit state
  const [patientRefInput, setPatientRefInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<OrderPriority>('STANDARD');
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaSuccess, setMetaSuccess] = useState(false);

  // Digital Signature & FDA 21 CFR Part 11 verification state
  const [verificationResult, setVerificationResult] = useState<{
    status: 'idle' | 'verifying' | 'valid' | 'invalid';
    message: string;
    details?: any;
  }>({ status: 'idle', message: '' });
  const [isSigning, setIsSigning] = useState(false);
  const [signMessage, setSignMessage] = useState<string | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      setPatientRefInput(order.patient_ref);
      setPriorityInput(order.priority);
      setVerificationResult({ status: 'idle', message: '' });
      setSignMessage(null);
      fetchOrderDetails(order.id);
    }
  }, [order?.id, isOpen]);

  const handleVerifySignature = async () => {
    if (!order) return;
    setVerificationResult({
      status: 'verifying',
      message: 'Running cryptographic non-repudiation verification against ledger...',
    });
    try {
      const res = await api.verifyOrderDHR(order.id);
      if (res.is_valid) {
        const algo = res.verification?.algorithm || dhrData?.digital_signature?.algorithm || 'ECDSA-SHA256-P256';
        setVerificationResult({
          status: 'valid',
          message: `${algo} signature is authentic and verified untampered. Fully satisfies FDA 21 CFR Part 11 & NIST FIPS 186-5.`,
          details: res.verification,
        });
      } else {
        setVerificationResult({
          status: 'invalid',
          message: res.reason || 'Cryptographic verification failed: Tamper detected in case records or signature.',
        });
      }
    } catch (err: any) {
      setVerificationResult({
        status: 'invalid',
        message: err.message || 'Signature verification rejected by server.',
      });
    }
  };

  const handleSignDHR = async () => {
    if (!order) return;
    setIsSigning(true);
    setSignMessage(null);
    try {
      const res = await api.signOrderDHR(order.id, 'Cleanroom Quality Assurance Release Certification', 'ECDSA-SHA256-P256');
      setDhrData(res.signed_package);
      setSignMessage('eDHR successfully signed and sealed under FDA 21 CFR Part 11 & NIST FIPS 186-5!');
      const algo = res.signed_package?.digital_signature?.algorithm || 'ECDSA-SHA256-P256';
      setVerificationResult({
        status: 'valid',
        message: `Asymmetric ${algo} signature affixed with certified operator private key and tamper-evident seal.`,
        details: res.signed_package.digital_signature,
      });
    } catch (err: any) {
      setSignMessage(`Signature failed: ${err.message || 'QA Specialist role required.'}`);
    } finally {
      setIsSigning(false);
    }
  };

  const fetchOrderDetails = async (orderId: number) => {
    setLoadingData(true);
    try {
      const [dhr, cost] = await Promise.all([
        api.getOrderDHR(orderId).catch(() => null),
        api.getOrderCostBreakdown(orderId).catch(() => null),
      ]);
      setDhrData(dhr);
      setCostData(cost);
    } catch (err) {
      console.error('Failed to load order deep details', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const handleSaveMetadata = async () => {
    setIsSavingMeta(true);
    try {
      await onUpdateMetadata(order.id, {
        patient_ref: patientRefInput,
        priority: priorityInput,
      });
      setMetaSuccess(true);
      setTimeout(() => setMetaSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingMeta(false);
    }
  };

  const isCompleted = order.status === 'COMPLETED';

  return (
    <div
      onClick={onClose}
      className="detail-drawer-overlay fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end print:bg-transparent print:backdrop-blur-none"
    >
      {/* 480px Offcanvas Slide-over Panel (Clicking inside stops propagation) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="detail-drawer-panel w-full sm:w-[480px] h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 select-none print:bg-transparent print:border-none print:shadow-none print:w-full print:animate-none"
      >
        {/* Drawer Header */}
        <div className="detail-drawer-header p-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-base font-bold text-white tracking-tight">
              {order.case_id}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isCompleted
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-sky-950 text-sky-300 border border-sky-800'
              }`}
            >
              {order.status_display}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector Buttons */}
        <div className="detail-drawer-tabs flex items-center border-b border-zinc-800/80 bg-zinc-900/40 px-2 text-xs print:hidden">
          <button
            onClick={() => setActiveTab('3d')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition ${
              activeTab === '3d'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Mesh</span>
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition ${
              activeTab === 'specs'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Specs</span>
          </button>
          <button
            onClick={() => setActiveTab('costs')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition ${
              activeTab === 'costs'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Costs</span>
          </button>
          <button
            onClick={() => setActiveTab('dhr')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition ${
              activeTab === 'dhr'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
          <button
            onClick={() => setActiveTab('udi')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition ${
              activeTab === 'udi'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>UDI / FDA</span>
          </button>
        </div>

        {/* Tab Body Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: 3D WEBGL MESH INSPECTION */}
          {activeTab === '3d' && (
            <div className="space-y-4">
              <ThreeImplantViewer
                implantType={order.implant_type}
                caseId={order.case_id}
              />

              {/* Manufacturing Parameters Callout */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between text-zinc-300 font-semibold">
                  <span>SLM Machine Parameters</span>
                  <span className="text-[11px] font-mono text-sky-400">EOS M290 / SLM 280</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-zinc-400 text-[11px]">
                  <div>
                    Laser Power: <span className="text-zinc-200 font-mono">275 W (Yb-Fiber)</span>
                  </div>
                  <div>
                    Scan Speed: <span className="text-zinc-200 font-mono">1150 mm/s</span>
                  </div>
                  <div>
                    Layer Slice: <span className="text-zinc-200 font-mono">30 µm</span>
                  </div>
                  <div>
                    Chamber O2: <span className="text-zinc-200 font-mono">&lt; 100 ppm (Ar 99.999%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPECS & METADATA */}
          {activeTab === 'specs' && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                <h4 className="font-semibold text-zinc-200 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-sky-400" />
                  Clinical Case Specifications
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="text-zinc-400 block mb-1">Anatomical Site / Implant</label>
                    <input
                      type="text"
                      disabled
                      value={order.implant_type_display}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-300 font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Anonymized Patient Reference</label>
                    <input
                      type="text"
                      value={patientRefInput}
                      onChange={(e) => setPatientRefInput(e.target.value)}
                      placeholder="e.g. PT-BKK-0921"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Manufacturing Urgency / Priority</label>
                    <select
                      value={priorityInput}
                      onChange={(e) => setPriorityInput(e.target.value as OrderPriority)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="STANDARD">Standard Priority (Standard Schedule)</option>
                      <option value="URGENT">🚨 Urgent (Emergency Surgery)</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveMetadata}
                      disabled={isSavingMeta}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-1.5"
                    >
                      {metaSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Saved Successfully!</span>
                        </>
                      ) : (
                        <span>Update Metadata</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Regulatory Traceability Footnote */}
              <div className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-950 text-[11px] text-zinc-400 leading-relaxed">
                <span className="text-zinc-300 font-semibold block mb-0.5">
                  ISO 13485:2016 Regulatory Notice
                </span>
                Modifications to patient reference or priority are logged into the append-only system
                audit trail. Current Station and State Transitions cannot be manually altered and require
                certified electronic sign-off station advance.
              </div>
            </div>
          )}

          {/* TAB 3: COST & RESOURCE CONSUMPTION LEDGER */}
          {activeTab === 'costs' && (
            <div className="space-y-4 text-xs">
              {/* Cost Summary Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <span className="text-zinc-500 text-[10px] block">Materials</span>
                  <span className="font-mono text-sm font-bold text-sky-400">
                    ${Number(costData?.cost_breakdown?.material_cost || order.cost_breakdown?.material_cost || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <span className="text-zinc-500 text-[10px] block">Machine Time</span>
                  <span className="font-mono text-sm font-bold text-indigo-400">
                    ${Number(costData?.cost_breakdown?.machine_cost || order.cost_breakdown?.machine_cost || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <span className="text-zinc-500 text-[10px] block">Labor & QA</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    ${Number(costData?.cost_breakdown?.labor_cost || order.cost_breakdown?.labor_cost || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Total Cumulative Cost Callout */}
              <div className="p-3 rounded-xl border border-sky-900/50 bg-sky-950/20 flex items-center justify-between">
                <div>
                  <span className="text-sky-300 font-semibold block text-xs">
                    Total Cumulative Case Cost
                  </span>
                  <span className="text-[10px] text-zinc-400">Formula: Σ(Quantity × Unit Cost)</span>
                </div>
                <span className="font-mono text-lg font-bold text-sky-300">
                  ${Number(costData?.total_cost || order.total_cost || 0).toFixed(2)}
                </span>
              </div>

              {/* Itemized Step-by-Step Ledger */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <div className="p-2.5 border-b border-zinc-800 text-zinc-300 font-semibold flex items-center justify-between">
                  <span>Itemized Consumption Ledger</span>
                  <span className="text-[10px] text-zinc-500">ISO 13485 Accounting</span>
                </div>

                <div className="divide-y divide-zinc-800/60 max-h-60 overflow-y-auto">
                  {costData?.by_step?.flatMap((s) => s.consumptions).length === 0 ? (
                    <div className="p-4 text-center text-zinc-500">No resources logged yet.</div>
                  ) : (
                    costData?.by_step?.map((stepGroup) => (
                      <div key={stepGroup.step_id} className="p-2.5 bg-zinc-950/40">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300 mb-1.5">
                          <span>
                            Step {stepGroup.sequence_order}: {stepGroup.step_name}
                          </span>
                          <span className="font-mono text-sky-400">
                            ${Number(stepGroup.step_total_cost).toFixed(2)}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {stepGroup.consumptions.map((c) => (
                            <div
                              key={c.consumption_id}
                              className="flex items-center justify-between text-[10px] text-zinc-400 pl-2"
                            >
                              <span>
                                {c.resource_name} ({Number(c.quantity)} {c.unit.toLowerCase()})
                              </span>
                              <span className="font-mono text-zinc-200">
                                ${Number(c.subtotal_cost).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ISO 13485 IMMUTABLE DHR AUDIT TRAIL & FDA 21 CFR PART 11 DIGITAL SIGNATURE */}
          {activeTab === 'dhr' && (
            <div className="space-y-4 text-xs">
              {/* FDA 21 CFR Part 11 Electronic Signature Certificate Card */}
              <div className="rounded-xl border border-sky-500/30 bg-gradient-to-b from-sky-950/20 to-zinc-900/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>FDA 21 CFR Part 11 Digital Signature</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                    {dhrData?.digital_signature?.algorithm === 'ECDSA-SHA256-P256'
                      ? 'ECDSA P-256 • NIST FIPS 186-5'
                      : 'HMAC-SHA256 • NON-REPUDIABLE'}
                  </span>
                </div>

                {/* Signer Manifest Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">CERTIFIED SIGNER</span>
                    <span className="font-semibold text-zinc-200">
                      {dhrData?.digital_signature?.signer?.signer_name || 'Dr. Kittipong Somboon'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">ROLE / CERTIFICATION</span>
                    <span className="font-semibold text-emerald-400">
                      {dhrData?.digital_signature?.signer?.signer_role_display || dhrData?.digital_signature?.signer?.signer_role || 'QA Specialist'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">ISO 13485 CERT ID</span>
                    <span className="font-mono text-zinc-300">
                      {dhrData?.digital_signature?.signer?.certification_id || 'ISO-13485-QA-902'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">OPERATOR BADGE</span>
                    <span className="font-mono text-zinc-300">
                      {dhrData?.digital_signature?.signer?.badge_number || 'MET-QA-089'}
                    </span>
                  </div>
                  {dhrData?.digital_signature?.signer?.key_fingerprint && (
                    <div className="col-span-2 pt-1 border-t border-zinc-800/60 flex items-center justify-between">
                      <span className="text-zinc-500 text-[10px]">ECDSA PUBLIC KEY FINGERPRINT</span>
                      <span className="font-mono text-cyan-400 text-[10px] bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                        {dhrData.digital_signature.signer.key_fingerprint}
                      </span>
                    </div>
                  )}
                  <div className="col-span-2 pt-1 border-t border-zinc-800/60">
                    <span className="text-zinc-500 block text-[10px]">STATEMENT OF INTENT (MEANING)</span>
                    <span className="text-zinc-300 italic text-[10px]">
                      &quot;{dhrData?.digital_signature?.signer?.meaning || 'QUALITY ASSURANCE RELEASE & MEDICAL DEVICE CERTIFICATION'}&quot;
                    </span>
                  </div>
                </div>

                {/* Cryptographic Hashes & Signatures */}
                <div className="space-y-1 font-mono text-[10px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>SHA-256 Digest:</span>
                    <span className="text-zinc-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                      {dhrData?.digital_signature?.content_digest ? `${dhrData.digital_signature.content_digest.slice(0, 24)}...` : 'Computing...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>{dhrData?.digital_signature?.algorithm === 'ECDSA-SHA256-P256' ? 'ECDSA DER Signature:' : 'HMAC Signature:'}</span>
                    <span className="text-sky-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                      {dhrData?.digital_signature?.signature ? `${dhrData.digital_signature.signature.slice(0, 24)}...` : 'Pending QA'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Cryptographic Verification & Sign */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleVerifySignature}
                    disabled={verificationResult.status === 'verifying'}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-[11px] transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{verificationResult.status === 'verifying' ? 'Verifying Non-Repudiation...' : 'Verify Cryptographic Signature'}</span>
                  </button>

                  <button
                    onClick={handleSignDHR}
                    disabled={isSigning}
                    className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-medium text-[11px] transition flex items-center gap-1 border border-zinc-700"
                    title="Affix official QA Specialist Electronic Signature under FDA 21 CFR Part 11"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isSigning ? 'Signing...' : 'Affix QA Signature'}</span>
                  </button>
                </div>

                {/* Verification Result Notification */}
                {verificationResult.status === 'valid' && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-tight space-y-0.5">
                      <strong className="font-semibold block text-emerald-200">Signature Authenticity Verified</strong>
                      <span>{verificationResult.message}</span>
                    </div>
                  </div>
                )}

                {verificationResult.status === 'invalid' && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-tight space-y-0.5">
                      <strong className="font-semibold block text-rose-200">Security Warning: Tamper Detected</strong>
                      <span>{verificationResult.message}</span>
                    </div>
                  </div>
                )}

                {signMessage && (
                  <div className="p-2 rounded bg-zinc-950 border border-sky-500/30 text-sky-300 text-[11px]">
                    {signMessage}
                  </div>
                )}
              </div>

              {/* DHR Station Progression History Header */}
              <div className="flex items-center justify-between text-zinc-400 pt-1">
                <span className="font-semibold text-zinc-300">
                  Device History Record (DHR) Station Timeline
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Append-Only Protected
                </span>
              </div>

              {/* Timeline Items */}
              <div className="relative pl-5 border-l-2 border-zinc-800 space-y-4">
                {(dhrData?.audit_trail || []).length > 0
                  ? dhrData!.audit_trail!.map((log, index) => (
                      <div key={log.log_id || index} className="relative group">
                        <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-zinc-900 border-2 border-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-200">
                              {log.to_step || 'Station Transition'}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {new Date(log.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-sky-400">
                            <User className="w-3 h-3" />
                            <span>Operator: {log.operator_name}</span>
                          </div>
                          {log.notes && (
                            <p className="text-[11px] text-zinc-400 italic bg-zinc-950/60 rounded p-1.5 mt-1 border border-zinc-800/40">
                              &quot;{log.notes}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  : (order.step_logs || []).map((log, index) => (
                      <div key={log.id || index} className="relative group">
                        <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-zinc-900 border-2 border-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-200">
                              {log.to_step_name || 'Station Transition'}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {new Date(log.transitioned_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-sky-400">
                            <User className="w-3 h-3" />
                            <span>Operator: {log.operator_name}</span>
                          </div>
                          {log.notes && (
                            <p className="text-[11px] text-zinc-400 italic bg-zinc-950/60 rounded p-1.5 mt-1 border border-zinc-800/40">
                              &quot;{log.notes}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          )}

          {/* TAB 5: GS1-128 UDI & FDA 21 CFR 830 BARCODE LABEL GENERATOR */}
          {activeTab === 'udi' && (
            <UDILabelGenerator order={order} dhrData={dhrData} />
          )}
        </div>

        {/* Drawer Footer Action */}
        <div className="detail-drawer-footer p-3.5 sm:p-4 border-t border-zinc-800/80 bg-zinc-900/95 backdrop-blur shrink-0 sticky bottom-0 z-20 flex items-center justify-between select-none print:hidden">
          <div className="text-xs text-zinc-400 truncate max-w-[180px]">
            Station: <span className="font-semibold text-zinc-200">{order.current_step?.name}</span>
          </div>

          {!isCompleted ? (
            <button
              type="button"
              onClick={() => {
                onAdvanceClick(order);
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <span>Advance Station ➔</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>Released & Sterile</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
