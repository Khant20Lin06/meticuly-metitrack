'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { SecurityAuditEvent } from '../types';
import { api } from '../lib/api';

export const SecurityAuditView: React.FC = () => {
  const [logs, setLogs] = useState<SecurityAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.actor_username.toLowerCase().includes(q) ||
      log.endpoint.toLowerCase().includes(q) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(q)) ||
      JSON.stringify(log.details).toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-6 space-y-6 text-zinc-100">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-sky-400" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Security & Compliance Audit Trail
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            FDA 21 CFR Part 11 § 11.10(e) & ISO 13485:2016 Clause 7.5.8 Immutable Security Event Ledger (OWASP A09).
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition flex items-center gap-2 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Audit Stream</span>
        </button>
      </div>

      {/* Security Telemetry KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Events</span>
            <Activity className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{totalEvents}</div>
          <div className="text-[10px] text-zinc-500">Append-Only Stored</div>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-rose-300 text-xs">
            <span>Critical Alerts</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{criticalCount}</div>
          <div className="text-[10px] text-rose-300/70">Role & Tamper Blocks</div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-amber-300 text-xs">
            <span>Auth Failures</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{authFailures}</div>
          <div className="text-[10px] text-amber-300/70">OWASP A07 Blocked</div>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-cyan-300 text-xs">
            <span>Tamper Alerts</span>
            <Terminal className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">{tamperCount}</div>
          <div className="text-[10px] text-cyan-300/70">SHA-256 Mismatches</div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-emerald-300 text-xs">
            <span>eDHR Sealed</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{dhrSignedCount}</div>
          <div className="text-[10px] text-emerald-300/70">ECDSA-SHA256 Certified</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search actor, endpoint, IP, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Alerts</option>
            <option value="WARNING">Warnings</option>
            <option value="INFO">Informational</option>
          </select>

          {/* Event Type Filter */}
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
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

      {/* Security Audit Log Table */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden shadow-sm">
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
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
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
      </div>
    </div>
  );
};
