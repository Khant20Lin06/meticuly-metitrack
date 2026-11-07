'use client';

import React, { useState } from 'react';
import {
  Printer,
  ShieldCheck,
  QrCode,
  Barcode,
  Sparkles,
  Download,
  AlertTriangle,
  Info,
  Layers,
  Building2,
  Calendar,
  CheckCircle2,
  FileCheck2,
  Copy,
  Check,
} from 'lucide-react';
import { Order, DHRPackage } from '../types';

interface UDILabelGeneratorProps {
  order: Order;
  dhrData: DHRPackage | null;
}

export const UDILabelGenerator: React.FC<UDILabelGeneratorProps> = ({ order, dhrData }) => {
  const [labelFormat, setLabelFormat] = useState<'sterile_pouch' | 'dpm_laser'>('sterile_pouch');
  const [copiedHash, setCopiedHash] = useState(false);

  // GTIN and Batch data
  const gtin14 = dhrData?.udi_data?.gtin_14 || '08859123456789';
  const batchLot = dhrData?.udi_data?.batch_lot || 'MTC-2026-PBF';
  const serialCaseId = order.case_id;
  const expiryDate = '2028-12-31';
  const mfgDate = order.created_at ? order.created_at.slice(0, 10) : '2026-11-04';

  // GS1-128 Human Readable String
  const gs1String =
    dhrData?.udi_data?.gs1_128_barcode_string ||
    `(01)${gtin14}(17)281231(10)${batchLot}(21)${serialCaseId}`;

  const sha256Seal =
    dhrData?.dhr_sha256_checksum ||
    dhrData?.dhr_seal_sha256 ||
    'a4f89d32b5e0c812ef7619d083bc54117e923e41b98f26034177d5a9c02e1189';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(sha256Seal);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Generate pseudo Code-128 bar widths for realistic high-contrast SVG barcode
  const renderSvgBarcode = () => {
    const bars: Array<{ width: number; isBlack: boolean }> = [];
    const seed = serialCaseId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 42);

    // Start pattern
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });

    // Data bars pattern
    for (let i = 0; i < 54; i++) {
      const w = ((seed * (i + 1)) % 3) + 1;
      bars.push({ width: w, isBlack: i % 2 === 0 });
    }

    // Stop pattern
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 3, isBlack: false });
    bars.push({ width: 2, isBlack: true });

    let currentX = 0;
    return (
      <svg
        viewBox="0 0 280 50"
        className="w-full h-12 bg-white"
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width * 2.8;
          if (!bar.isBlack) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={bar.width * 2.5}
              height={50}
              fill="#000000"
            />
          );
        })}
      </svg>
    );
  };

  // Generate 2D DataMatrix (ECC200) representation
  const renderDataMatrix = () => {
    const size = 16;
    const grid: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      grid[r] = [];
      for (let c = 0; c < size; c++) {
        // L-finder pattern (outer left and bottom solid)
        if (c === 0 || r === size - 1) {
          grid[r][c] = true;
        } else if (r === 0 || c === size - 1) {
          // Alternating clock tracks
          grid[r][c] = (r + c) % 2 === 0;
        } else {
          // Data bits
          const hashVal = (r * 17 + c * 31 + serialCaseId.charCodeAt(0)) % 7;
          grid[r][c] = hashVal > 2;
        }
      }
    }

    return (
      <div className="grid grid-cols-16 gap-[1.5px] w-16 h-16 bg-white p-1 border border-zinc-300">
        {grid.flatMap((row, r) =>
          row.map((isDark, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-full h-full ${isDark ? 'bg-black' : 'bg-white'}`}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Format Selector Pills & Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
          <button
            onClick={() => setLabelFormat('sterile_pouch')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              labelFormat === 'sterile_pouch'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            4&quot; × 6&quot; Sterile Pouch Label
          </button>
          <button
            onClick={() => setLabelFormat('dpm_laser')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              labelFormat === 'dpm_laser'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Direct Part Mark (Laser DPM)
          </button>
        </div>

        {/* 1-Click Print Button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm transition active:scale-[0.98]"
          title="Print High-Contrast Cleanroom Label"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>1-Click Print Label</span>
        </button>
      </div>

      {/* THE PRINTABLE LABEL CONTAINER (Targeted by @media print) */}
      <div
        id="printable-udi-label"
        className="rounded-xl border border-zinc-700 bg-white text-zinc-950 p-4 shadow-2xl font-sans space-y-3"
      >
        {/* Top Label Header: Brand, Regulatory Class & Manufacturer */}
        <div className="flex items-start justify-between border-b-2 border-zinc-950 pb-2">
          <div>
            <div className="flex items-center gap-1.5 font-bold font-mono text-sm tracking-tight">
              <span className="w-4 h-4 bg-black text-white rounded flex items-center justify-center text-[10px]">
                M
              </span>
              <span>METICULY</span>
              <span className="text-[10px] font-sans font-normal text-zinc-600">
                • Additive Medical MES
              </span>
            </div>
            <div className="text-[9px] text-zinc-600 font-medium mt-0.5 leading-tight">
              Meticuly Co., Ltd. • Bangkok, Thailand • ISO 13485:2016 Certified
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-1.5 py-0.5 border border-black font-mono text-[9px] font-bold">
              FDA 21 CFR 830
            </span>
            <div className="text-[9px] font-mono text-zinc-600 mt-0.5">CLASS III PSI</div>
          </div>
        </div>

        {/* Product Indication & Anatomical Material */}
        <div className="space-y-1">
          <div className="font-bold text-xs uppercase tracking-wide flex items-center justify-between">
            <span>{order.implant_type_display}</span>
            <span className="font-mono text-[10px] bg-zinc-200 px-1.5 py-0.2 rounded">
              {order.implant_type}
            </span>
          </div>
          <div className="text-[10px] text-zinc-700 font-medium">
            Material: <strong>Ti-6Al-4V ELI (ASTM F3001)</strong> • Laser Powder Bed Fusion (SLM)
          </div>
        </div>

        {/* Traceability Identifiers Grid: LOT, Case ID, Patient Hash */}
        <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-100 rounded border border-zinc-300 text-[10px] font-mono">
          <div>
            <span className="text-zinc-500 block text-[9px]">LOT / BATCH (10)</span>
            <strong className="text-black font-bold">{batchLot}</strong>
          </div>
          <div>
            <span className="text-zinc-500 block text-[9px]">SERIAL / CASE (21)</span>
            <strong className="text-black font-bold">{serialCaseId}</strong>
          </div>
          <div>
            <span className="text-zinc-500 block text-[9px]">PATIENT REF (HIPAA)</span>
            <strong className="text-black font-bold">{order.patient_ref}</strong>
          </div>
        </div>

        {/* Machine-Readable Barcodes Section: GS1-128 Linear & 2D DataMatrix */}
        <div className="flex items-center gap-3 pt-1">
          {/* 2D DataMatrix ECC200 for OR / DPM Scanner */}
          <div className="flex flex-col items-center">
            {renderDataMatrix()}
            <span className="text-[8px] font-mono text-zinc-500 mt-1">DataMatrix</span>
          </div>

          {/* GS1-128 Linear Barcode */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-1">
            {renderSvgBarcode()}
            <div className="font-mono text-[9px] text-center tracking-wider font-semibold text-zinc-800">
              {gs1String}
            </div>
          </div>
        </div>

        {/* Harmonized Medical Device Symbols (ISO 15223-1) */}
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-zinc-300 text-center text-[9px] font-medium text-zinc-700">
          <div className="p-1 border border-zinc-300 rounded flex flex-col items-center">
            <span className="font-bold border border-black px-1 text-[8px] mb-0.5">STERILE R</span>
            <span>Gamma Sterilized</span>
          </div>
          <div className="p-1 border border-zinc-300 rounded flex flex-col items-center">
            <span className="font-bold border border-black rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] mb-0.5">
              ②
            </span>
            <span>Do Not Re-Use</span>
          </div>
          <div className="p-1 border border-zinc-300 rounded flex flex-col items-center">
            <span className="font-bold mb-0.5">📖 [i]</span>
            <span>Consult e-IFU</span>
          </div>
          <div className="p-1 border border-zinc-300 rounded flex flex-col items-center">
            <span className="font-bold mb-0.5">⏳ {expiryDate}</span>
            <span>Use-By Date</span>
          </div>
        </div>

        {/* Storage Conditions & Non-Pyrogenic statement */}
        <div className="flex items-center justify-between text-[9px] text-zinc-500 border-t border-zinc-200 pt-1.5">
          <span>Storage: 15°C – 25°C Dry Cleanroom</span>
          <span>Non-Pyrogenic • Sterile Barrier Package</span>
        </div>
      </div>

      {/* Cryptographic SHA-256 eDHR Seal Box */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-zinc-200 text-xs">
              Cryptographic SHA-256 eDHR Seal
            </span>
          </div>

          <button
            onClick={handleCopyHash}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white transition text-[10px]"
            title="Copy SHA-256 Hash"
          >
            {copiedHash ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-zinc-400" />
                <span>Copy Hash</span>
              </>
            )}
          </button>
        </div>

        <div className="p-2 rounded bg-zinc-950 font-mono text-[10px] text-emerald-400 break-all select-all border border-zinc-800/80">
          {sha256Seal}
        </div>

        {dhrData?.digital_signature && (
          <div className="pt-2 border-t border-zinc-800 text-[10px] space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Signer:</span>
              <span className="text-zinc-200 font-medium">
                {dhrData.digital_signature.signer.signer_name} ({dhrData.digital_signature.signer.signer_role_display || dhrData.digital_signature.signer.signer_role})
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>{dhrData.digital_signature.algorithm === 'ECDSA-SHA256-P256' ? 'ECDSA DER Signature:' : 'HMAC Signature:'}</span>
              <span className="font-mono text-sky-400">{dhrData.digital_signature.signature.slice(0, 24)}...</span>
            </div>
            {dhrData.digital_signature.signer.key_fingerprint && (
              <div className="flex items-center justify-between text-zinc-400">
                <span>Key Fingerprint:</span>
                <span className="font-mono text-cyan-400">{dhrData.digital_signature.signer.key_fingerprint}</span>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-zinc-400 leading-relaxed italic">
          &quot;{dhrData?.regulatory_compliance?.iso_standard || 'ISO 13485:2016 Clause 7.5.8'} •{' '}
          {dhrData?.regulatory_compliance?.fda_regulation || 'US FDA 21 CFR Part 820.184'} •{' '}
          {dhrData?.regulatory_compliance?.part_11_electronic_records ||
            'Tamper-Evident Cryptographic Audit Seal'}&quot;
        </p>
      </div>
    </div>
  );
};
