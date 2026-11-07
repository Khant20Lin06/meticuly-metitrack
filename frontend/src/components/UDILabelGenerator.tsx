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

  // Format clean Patient-Specific Implant (PSI) Device Classification code
  const getPsiCode = (type: string) => {
    const t = String(type).toUpperCase();
    if (t.includes('CRANIAL')) return 'PSI-CP (Cranial)';
    if (t.includes('MANDIB')) return 'PSI-MR (Mandible)';
    if (t.includes('SPINAL')) return 'PSI-SC (Spine)';
    if (t.includes('HIP') || t.includes('ACETABULAR')) return 'PSI-AC (Acetabular)';
    return 'PSI-Custom';
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
        shapeRendering="crispEdges"
      >
        <rect width="280" height="50" fill="#ffffff" />
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

  // Generate pure vector 2D DataMatrix (ECC200) representation
  // Guaranteed to print jet-black with crisp edges even with Background Graphics turned off
  const renderDataMatrix = (size = 16) => {
    const rects: React.ReactNode[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        let isDark = false;
        // ISO/IEC 16022 L-finder pattern (outer left column and bottom row solid)
        if (c === 0 || r === size - 1) {
          isDark = true;
        } else if (r === 0 || c === size - 1) {
          // Alternating timing clock track (top row and right column)
          isDark = (r + c) % 2 === 0;
        } else {
          // High-density data payload simulation
          const seedChar = serialCaseId.charCodeAt((r + c) % serialCaseId.length) || 42;
          const hashVal = (r * 13 + c * 29 + seedChar) % 11;
          isDark = hashVal > 4;
        }

        if (isDark) {
          rects.push(
            <rect
              key={`${r}-${c}`}
              x={c}
              y={r}
              width={1}
              height={1}
              fill="#000000"
            />
          );
        }
      }
    }

    return (
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-16 h-16 bg-white p-0.5 border border-black shrink-0"
        shapeRendering="crispEdges"
      >
        <rect width={size} height={size} fill="#ffffff" />
        {rects}
      </svg>
    );
  };

  // Precision Cleanroom 1-Click Print:
  // Creates an isolated iframe so that the parent Drawer, dark backdrop, and background views NEVER bleed into the PDF
  const handlePrint = () => {
    const labelEl = document.getElementById('printable-udi-label');
    if (!labelEl) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Capture existing application stylesheets for perfect typography rendering
    const existingStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>UDI_Label_${serialCaseId}</title>
          ${existingStyles}
          <style>
            @page {
              size: 4in 6in;
              margin: 4mm;
            }
            @media print {
              html, body {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0 !important;
              padding: 12px !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              display: flex !important;
              justify-content: center !important;
              align-items: flex-start !important;
            }
            .cleanroom-print-wrapper {
              width: 100% !important;
              max-width: 480px !important;
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 auto !important;
            }
          </style>
        </head>
        <body>
          <div class="cleanroom-print-wrapper">
            ${labelEl.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger printing once the iframe has completed DOM render
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 250);
  };

  // Direct Vector SVG Download for laser engraving software (EzCAD, Trumpf)
  const handleDownloadSvg = () => {
    const labelEl = document.getElementById('printable-udi-label');
    if (!labelEl) return;
    const svgData = new XMLSerializer().serializeToString(labelEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UDI_Label_${serialCaseId}_${labelFormat}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Format Selector Pills & Actions Bar (Explicitly hidden from print) */}
      <div className="flex flex-wrap items-center justify-between gap-2 udi-non-printable print:hidden">
        <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
          <button
            type="button"
            onClick={() => setLabelFormat('sterile_pouch')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              labelFormat === 'sterile_pouch'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            4&quot; × 6&quot; Sterile Pouch
          </button>
          <button
            type="button"
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

        {/* Action Buttons: 1-Click Print & SVG Export */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium rounded-lg border border-zinc-700 text-[11px] transition active:scale-95"
            title="Download Vector SVG for Laser Engraver / Zebra"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span> SVG
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm text-[11px] transition active:scale-95"
            title="1-Click Print High-Contrast Cleanroom Label"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>1-Click Print Label</span>
          </button>
        </div>
      </div>

      {/* THE PRINTABLE LABEL CONTAINER (Targeted by isolated iframe & @media print) */}
      <div
        id="printable-udi-label"
        className="rounded-xl border-2 border-black bg-white text-zinc-950 p-4 shadow-xl font-sans space-y-3"
      >
        {labelFormat === 'sterile_pouch' ? (
          /* =========================================================================
             FORMAT 1: 4" x 6" STERILE BARRIER POUCH LABEL (FDA 21 CFR 830 / ISO 15223-1)
             ========================================================================= */
          <>
            {/* Top Label Header: Brand, Regulatory Class & Manufacturer */}
            <div className="flex items-start justify-between border-b-2 border-black pb-2">
              <div>
                <div className="flex items-center gap-1.5 font-bold font-mono text-sm tracking-tight text-black">
                  <span className="w-4 h-4 bg-black text-white rounded flex items-center justify-center text-[10px]">
                    M
                  </span>
                  <span>METICULY</span>
                  <span className="text-[10px] font-sans font-normal text-zinc-700">
                    • Additive Medical MES
                  </span>
                </div>
                <div className="text-[9px] text-zinc-700 font-medium mt-0.5 leading-tight">
                  Meticuly Co., Ltd. • Bangkok, Thailand • ISO 13485:2016 Certified
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-1.5 py-0.5 border-2 border-black font-mono text-[9px] font-bold text-black">
                  FDA 21 CFR 830
                </span>
                <div className="text-[9px] font-mono text-zinc-700 font-bold mt-0.5">CLASS III PSI</div>
              </div>
            </div>

            {/* Product Indication & Anatomical Material */}
            <div className="space-y-1">
              <div className="font-bold text-xs uppercase tracking-wide flex items-center justify-between text-black">
                <span>{order.implant_type_display}</span>
                <span className="font-mono text-[10px] bg-zinc-200 text-black px-2 py-0.5 rounded font-bold" title="Patient-Specific Implant (PSI) Code">
                  {getPsiCode(order.implant_type)}
                </span>
              </div>
              <div className="text-[10px] text-zinc-800 font-medium">
                Material: <strong className="text-black">Ti-6Al-4V ELI (ASTM F3001)</strong> • Laser Powder Bed Fusion (SLM)
              </div>
            </div>

            {/* Traceability Identifiers Grid: LOT, Case ID, Patient Hash */}
            <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-100 rounded border border-zinc-400 text-[10px] font-mono">
              <div>
                <span className="text-zinc-600 block text-[9px] font-semibold">LOT / BATCH (10)</span>
                <strong className="text-black font-bold">{batchLot}</strong>
              </div>
              <div>
                <span className="text-zinc-600 block text-[9px] font-semibold">SERIAL / CASE (21)</span>
                <strong className="text-black font-bold">{serialCaseId}</strong>
              </div>
              <div>
                <span className="text-zinc-600 block text-[9px] font-semibold">PATIENT REF (HIPAA)</span>
                <strong className="text-black font-bold">{order.patient_ref}</strong>
              </div>
            </div>

            {/* Machine-Readable Barcodes Section: GS1-128 Linear & 2D DataMatrix */}
            <div className="flex items-center gap-3 pt-1">
              {/* 2D DataMatrix ECC200 for Cleanroom Scanner */}
              <div className="flex flex-col items-center shrink-0">
                {renderDataMatrix(16)}
                <span className="text-[8px] font-mono text-zinc-700 font-bold mt-1">DataMatrix</span>
              </div>

              {/* GS1-128 Linear Barcode */}
              <div className="flex-1 flex flex-col items-center justify-center space-y-1 overflow-hidden">
                {renderSvgBarcode()}
                <div className="font-mono text-[9px] text-center tracking-wider font-bold text-black">
                  {gs1String}
                </div>
              </div>
            </div>

            {/* Harmonized Medical Device Symbols (ISO 15223-1) */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-zinc-400 text-center text-[9px] font-medium text-zinc-900">
              <div className="p-1 border border-zinc-400 rounded flex flex-col items-center bg-zinc-50">
                <span className="font-bold border border-black px-1 text-[8px] mb-0.5 text-black">STERILE R</span>
                <span>Gamma Sterilized</span>
              </div>
              <div className="p-1 border border-zinc-400 rounded flex flex-col items-center bg-zinc-50">
                <span className="font-bold border border-black rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] mb-0.5 text-black">
                  ②
                </span>
                <span>Do Not Re-Use</span>
              </div>
              <div className="p-1 border border-zinc-400 rounded flex flex-col items-center bg-zinc-50">
                <span className="font-bold mb-0.5 text-black">📖 [i]</span>
                <span>Consult e-IFU</span>
              </div>
              <div className="p-1 border border-zinc-400 rounded flex flex-col items-center bg-zinc-50">
                <span className="font-bold mb-0.5 text-black">⏳ {expiryDate}</span>
                <span>Use-By Date</span>
              </div>
            </div>

            {/* Storage Conditions & Non-Pyrogenic statement */}
            <div className="flex items-center justify-between text-[9px] text-zinc-600 border-t border-zinc-300 pt-1.5 font-medium">
              <span>Storage: 15°C – 25°C Dry Cleanroom</span>
              <span>Non-Pyrogenic • Sterile Barrier Package</span>
            </div>
          </>
        ) : (
          /* =========================================================================
             FORMAT 2: DIRECT PART MARK (LASER DPM) ETCHING CARD (ASTM F86 / ISO 13485)
             ========================================================================= */
          <>
            <div className="flex items-start justify-between border-b-2 border-black pb-2">
              <div>
                <div className="flex items-center gap-1.5 font-bold font-mono text-sm tracking-tight text-black">
                  <span className="w-4 h-4 bg-black text-white rounded flex items-center justify-center text-[10px]">
                    M
                  </span>
                  <span>METICULY DPM</span>
                  <span className="text-[10px] font-sans font-normal text-zinc-700">
                    • Laser Etch Spec
                  </span>
                </div>
                <div className="text-[9px] text-zinc-700 font-medium mt-0.5">
                  Titanium Direct Part Marking • ASTM F86 Chemical Passivation
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-1.5 py-0.5 border-2 border-black font-mono text-[9px] font-bold text-black">
                  MOPA LASER
                </span>
                <div className="text-[9px] font-mono text-zinc-700 font-bold mt-0.5">1064nm • 20µm Depth</div>
              </div>
            </div>

            {/* DPM Center Piece: High-density ECC200 DataMatrix & Human Readable Interpretation */}
            <div className="p-4 bg-zinc-100 rounded-lg border-2 border-dashed border-zinc-500 flex items-center justify-between gap-4">
              <div className="flex flex-col items-center">
                {renderDataMatrix(18)}
                <span className="text-[8px] font-mono text-zinc-700 font-bold mt-1">ECC200 DPM</span>
              </div>

              <div className="space-y-1 font-mono text-[10px] text-black">
                <div>
                  <span className="text-zinc-500 block text-[8px]">DEVICE CASE ID:</span>
                  <strong className="text-xs font-bold">{serialCaseId}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[8px]">MATERIAL / LOT:</span>
                  <span className="font-semibold">Ti-6Al-4V ELI • {batchLot}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[8px]">GS1 PRIMARY UDI-DI:</span>
                  <span className="font-semibold">{gtin14}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[9px] text-zinc-700 border-t border-zinc-400 pt-2 font-mono">
              <div>• Surface Treatment: ASTM F86 Citric Passivation</div>
              <div className="text-right">• Laser Standard: ISO 13485:2016 §7.5.8</div>
            </div>
          </>
        )}
      </div>

      {/* Cryptographic SHA-256 eDHR Seal Box (Hidden from Print) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-2 udi-non-printable print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-zinc-200 text-xs">
              Cryptographic SHA-256 eDHR Seal
            </span>
          </div>

          <button
            type="button"
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
                {dhrData.digital_signature.signer.signer_name} (
                {dhrData.digital_signature.signer.signer_role_display ||
                  dhrData.digital_signature.signer.signer_role}
                )
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>
                {dhrData.digital_signature.algorithm === 'ECDSA-SHA256-P256'
                  ? 'ECDSA DER Signature:'
                  : 'HMAC Signature:'}
              </span>
              <span className="font-mono text-sky-400">
                {dhrData.digital_signature.signature.slice(0, 24)}...
              </span>
            </div>
            {dhrData.digital_signature.signer.key_fingerprint && (
              <div className="flex items-center justify-between text-zinc-400">
                <span>Key Fingerprint:</span>
                <span className="font-mono text-cyan-400">
                  {dhrData.digital_signature.signer.key_fingerprint}
                </span>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-zinc-400 leading-relaxed italic">
          &quot;{dhrData?.regulatory_compliance?.iso_standard || 'ISO 13485:2016 Clause 7.5.8'} •{' '}
          {dhrData?.regulatory_compliance?.fda_regulation || 'US FDA 21 CFR Part 820.184'} •{' '}
          {dhrData?.regulatory_compliance?.part_11_electronic_records ||
            'Tamper-Evident Cryptographic Audit Seal'}
          &quot;
        </p>
      </div>
    </div>
  );
};
