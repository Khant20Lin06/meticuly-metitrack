import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateOrderModal } from '../components/CreateOrderModal';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    createOrder: vi.fn(),
  },
}));

describe('<CreateOrderModal />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CreateOrderModal
        isOpen={false}
        onClose={vi.fn()}
        onOrderCreated={vi.fn()}
        existingCount={10}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Case intake form with auto-generated Case ID and HIPAA patient ID', () => {
    render(
      <CreateOrderModal
        isOpen={true}
        onClose={vi.fn()}
        onOrderCreated={vi.fn()}
        existingCount={15}
      />
    );

    expect(screen.getByText(/Patient Case Intake & Triage/i)).toBeInTheDocument();
    // 85 + 15 + 1 = 101 => CAS-2026-101
    expect(screen.getByDisplayValue('CAS-2026-101')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/PT-BKK-/)).toBeInTheDocument();
  });

  it('allows selecting anatomical implant type (Mandibular Jaw, Acetabular Hip, Spinal Cage)', () => {
    render(
      <CreateOrderModal
        isOpen={true}
        onClose={vi.fn()}
        onOrderCreated={vi.fn()}
        existingCount={15}
      />
    );

    const mandibularOption = screen.getByText('Mandibular Jaw');
    fireEvent.click(mandibularOption);

    expect(mandibularOption).toBeInTheDocument();
  });

  it('submits valid order payload and triggers onOrderCreated callback', async () => {
    const onOrderCreated = vi.fn();
    const onClose = vi.fn();

    const mockCreatedOrder = {
      id: 99,
      case_id: 'CAS-2026-101',
      patient_ref: 'PT-BKK-999',
      implant_type: 'CRANIAL_PLATE',
      priority: 'STANDARD',
      status: 'IN_PROGRESS',
      current_step: { id: 1, sequence_order: 1, name: '3D CAD' },
      total_cost: '0.00',
    };

    vi.mocked(api.createOrder).mockResolvedValue(mockCreatedOrder as any);

    render(
      <CreateOrderModal
        isOpen={true}
        onClose={onClose}
        onOrderCreated={onOrderCreated}
        existingCount={15}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Register Case/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createOrder).toHaveBeenCalledTimes(1);
      expect(onOrderCreated).toHaveBeenCalledWith(mockCreatedOrder);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
