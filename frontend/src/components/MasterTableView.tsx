'use client';

import React, { useState, useMemo } from 'react';
import {
  Download,
  Eye,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckSquare,
  Square,
  MinusSquare,
  RotateCcw,
  FileSpreadsheet,
  Sparkles,
  ShieldCheck,
  Barcode,
  X,
  Activity,
  DollarSign,
} from 'lucide-react';
import { Order, ProcessStep, RoleKey } from '../types';
import { sanitizeCSVCell } from '../lib/security';

interface MasterTableViewProps {
  orders: Order[];
  steps?: ProcessStep[];
  onSelectOrder: (order: Order) => void;
  onAdvanceOrder: (order: Order) => void;
  activeRole: RoleKey;
}

type SortField =
  | 'case_id'
  | 'patient_ref'
  | 'implant_type'
  | 'priority'
  | 'current_step'
  | 'status'
  | 'total_cost'
  | 'created_at';

type SortDirection = 'asc' | 'desc';
type StatusTab = 'ALL' | 'WIP' | 'URGENT' | 'COMPLETED';

export const MasterTableView: React.FC<MasterTableViewProps> = ({
  orders,
  steps = [],
  onSelectOrder,
  onAdvanceOrder,
  activeRole,
}) => {
  // 1. Search & Filter States
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('ALL');
  const [selectedStepId, setSelectedStepId] = useState<string>('ALL');
  const [selectedAnatomy, setSelectedAnatomy] = useState<string>('ALL');

  // 2. Sorting State
  const [sortField, setSortField] = useState<SortField>('case_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 3. Selection State (for Bulk Operations)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());

  // 4. Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Toggle Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Clear all filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusTab('ALL');
    setSelectedStepId('ALL');
    setSelectedAnatomy('ALL');
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    statusTab !== 'ALL' ||
    selectedStepId !== 'ALL' ||
    selectedAnatomy !== 'ALL';

  // Metrics for quick summary
  const metrics = useMemo(() => {
    const total = orders.length;
    const wip = orders.filter((o) => o.status !== 'COMPLETED').length;
    const urgent = orders.filter(
      (o) => o.priority === 'URGENT' || o.priority === 'EMERGENCY'
    ).length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    const totalCost = orders.reduce(
      (acc, o) => acc + Number(o.total_cost || 0),
      0
    );

    return { total, wip, urgent, completed, totalCost };
  }, [orders]);

  // Filtering & Sorting
  const filteredAndSortedOrders = useMemo(() => {
    let result = orders.filter((order) => {
      // 1. Status Tab filter
      if (statusTab === 'WIP' && order.status === 'COMPLETED') return false;
      if (
        statusTab === 'URGENT' &&
        order.priority !== 'URGENT' &&
        order.priority !== 'EMERGENCY'
      )
        return false;
      if (statusTab === 'COMPLETED' && order.status !== 'COMPLETED')
        return false;

      // 2. Station Filter
      if (selectedStepId !== 'ALL') {
        const stepNum = Number(selectedStepId);
        if (order.current_step?.id !== stepNum && order.current_step?.sequence_order !== stepNum) {
          return false;
        }
      }

      // 3. Anatomy Filter
      if (selectedAnatomy !== 'ALL' && order.implant_type !== selectedAnatomy) {
        return false;
      }

      // 4. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCase = order.case_id.toLowerCase().includes(q);
        const matchPatient = order.patient_ref.toLowerCase().includes(q);
        const matchAnatomy =
          order.implant_type_display?.toLowerCase().includes(q) ||
          order.implant_type.toLowerCase().includes(q);
        const matchStep = order.current_step?.name.toLowerCase().includes(q);
        const matchNotes = order.step_logs?.some((l) =>
          l.notes?.toLowerCase().includes(q) || l.operator_name?.toLowerCase().includes(q)
        );

        if (!matchCase && !matchPatient && !matchAnatomy && !matchStep && !matchNotes) {
          return false;
        }
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'total_cost') {
        aVal = Number(a.total_cost || 0);
        bVal = Number(b.total_cost || 0);
      } else if (sortField === 'current_step') {
        aVal = a.current_step?.sequence_order || 0;
        bVal = b.current_step?.sequence_order || 0;
      } else if (sortField === 'priority') {
        aVal = a.priority === 'URGENT' || a.priority === 'EMERGENCY' ? 1 : 0;
        bVal = b.priority === 'URGENT' || b.priority === 'EMERGENCY' ? 1 : 0;
      } else if (sortField === 'status') {
        aVal = a.status === 'COMPLETED' ? 1 : 0;
        bVal = b.status === 'COMPLETED' ? 1 : 0;
      } else if (sortField === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [orders, statusTab, selectedStepId, selectedAnatomy, search, sortField, sortDirection]);

  // Pagination calculation
  const totalItems = filteredAndSortedOrders.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedOrders = useMemo(() => {
    if (pageSize === -1) return filteredAndSortedOrders;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedOrders.slice(start, start + pageSize);
  }, [filteredAndSortedOrders, currentPage, pageSize]);

  // Bulk Selection Handlers
  const isAllPageSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selectedOrderIds.has(o.id));

  const isSomePageSelected =
    paginatedOrders.some((o) => selectedOrderIds.has(o.id)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    const next = new Set(selectedOrderIds);
    if (isAllPageSelected) {
      paginatedOrders.forEach((o) => next.delete(o.id));
    } else {
      paginatedOrders.forEach((o) => next.add(o.id));
    }
    setSelectedOrderIds(next);
  };

  const handleToggleRow = (id: number) => {
    const next = new Set(selectedOrderIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedOrderIds(next);
  };

  // CSV Export Engine
  const exportCSV = (exportSelectedOnly: boolean = false) => {
    const targetOrders = exportSelectedOnly
      ? filteredAndSortedOrders.filter((o) => selectedOrderIds.has(o.id))
      : filteredAndSortedOrders;

    if (targetOrders.length === 0) return;

    const headers = [
      'Case ID',
      'Patient Reference',
      'Anatomical Site',
      'Priority',
      'Status',
      'Current Step Sequence',
      'Current Step Name',
      'Total Cost (USD)',
      'Material Cost (USD)',
      'Machine Cost (USD)',
      'Labor Cost (USD)',
      'Created At',
      'Latest Operator',
      'Latest Notes',
    ];

    const rows = targetOrders.map((o) => {
      const latestLog = o.step_logs && o.step_logs.length > 0 ? o.step_logs[0] : null;
      return [
        sanitizeCSVCell(o.case_id),
        sanitizeCSVCell(o.patient_ref),
        sanitizeCSVCell(o.implant_type_display || o.implant_type),
        sanitizeCSVCell(o.priority),
        sanitizeCSVCell(o.status),
        o.current_step?.sequence_order || 0,
        sanitizeCSVCell(o.current_step?.name || 'N/A'),
        Number(o.total_cost || 0).toFixed(2),
        Number(o.cost_breakdown?.material_cost || 0).toFixed(2),
        Number(o.cost_breakdown?.machine_cost || 0).toFixed(2),
        Number(o.cost_breakdown?.labor_cost || 0).toFixed(2),
        sanitizeCSVCell(o.created_at),
        sanitizeCSVCell(latestLog?.operator_name || ''),
        sanitizeCSVCell(latestLog?.notes || ''),
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute(
      'download',
      `MetiTrack_Master_Ledger_${exportSelectedOnly ? 'Selected_' : 'Full_'}${timeStamp}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sort indicator helper
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-sky-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sky-400" />
    );
  };

  return (
    <div className="flex-1 p-6 bg-zinc-950 flex flex-col gap-4 overflow-y-auto min-w-0">
      {/* 1. TOP HEADER & TELEMETRY STRIP */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100 tracking-tight">
              Master Manufacturing Ledger (စာရင်းဇယားဖြင့် အပြည့်အစုံ ကြည့်ရှုမှု)
            </h2>
            <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            ISO 13485 audit queue, case prioritization, station progression, and cumulative cost ledger
          </p>
        </div>

        {/* Quick KPI Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2 text-xs">
            <span className="text-zinc-500 font-medium">Total:</span>
            <span className="font-mono font-bold text-zinc-200">{metrics.total}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-sky-950/40 border border-sky-800/60 flex items-center gap-2 text-xs">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-sky-300 font-medium">Active WIP:</span>
            <span className="font-mono font-bold text-sky-200">{metrics.wip}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-center gap-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-rose-300 font-medium">Urgent:</span>
            <span className="font-mono font-bold text-rose-200">{metrics.urgent}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 font-medium">Released eDHR:</span>
            <span className="font-mono font-bold text-emerald-200">{metrics.completed}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400 font-medium">Ledger Total:</span>
            <span className="font-mono font-bold text-emerald-400">
              ${metrics.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED IN-TABLE TOOLBAR & FILTER CONTROLS */}
      <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/70 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Status Pills & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Filter Pills */}
          <div className="inline-flex rounded-lg bg-zinc-950 p-1 border border-zinc-800 text-xs">
            <button
              onClick={() => {
                setStatusTab('ALL');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                statusTab === 'ALL'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => {
                setStatusTab('WIP');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                statusTab === 'WIP'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>WIP ({metrics.wip})</span>
            </button>
            <button
              onClick={() => {
                setStatusTab('URGENT');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                statusTab === 'URGENT'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>🚨 Urgent ({metrics.urgent})</span>
            </button>
            <button
              onClick={() => {
                setStatusTab('COMPLETED');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                statusTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>eDHR ({metrics.completed})</span>
            </button>
          </div>

          {/* In-Table Live Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID, patient, operator..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8.5 pr-8 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Station, Anatomy Selectors & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Station Selector Dropdown */}
          <select
            value={selectedStepId}
            onChange={(e) => {
              setSelectedStepId(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All 5 Stations</option>
            {steps.map((s) => (
              <option key={s.id} value={s.sequence_order}>
                Step {s.sequence_order}: {s.name}
              </option>
            ))}
          </select>

          {/* Anatomy Selector Dropdown */}
          <select
            value={selectedAnatomy}
            onChange={(e) => {
              setSelectedAnatomy(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Anatomies</option>
            <option value="CRANIAL_PLATE">Cranial Plate</option>
            <option value="MANDIBULAR_RECON">Mandibular Recon</option>
            <option value="HIP_ACETABULAR_CUP">Hip Acetabular Cup</option>
            <option value="SPINAL_CAGE">Spinal Cage</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              title="Reset All Filters"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Export Full CSV */}
          <button
            onClick={() => exportCSV(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 3. BULK ACTION FLOATING BANNER (when rows are selected) */}
      {selectedOrderIds.size > 0 && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-sky-950/80 via-zinc-900 to-zinc-900 border border-sky-800/80 text-sky-200 flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-sky-600 text-white font-mono font-bold text-xs flex items-center justify-center">
              {selectedOrderIds.size}
            </span>
            <span className="text-xs font-medium text-sky-200">
              implant case{selectedOrderIds.size > 1 ? 's' : ''} selected across queue
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {selectedOrderIds.size} Selected (CSV)</span>
            </button>
            <button
              onClick={() => setSelectedOrderIds(new Set())}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN HIGH-DENSITY AUDITOR TABLE */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-2xl flex flex-col justify-between">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs text-zinc-300 border-collapse">
            <thead className="bg-zinc-900/95 border-b border-zinc-800 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider select-none sticky top-0 z-10 backdrop-blur-md">
              <tr>
                {/* Bulk Select Checkbox */}
                <th className="py-3 px-3.5 w-10 text-center">
                  <button
                    onClick={handleToggleSelectAllPage}
                    className="text-zinc-400 hover:text-zinc-200 transition focus:outline-none"
                    title={isAllPageSelected ? 'Deselect Page' : 'Select Page'}
                  >
                    {isAllPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                    ) : isSomePageSelected ? (
                      <MinusSquare className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-600" />
                    )}
                  </button>
                </th>

                {/* Case ID */}
                <th
                  onClick={() => handleSort('case_id')}
                  className="py-3 px-3 cursor-pointer group hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Case ID</span>
                    {renderSortIndicator('case_id')}
                  </div>
                </th>

                {/* Patient Ref */}
                <th
                  onClick={() => handleSort('patient_ref')}
                  className="py-3 px-3 cursor-pointer group hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Patient Reference</span>
                    {renderSortIndicator('patient_ref')}
                  </div>
                </th>

                {/* Anatomical Site */}
                <th
                  onClick={() => handleSort('implant_type')}
                  className="py-3 px-3 cursor-pointer group hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Anatomical Implant</span>
                    {renderSortIndicator('implant_type')}
                  </div>
                </th>

                {/* Priority */}
                <th
                  onClick={() => handleSort('priority')}
                  className="py-3 px-3 cursor-pointer group hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Priority</span>
                    {renderSortIndicator('priority')}
                  </div>
                </th>

                {/* Current Station & Pipeline */}
                <th
                  onClick={() => handleSort('current_step')}
                  className="py-3 px-3 cursor-pointer group hover:text-white transition min-w-[200px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Current Station & Progress</span>
                    {renderSortIndicator('current_step')}
                  </div>
                </th>

                {/* Status */}
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer group hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ISO 13485 Status</span>
                    {renderSortIndicator('status')}
                  </div>
                </th>

                {/* Accumulated Cost */}
                <th
                  onClick={() => handleSort('total_cost')}
                  className="py-3 px-3 text-right cursor-pointer group hover:text-white transition"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Cost</span>
                    {renderSortIndicator('total_cost')}
                  </div>
                </th>

                {/* Date */}
                <th
                  onClick={() => handleSort('created_at')}
                  className="py-3 px-3 cursor-pointer group hover:text-white transition hidden xl:table-cell"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Logged</span>
                    {renderSortIndicator('created_at')}
                  </div>
                </th>

                {/* Actions */}
                <th className="py-3 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-zinc-700 animate-pulse" />
                      <span className="font-semibold text-zinc-400">
                        No medical implant orders found
                      </span>
                      <p className="text-xs text-zinc-600 max-w-sm">
                        No cases match the active filter criteria. Try resetting filters or searching with different keywords.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sky-400 text-xs font-medium transition"
                        >
                          Reset All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isCompleted = order.status === 'COMPLETED';
                  const isUrgent = order.priority === 'URGENT' || order.priority === 'EMERGENCY';
                  const isSelected = selectedOrderIds.has(order.id);
                  const stepSequence = order.current_step?.sequence_order || 1;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className={`hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3 px-3.5 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRow(order.id);
                        }}
                      >
                        <button className="text-zinc-500 hover:text-zinc-300 transition focus:outline-none">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-700" />
                          )}
                        </button>
                      </td>

                      {/* Case ID */}
                      <td className="py-3 px-3 font-mono font-bold text-zinc-100 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-400'
                                : isUrgent
                                ? 'bg-rose-500 animate-pulse'
                                : 'bg-sky-400'
                            }`}
                          />
                          <span>{order.case_id}</span>
                        </div>
                      </td>

                      {/* Patient Reference */}
                      <td className="py-3 px-3 font-mono text-zinc-400 whitespace-nowrap">
                        {order.patient_ref}
                      </td>

                      {/* Anatomical Implant */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-zinc-200">
                            {order.implant_type_display || order.implant_type}
                          </span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isUrgent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-800 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            <span>🚨 URGENT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400">
                            STANDARD
                          </span>
                        )}
                      </td>

                      {/* Current Station & 5-Bar Mini Progress */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] gap-2">
                            <span className="font-semibold text-zinc-200 truncate">
                              Step {stepSequence}: {order.current_step?.name || 'Completed'}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                              {isCompleted ? '5/5' : `${stepSequence}/5`}
                            </span>
                          </div>

                          {/* 5-segment mini progress bar */}
                          <div className="flex items-center gap-1 w-full max-w-[140px]">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <div
                                key={s}
                                className={`h-1 flex-1 rounded-full transition-all ${
                                  s < stepSequence || isCompleted
                                    ? 'bg-emerald-500'
                                    : s === stepSequence
                                    ? isUrgent
                                      ? 'bg-rose-500 animate-pulse'
                                      : 'bg-sky-400'
                                    : 'bg-zinc-800'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>eDHR Released</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/80">
                            <Clock className="w-3 h-3 text-sky-400" />
                            <span>In Production</span>
                          </span>
                        )}
                      </td>

                      {/* Accumulated Cost */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-zinc-100 whitespace-nowrap">
                        ${Number(order.total_cost || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-3 font-mono text-zinc-500 text-[11px] whitespace-nowrap hidden xl:table-cell">
                        {new Date(order.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Inspect Drawer */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectOrder(order);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                            title="Inspect in 3D & View eDHR Drawer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Advance Station */}
                          {!isCompleted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAdvanceOrder(order);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold transition shadow-sm"
                              title="Advance to Next Station"
                            >
                              <span>Advance</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION & ROWS PER PAGE FOOTER */}
        <div className="p-3.5 bg-zinc-900/90 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400 select-none">
          {/* Summary Text */}
          <div className="flex items-center gap-2">
            <span>
              Showing{' '}
              <strong className="text-zinc-200">
                {totalItems === 0 ? 0 : (currentPage - 1) * (pageSize === -1 ? totalItems : pageSize) + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-zinc-200">
                {pageSize === -1 ? totalItems : Math.min(currentPage * pageSize, totalItems)}
              </strong>{' '}
              of <strong className="text-zinc-100 font-mono">{totalItems}</strong> cases
              {orders.length !== totalItems && ` (filtered from ${orders.length} total)`}
            </span>
          </div>

          {/* Page Controls & Sizing */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
            </div>

            {/* Page Navigation Buttons */}
            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={currentPage === 1}
                  title="First Page"
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="Previous Page"
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="px-2 text-xs font-mono text-zinc-300">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  title="Next Page"
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setPage(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Last Page"
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
