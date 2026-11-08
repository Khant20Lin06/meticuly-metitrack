import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlimSidebar } from '../components/SlimSidebar';

describe('<SlimSidebar />', () => {
  it('renders all 5 primary cleanroom navigation items', () => {
    const onViewChange = vi.fn();
    render(<SlimSidebar activeView="board" onViewChange={onViewChange} />);

    expect(screen.getAllByTitle('Manufacturing Pipeline')[0]).toBeInTheDocument();
    expect(screen.getAllByTitle('Master Case Table')[0]).toBeInTheDocument();
    expect(screen.getAllByTitle('Telemetry & Financials')[0]).toBeInTheDocument();
    expect(screen.getAllByTitle('Inventory & Raw Materials')[0]).toBeInTheDocument();
    expect(screen.getAllByTitle('Security & Compliance Audit Trail')[0]).toBeInTheDocument();
  });

  it('triggers onViewChange with correct view identifier when clicked', () => {
    const onViewChange = vi.fn();
    render(<SlimSidebar activeView="board" onViewChange={onViewChange} />);

    const inventoryBtn = screen.getAllByTitle('Inventory & Raw Materials')[0];
    fireEvent.click(inventoryBtn);
    expect(onViewChange).toHaveBeenCalledWith('inventory');

    const securityBtn = screen.getAllByTitle('Security & Compliance Audit Trail')[0];
    fireEvent.click(securityBtn);
    expect(onViewChange).toHaveBeenCalledWith('security');
  });

  it('displays low-stock alert counter badge when alerts exist', () => {
    render(<SlimSidebar activeView="board" onViewChange={vi.fn()} unresolvedAlertCount={3} />);

    const alertBadges = screen.getAllByText('3');
    expect(alertBadges.length).toBeGreaterThanOrEqual(1);
    expect(alertBadges[0]).toBeInTheDocument();
  });
});
