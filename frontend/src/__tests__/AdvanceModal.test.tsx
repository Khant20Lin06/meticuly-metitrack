import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvanceModal } from '../components/AdvanceModal';
import { api } from '../lib/api';
import { Order, ProcessStep, Resource } from '../types';

vi.mock('../lib/api', () => ({
  api: {
    advanceOrder: vi.fn(),
  },
}));

const mockOrder: Order = {
  id: 201,
  case_id: 'CAS-2026-081',
  patient_ref: 'PT-BKK-491',
  implant_type: 'CRANIAL_PLATE',
  priority: 'STANDARD',
  status: 'IN_PROGRESS',
  current_step: {
    id: 1,
    sequence_order: 1,
    code: 'STEP_CAD',
    name: '3D CAD Modeling & Surgical Planning',
    description: 'DICOM planning',
    suggested_resource_ids: [1],
  },
  created_at: '2026-11-04T10:00:00Z',
  updated_at: '2026-11-04T12:00:00Z',
  total_cost: '90.00',
  consumptions: [],
  step_logs: [],
};

const mockSteps: ProcessStep[] = [
  {
    id: 1,
    sequence_order: 1,
    code: 'STEP_CAD',
    name: '3D CAD Modeling & Surgical Planning',
    description: 'Planning',
    suggested_resource_ids: [1],
  },
  {
    id: 2,
    sequence_order: 2,
    code: 'STEP_PRINT',
    name: '3D Metal Printing (SLM)',
    description: '3D Printing',
    suggested_resource_ids: [2],
  },
];

const mockResources: Resource[] = [
  {
    id: 1,
    name: 'Biomedical Engineer Labor',
    category: 'LABOR',
    unit: 'hours',
    cost_per_unit: '45.00',
    total_available: '1200.00',
  },
];

describe('<AdvanceModal />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <AdvanceModal
        order={mockOrder}
        isOpen={false}
        onClose={vi.fn()}
        onAdvanceSuccess={vi.fn()}
        activeRole="ADMIN"
        allSteps={mockSteps}
        allResources={mockResources}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Case ID and current vs destination station step indicator', () => {
    render(
      <AdvanceModal
        order={mockOrder}
        isOpen={true}
        onClose={vi.fn()}
        onAdvanceSuccess={vi.fn()}
        activeRole="ADMIN"
        allSteps={mockSteps}
        allResources={mockResources}
      />
    );

    expect(screen.getByText('CAS-2026-081')).toBeInTheDocument();
    expect(screen.getByText('CAD')).toBeInTheDocument();
    expect(screen.getByText('SLM Print')).toBeInTheDocument();
  });

  it('advances station and fires onAdvanceSuccess on confirmation', async () => {
    const onAdvanceSuccess = vi.fn();
    const onClose = vi.fn();

    const mockUpdatedOrder = {
      ...mockOrder,
      current_step: mockSteps[1],
    };

    vi.mocked(api.advanceOrder).mockResolvedValue(mockUpdatedOrder);

    render(
      <AdvanceModal
        order={mockOrder}
        isOpen={true}
        onClose={onClose}
        onAdvanceSuccess={onAdvanceSuccess}
        activeRole="ADMIN"
        allSteps={mockSteps}
        allResources={mockResources}
      />
    );

    const advanceBtn = screen.getByRole('button', { name: /Advance to/i });
    fireEvent.click(advanceBtn);

    await waitFor(() => {
      expect(api.advanceOrder).toHaveBeenCalledTimes(1);
      expect(onAdvanceSuccess).toHaveBeenCalledWith(mockUpdatedOrder);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
