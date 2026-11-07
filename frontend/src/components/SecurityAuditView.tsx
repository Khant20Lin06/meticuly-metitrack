'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  User,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Activity,
  Terminal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileSpreadsheet,
  Globe,
} from 'lucide-react';
import { SecurityAuditEvent } from '../types';
import { api } from '../lib/api';
import { sanitizeCSVCell } from '../lib/security';

export const SecurityAuditView: React.FC = () => {
  const [logs, setLogs] = useState<SecurityAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'CRITICAL' | 'AUTH' | 'TAMPER' | 'DHR'>('ALL');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getSecurityLogs({
        event_type: selectedEventType !== 'ALL' ? selectedEventType : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
        actor: searchQuery ? searchQuery : undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load security audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedEventType, selectedSeverity]);

  // Derived KPI metrics
  const totalEvents = logs.length;
  const criticalCount = logs.filter((l) => l.severity === 'CRITICAL').length;
  const authFailures = logs.filter((l) => l.event_type === 'AUTH_FAILED').length;
  const tamperCount = logs.filter((l) => l.event_type === 'TAMPER_DETECTED').length;
  const dhrSignedCount = logs.filter((l) => l.event_type === 'DHR_SIGNED').length;

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Quick Filter Tab
      if (quickFilter === 'CRITICAL' && log.severity !== 'CRITICAL') return false;
      if (quickFilter === 'AUTH' && log.event_type !== 'AUTH_FAILED') return false;
      if (quickFilter === 'TAMPER' && log.event_type !== 'TAMPER_DETECTED') return false;
      if (quickFilter === 'DHR' && log.event_type !== 'DHR_SIGNED') return false;

      // In-Stream Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchActor = (log.actor_username || '').toLowerCase().includes(q);
        const matchEndpoint = (log.endpoint || '').toLowerCase().includes(q);
        const matchIp = (log.ip_address || '').toLowerCase().includes(q);
        const matchDetails = JSON.stringify(log.details || '').toLowerCase().includes(q);
        const matchType = (log.event_type_display || log.event_type || '').toLowerCase().includes(q);

        if (!matchActor && !matchEndpoint && !matchIp && !matchDetails && !matchType) {
          return false;
        }
      }

      return true;
    });
  }, [logs, quickFilter, searchQuery]);

  // Pagination calculation
  const totalItems = filteredLogs.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedLogs = useMemo(() => {
    if (pageSize === -1) return filteredLogs;
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Handle Quick Filter Switch
  const handleQuickFilterChange = (filter: 'ALL' | 'CRITICAL' | 'AUTH' | 'TAMPER' | 'DHR') => {
    setQuickFilter(filter);
    setPage(1);

    if (filter === 'CRITICAL') {
      setSelectedSeverity('CRITICAL');
      setSelectedEventType('ALL');
    } else if (filter === 'AUTH') {
      setSelectedSeverity('ALL');
      setSelectedEventType('AUTH_FAILED');
    } else if (filter === 'TAMPER') {
      setSelectedSeverity('ALL');
      setSelectedEventType('TAMPER_DETECTED');
    } else if (filter === 'DHR') {
      setSelectedSeverity('ALL');
      setSelectedEventType('DHR_SIGNED');
    } else {
      setSelectedSeverity('ALL');
      setSelectedEventType('ALL');
    }
  };

  // Export CSV for Compliance Audit
  const exportSecurityCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'ID',
      'Severity',
      'Event Type',
      'Actor Username',
      'HTTP Method',
      'Endpoint',
      'Client IP',
      'Status Code',
      'Timestamp',
      'Details',
    ];

    const rows = filteredLogs.map((log) => [
      log.id,
      sanitizeCSVCell(log.severity),
      sanitizeCSVCell(log.event_type_display || log.event_type),
      sanitizeCSVCell(log.actor_username || 'Anonymous'),
      sanitizeCSVCell(log.method),
      sanitizeCSVCell(log.endpoint),
      sanitizeCSVCell(log.ip_address || '127.0.0.1'),
      log.status_code || 200,
      sanitizeCSVCell(log.timestamp),
      sanitizeCSVCell(
        typeof log.details === 'object'
          ? log.details.reason || log.details.error || log.details.message || JSON.stringify(log.details)
          : String(log.details)
      ),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute('download', `MetiTrack_FDA_Part11_SecurityAudit_${timeStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 text-zinc-100 min-w-0">
      {/* 1. VIEW HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-sky-400 shrink-0" />
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-zinc-100">
              Security & Compliance Audit Trail
            </h1>
            <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 hidden sm:block">
            FDA 21 CFR Part 11 § 11.10(e) & ISO 13485:2016 Clause 7.5.8 Immutable Security Event Ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* CSV Export */}
          <button
            onClick={exportSecurityCSV}
            disabled={filteredLogs.length === 0}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Export Immutable Audit Log (CSV)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. SECURITY TELEMETRY KPI CARDS (Balanced 2-col on mobile with 5th card spanning full width) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3.5">
        <div
          onClick={() => handleQuickFilterChange('ALL')}
          className={`cursor-pointer rounded-xl border p-2.5 sm:p-3.5 space-y-1 transition active:scale-[0.98] select-none ${
            quickFilter === 'ALL'
              ? 'border-sky-500 bg-sky-950/40 shadow-sm'
              : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-medium text-[11px] sm:text-xs">Total Events</span>
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-zinc-100">{totalEvents}</div>
          <div className="text-[10px] text-zinc-500 truncate">Append-Only Stored</div>
        </div>

        <div
          onClick={() => handleQuickFilterChange('CRITICAL')}
          className={`cursor-pointer rounded-xl border p-2.5 sm:p-3.5 space-y-1 transition active:scale-[0.98] select-none ${
            quickFilter === 'CRITICAL'
              ? 'border-rose-500 bg-rose-950/60 shadow-sm'
              : 'border-rose-500/30 bg-rose-950/20 hover:border-rose-500/60'
          }`}
        >
          <div className="flex items-center justify-between text-rose-300 text-xs">
            <span className="font-medium text-[11px] sm:text-xs">Critical Alerts</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-rose-400">{criticalCount}</div>
          <div className="text-[10px] text-rose-300/70 truncate">Role & Tamper Blocks</div>
        </div>

        <div
          onClick={() => handleQuickFilterChange('AUTH')}
          className={`cursor-pointer rounded-xl border p-2.5 sm:p-3.5 space-y-1 transition active:scale-[0.98] select-none ${
            quickFilter === 'AUTH'
              ? 'border-amber-500 bg-amber-950/60 shadow-sm'
              : 'border-amber-500/30 bg-amber-950/20 hover:border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between text-amber-300 text-xs">
            <span className="font-medium text-[11px] sm:text-xs">Auth Failures</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-amber-400">{authFailures}</div>
          <div className="text-[10px] text-amber-300/70 truncate">Unauthorized Sign-ins Blocked</div>
        </div>

        <div
          onClick={() => handleQuickFilterChange('TAMPER')}
          className={`cursor-pointer rounded-xl border p-2.5 sm:p-3.5 space-y-1 transition active:scale-[0.98] select-none ${
            quickFilter === 'TAMPER'
              ? 'border-cyan-500 bg-cyan-950/60 shadow-sm'
              : 'border-cyan-500/30 bg-cyan-950/20 hover:border-cyan-500/60'
          }`}
        >
          <div className="flex items-center justify-between text-cyan-300 text-xs">
            <span className="font-medium text-[11px] sm:text-xs">Tamper Alerts</span>
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-cyan-400">{tamperCount}</div>
          <div className="text-[10px] text-cyan-300/70 truncate">SHA-256 Mismatches</div>
        </div>

        {/* 5th Card: col-span-2 on mobile so it spans full width cleanly without an orphan gap */}
        <div
          onClick={() => handleQuickFilterChange('DHR')}
          className={`cursor-pointer rounded-xl border p-2.5 sm:p-3.5 space-y-1 col-span-2 sm:col-span-1 transition active:scale-[0.98] select-none ${
            quickFilter === 'DHR'
              ? 'border-emerald-500 bg-emerald-950/60 shadow-sm'
              : 'border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/60'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-300 text-xs">
            <span className="font-medium text-[11px] sm:text-xs">eDHR Sealed</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-emerald-400">{dhrSignedCount}</div>
          <div className="text-[10px] text-emerald-300/70 truncate">ECDSA-SHA256 Certified</div>
        </div>
      </div>

      {/* 3. IN-STREAM SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 shadow-md">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search actor, endpoint, IP, details..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8.5 pr-8 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Severity & Event Type Dropdowns */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setQuickFilter(e.target.value === 'CRITICAL' ? 'CRITICAL' : 'ALL');
              setPage(1);
            }}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 w-full sm:w-auto"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">🚨 Critical Alerts</option>
            <option value="WARNING">⚠️ Warnings</option>
            <option value="INFO">ℹ️ Informational</option>
          </select>

          <select
            value={selectedEventType}
            onChange={(e) => {
              setSelectedEventType(e.target.value);
              setQuickFilter(
                e.target.value === 'AUTH_FAILED'
                  ? 'AUTH'
                  : e.target.value === 'TAMPER_DETECTED'
                  ? 'TAMPER'
                  : e.target.value === 'DHR_SIGNED'
                  ? 'DHR'
                  : 'ALL'
              );
              setPage(1);
            }}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 w-full sm:w-auto"
          >
            <option value="ALL">All Event Types</option>
            <option value="AUTH_FAILED">AUTH_FAILED</option>
            <option value="AUTH_SUCCESS">AUTH_SUCCESS</option>
            <option value="ROLE_VIOLATION">ROLE_VIOLATION</option>
            <option value="TAMPER_DETECTED">TAMPER_DETECTED</option>
            <option value="RATE_LIMITED">RATE_LIMITED</option>
            <option value="DHR_SIGNED">DHR_SIGNED</option>
          </select>
        </div>
      </div>

      {/* 4. DESKTOP / TABLET DATA TABLE (hidden sm:block) */}
      <div className="hidden sm:block rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                    {/* Severity Pill */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.severity === 'CRITICAL' && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                          CRITICAL
                        </span>
                      )}
                      {log.severity === 'WARNING' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          WARNING
                        </span>
                      )}
                      {log.severity === 'INFO' && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px]">
                          INFO
                        </span>
                      )}
                    </td>

                    {/* Event Type */}
                    <td className="py-3 px-4 whitespace-nowrap font-sans font-semibold text-zinc-200">
                      {log.event_type_display || log.event_type}
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-300">
                      <div className="flex items-center gap-1.5 font-sans">
                        <User className="w-3 h-3 text-zinc-500" />
                        <span>{log.actor_username || 'Anonymous'}</span>
                      </div>
                    </td>

                    {/* Endpoint */}
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-400">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px]">
                        {log.method} {log.endpoint}
                      </span>
                    </td>

                    {/* Client IP */}
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>

                    {/* Status Code */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          log.status_code && log.status_code >= 400
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {log.status_code || '—'}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 text-zinc-400 max-w-xs truncate font-sans text-[11px]" title={JSON.stringify(log.details, null, 2)}>
                      {typeof log.details === 'object'
                        ? log.details.reason || log.details.error || log.details.message || JSON.stringify(log.details)
                        : String(log.details)}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap text-right text-zinc-500 text-[10px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 italic">
                    {loading ? 'Streaming security audit records...' : 'No security audit events matching current criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination Footer */}
        <div className="p-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 select-none">
          <div>
            Showing <strong className="text-zinc-200">{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-zinc-200">{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
            <strong className="text-zinc-100 font-mono">{totalItems}</strong> events
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-200 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-zinc-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. MOBILE RESPONSIVE SECURITY EVENT CARDS (< sm) */}
      <div className="block sm:hidden space-y-2.5 pb-4">
        {paginatedLogs.length === 0 ? (
          <div className="py-10 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800 p-4">
            <ShieldAlert className="w-8 h-8 text-zinc-700 animate-pulse mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-300">No security audit events found</p>
            <p className="text-[11px] text-zinc-500 mt-1">No records match the active criteria.</p>
          </div>
        ) : (
          paginatedLogs.map((log) => {
            const isCritical = log.severity === 'CRITICAL';
            const isWarning = log.severity === 'WARNING';
            const isSuccess = log.status_code && log.status_code < 400;

            return (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-md space-y-2 select-none"
              >
                {/* Header: Severity + Status Code + Timestamp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isCritical ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>CRITICAL</span>
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>WARNING</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-950/80 text-sky-300 border border-sky-800/80">
                        INFO
                      </span>
                    )}

                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSuccess
                          ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/70 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {log.status_code || '—'}
                    </span>
                  </div>

                  <span className="font-mono text-[10px] text-zinc-500">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Event Type & Actor */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/60">
                  <span className="font-semibold text-zinc-200">
                    {log.event_type_display || log.event_type}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">
                    <User className="w-3 h-3 text-zinc-500" />
                    <span>{log.actor_username || 'Anonymous'}</span>
                  </div>
                </div>

                {/* Endpoint & Client IP */}
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 truncate max-w-[200px]">
                    {log.method} {log.endpoint}
                  </span>
                  <span className="text-zinc-500 flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5 text-zinc-600" />
                    <span>{log.ip_address || '127.0.0.1'}</span>
                  </span>
                </div>

                {/* Event Details Box */}
                {log.details && (
                  <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-400 font-mono break-words">
                    {typeof log.details === 'object'
                      ? log.details.reason || log.details.error || log.details.message || JSON.stringify(log.details)
                      : String(log.details)}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Mobile Pagination Footer */}
        <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 flex flex-col gap-2.5 text-xs text-zinc-400 select-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px]">
              Showing <strong className="text-zinc-200">{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong>-
              <strong className="text-zinc-200">{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
              <strong className="text-zinc-100 font-mono">{totalItems}</strong> events
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={-1}>All</option>
              </select>
            </div>
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-30 disabled:pointer-events-none text-xs font-medium flex items-center gap-1 transition active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="font-mono text-xs text-zinc-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-30 disabled:pointer-events-none text-xs font-medium flex items-center gap-1 transition active:scale-95"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
