import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderCard } from '../components/OrderCard';
import { Order } from '../types';

const mockOrder: Order = {
  id: 101,
  case_id: 'CAS-2026-081',
  patient_ref: 'PT-BKK-491',
  implant_type: 'CRANIAL_PLATE',
  priority: 'STANDARD',
  status: 'IN_PROGRESS',
  current_step: {
    id: 2,
    sequence_order: 2,
    code: 'STEP_PRINT',
    name: '3D Metal Printing (SLM)',
    description: 'Laser powder bed fusion',
    suggested_resource_ids: [1, 2],
  },
  created_at: '2026-11-04T10:00:00Z',
  updated_at: '2026-11-04T12:00:00Z',
  total_cost: '450.00',
  consumptions: [],
  step_logs: [],
};

describe('<OrderCard />', () => {
  it('renders Case ID and anonymized Patient Reference', () => {
    const onSelect = vi.fn();
    const onAdvance = vi.fn();

    render(
      <OrderCard
        order={mockOrder}
        onSelect={onSelect}
        onAdvance={onAdvance}
        isAuthorizedToAdvance={true}
      />
    );

    expect(screen.getByText('CAS-2026-081')).toBeInTheDocument();
    expect(screen.getByText('PT-BKK-491')).toBeInTheDocument();
    expect(screen.getByText('Cranial Plate')).toBeInTheDocument();
  });

  it('renders standard priority badge for standard orders', () => {
    render(
      <OrderCard
        order={mockOrder}
        onSelect={vi.fn()}
        onAdvance={vi.fn()}
      />
    );

    expect(screen.getByText('STANDARD')).toBeInTheDocument();
  });

  it('renders urgent triage badge and pulsating border for emergency cases', () => {
    const urgentOrder: Order = {
      ...mockOrder,
      priority: 'URGENT',
    };

    render(
      <OrderCard
        order={urgentOrder}
        onSelect={vi.fn()}
        onAdvance={vi.fn()}
      />
    );

    expect(screen.getByText('URGENT')).toBeInTheDocument();
  });

  it('fires onSelect when card is clicked', () => {
    const onSelect = vi.fn();
    render(
      <OrderCard
        order={mockOrder}
        onSelect={onSelect}
        onAdvance={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('CAS-2026-081'));
    expect(onSelect).toHaveBeenCalledWith(mockOrder);
  });

  it('fires onAdvance when advance button is clicked', () => {
    const onAdvance = vi.fn();
    render(
      <OrderCard
        order={mockOrder}
        onSelect={vi.fn()}
        onAdvance={onAdvance}
        isAuthorizedToAdvance={true}
      />
    );

    const advanceBtn = screen.getByRole('button', { name: /Advance/i });
    fireEvent.click(advanceBtn);
    expect(onAdvance).toHaveBeenCalledWith(mockOrder);
  });

  it('displays role authorization required tooltip when unauthorized for station', () => {
    render(
      <OrderCard
        order={mockOrder}
        onSelect={vi.fn()}
        onAdvance={vi.fn()}
        isAuthorizedToAdvance={false}
      />
    );

    const advanceBtn = screen.getByRole('button', { name: /Advance/i });
    expect(advanceBtn).toHaveAttribute('title', 'Role Authorization Check Required');
  });
});
