'use client';

import React from 'react';
import { Order } from '@/types';
import { ShieldCheck, User, Clock, FileText } from 'lucide-react';

interface AuditViewProps {
  orders: Order[];
}

export default function AuditView({ orders }: AuditViewProps) {
  // Aggregate all step logs from all orders and sort by transitioned_at desc
  const allLogs: { order: Order; log: Order['step_logs'][0] }[] = [];
  orders.forEach((o) => {
    o.step_logs.forEach((l) => {
      allLogs.push({ order: o, log: l });
    });
  });

  allLogs.sort(
    (a, b) => new Date(b.log.transitioned_at).getTime() - new Date(a.log.transitioned_at).getTime()
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#070B14]">
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          ISO 13485:2016 Device History Record (DHR) Master Audit Trail
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Full traceability timeline for custom implants under 21 CFR Part 820 medical device regulations
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#0C121F] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0F1628] text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Case ID</th>
              <th className="py-3 px-4">Patient Ref</th>
              <th className="py-3 px-4">Step Transition</th>
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">Verification Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-sans text-slate-300">
            {allLogs.length > 0 ? (
              allLogs.map(({ order, log }) => (
                <tr key={`${order.id}-${log.id}`} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(log.transitioned_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-100">
                    {order.case_id}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {order.patient_ref}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-200">
                      {log.from_step_name || 'Case Created'}
                    </span>
                    <span className="text-cyan-400 mx-1.5">→</span>
                    <span className="text-cyan-300 font-semibold">
                      {log.to_step_name || 'Dispatched'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.operator_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 italic max-w-xs truncate">
                    "{log.notes}"
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No audit logs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
