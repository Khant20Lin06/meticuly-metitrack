import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UDILabelGenerator } from '../components/UDILabelGenerator';
import { Order, DHRPackage } from '../types';

const mockOrder: Order = {
  id: 102,
  case_id: 'CAS-2026-082',
  patient_ref: 'PT-CNX-102',
  implant_type: 'MANDIBULAR_RECON',
  priority: 'STANDARD',
  status: 'COMPLETED',
  current_step: {
    id: 5,
    sequence_order: 5,
    code: 'STEP_LABEL',
    name: 'Medical Labelling & Packaging',
    description: 'Final UDI label and cleanroom pouching',
    suggested_resource_ids: [5],
  },
  created_at: '2026-11-04T10:00:00Z',
  updated_at: '2026-11-04T12:00:00Z',
  total_cost: '1250.00',
  consumptions: [],
  step_logs: [],
};

const mockDHR: DHRPackage = {
  case_id: 'CAS-2026-082',
  order_id: 102,
  patient_ref: 'PT-CNX-102',
  implant_type: 'MANDIBULAR_RECON',
  current_step: 'STEP_LABEL',
  status: 'COMPLETED',
  dhr_sha256_checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  digital_signature: {
    signature: '3045022100a91fcb75441d059424f48552c00220',
    key_identifier: 'METI-ADMIN-01',
    content_digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    signer: {
      signer_name: 'Plant Administrator',
      signer_username: 'admin',
      signer_role: 'ADMIN',
      signer_role_display: 'Plant Administrator',
      signer_badge: 'METI-ADMIN-01',
      certification_id: 'ISO-13485-AUDITOR-2026',
    },
    signed_at: '2026-11-04T14:30:00Z',
    algorithm: 'ECDSA-SHA256-P256',
    meaning_of_signature: 'Cleanroom Release Certification',
    is_valid: true,
  },
  udi_data: {
    gtin_14: '08859123456789',
    batch_lot: 'MTC-2026-PBF',
    gs1_128_barcode_string: '(01)08859123456789(21)CAS-2026-082(10)MTC-2026-PBF',
    serial_number: 'CAS-2026-082',
    expiration_date: '2028-12-31',
  },
  total_cost_breakdown: {
    total_cost: '1250.00',
    materials_cost: '500.00',
    machine_time_cost: '450.00',
    labor_cost: '300.00',
    step_breakdowns: [],
  },
  step_execution_history: [],
  resource_consumptions: [],
};

describe('<UDILabelGenerator />', () => {
  it('renders ISO 15223-1 & FDA 21 CFR 830 sterile pouch label fields', () => {
    render(<UDILabelGenerator order={mockOrder} dhrData={mockDHR} />);

    expect(screen.getByText(/FDA 21 CFR 830/i)).toBeInTheDocument();
    expect(screen.getAllByText('CAS-2026-082')[0]).toBeInTheDocument();
    expect(screen.getByText('PT-CNX-102')).toBeInTheDocument();
    expect(screen.getAllByText(/MTC-2026-PBF/i)[0]).toBeInTheDocument();
  });

  it('renders GS1-128 human-readable barcode string and 2D DataMatrix', () => {
    render(<UDILabelGenerator order={mockOrder} dhrData={mockDHR} />);

    expect(screen.getByText('(01)08859123456789(21)CAS-2026-082(10)MTC-2026-PBF')).toBeInTheDocument();
    expect(screen.getByText('DataMatrix')).toBeInTheDocument();
  });

  it('allows toggling between Sterile Pouch Label and Direct Part Mark (DPM)', () => {
    render(<UDILabelGenerator order={mockOrder} dhrData={mockDHR} />);

    const dpmTab = screen.getByRole('button', { name: /Direct Part Mark/i });
    fireEvent.click(dpmTab);

    expect(screen.getByText(/METICULY DPM/i)).toBeInTheDocument();
    expect(screen.getByText(/MOPA LASER/i)).toBeInTheDocument();
  });

  it('renders cleanroom print button', () => {
    render(<UDILabelGenerator order={mockOrder} dhrData={mockDHR} />);

    const printBtn = screen.getByRole('button', { name: /Print Label/i });
    expect(printBtn).toBeInTheDocument();
    expect(printBtn).toBeEnabled();
  });
});
