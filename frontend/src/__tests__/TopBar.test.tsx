import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '../components/TopBar';

describe('<TopBar />', () => {
  const defaultProps = {
    activeView: 'board' as const,
    searchQuery: '',
    onSearchChange: vi.fn(),
    selectedPriority: 'ALL',
    onPriorityChange: vi.fn(),
    selectedImplantType: 'ALL',
    onImplantTypeChange: vi.fn(),
    activeRole: 'ADMIN' as const,
    onRoleChange: vi.fn(),
    onRefresh: vi.fn(),
    isLoading: false,
    onOpenCreateModal: vi.fn(),
  };

  it('renders search input and triggers onSearchChange on user input', () => {
    const onSearchChange = vi.fn();
    render(<TopBar {...defaultProps} onSearchChange={onSearchChange} />);

    const searchInput = screen.getByPlaceholderText(/Search Case ID/i);
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'CAS-2026' } });
    expect(onSearchChange).toHaveBeenCalledWith('CAS-2026');
  });

  it('triggers onOpenCreateModal when "+ New Case" button is clicked', () => {
    const onOpenCreateModal = vi.fn();
    render(<TopBar {...defaultProps} onOpenCreateModal={onOpenCreateModal} />);

    const newCaseBtn = screen.getByRole('button', { name: /New Case/i });
    fireEvent.click(newCaseBtn);
    expect(onOpenCreateModal).toHaveBeenCalledTimes(1);
  });

  it('switches active certified operator persona when role dropdown changes', () => {
    const onRoleChange = vi.fn();
    render(<TopBar {...defaultProps} onRoleChange={onRoleChange} />);

    const roleSelects = screen.getAllByRole('combobox');
    const roleSelect = roleSelects.find(s => s.querySelector('option[value="BIOMEDICAL_ENGINEER"]'));
    expect(roleSelect).toBeDefined();

    if (roleSelect) {
      fireEvent.change(roleSelect, { target: { value: 'BIOMEDICAL_ENGINEER' } });
      expect(onRoleChange).toHaveBeenCalledWith('BIOMEDICAL_ENGINEER');
    }
  });

  it('filters by priority when priority dropdown changes', () => {
    const onPriorityChange = vi.fn();
    render(<TopBar {...defaultProps} onPriorityChange={onPriorityChange} />);

    const prioritySelect = screen.getByDisplayValue('All Priorities');
    fireEvent.change(prioritySelect, { target: { value: 'URGENT' } });
    expect(onPriorityChange).toHaveBeenCalledWith('URGENT');
  });
});
