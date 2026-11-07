'use client';

import React from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  UserCheck,
  Filter,
  Shield,
  Activity,
} from 'lucide-react';
import { RoleKey, ImplantType, OrderPriority } from '../types';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPriority: string;
  onPriorityChange: (p: string) => void;
  selectedImplantType: string;
  onImplantTypeChange: (t: string) => void;
  activeRole: RoleKey;
  onRoleChange: (r: RoleKey) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenCreateModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPriorityChange,
  selectedImplantType,
  onImplantTypeChange,
  activeRole,
  onRoleChange,
  onRefresh,
  isLoading,
  onOpenCreateModal,
}) => {
  const roleConfigs: Record<RoleKey, { label: string; badge: string; color: string; desc: string }> = {
    BIOMEDICAL_ENGINEER: {
      label: 'Biomedical Engineer',
      badge: 'Step 1: CAD',
      color: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60',
      desc: 'Authorized: Step 1 (Intake & 3D Design)',
    },
    PRODUCTION_OPERATOR: {
      label: 'Production Operator',
      badge: 'Steps 2-3: SLM/CNC',
      color: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
      desc: 'Authorized: Step 2 (3D Printing) & Step 3 (Post-Processing)',
    },
    QA_SPECIALIST: {
      label: 'QA Specialist',
      badge: 'Steps 4-5: CMM/Pack',
      color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
      desc: 'Authorized: Step 4 (Inspection) & Step 5 (Cleanroom Release)',
    },
    ADMIN: {
      label: 'Plant Administrator',
      badge: 'All Stations (1-5)',
      color: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
      desc: 'Full Authority across all manufacturing stations',
    },
  };

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Search Input Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Case ID (e.g. CAS-2026-081) or Patient Ref..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
          />
        </div>
      </div>

      {/* Filter Selectors */}
      <div className="flex items-center gap-2">
        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-zinc-900 text-zinc-200">
              All Priorities
            </option>
            <option value="URGENT" className="bg-zinc-900 text-rose-400">
              🚨 Urgent
            </option>
            <option value="STANDARD" className="bg-zinc-900 text-zinc-200">
              Standard
            </option>
          </select>
        </div>

        {/* Implant Type Filter */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300">
          <select
            value={selectedImplantType}
            onChange={(e) => onImplantTypeChange(e.target.value)}
            className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-zinc-900 text-zinc-200">
              All Anatomies
            </option>
            <option value="CRANIAL_PLATE" className="bg-zinc-900 text-zinc-200">
              Cranial Plate
            </option>
            <option value="MANDIBULAR_RECON" className="bg-zinc-900 text-zinc-200">
              Mandibular Jaw
            </option>
            <option value="HIP_ACETABULAR_CUP" className="bg-zinc-900 text-zinc-200">
              Acetabular Hip Cup
            </option>
            <option value="SPINAL_CAGE" className="bg-zinc-900 text-zinc-200">
              Spinal Fusion Cage
            </option>
          </select>
        </div>
      </div>

      {/* Right Side: Persona Switcher & Primary Action */}
      <div className="flex items-center gap-3">
        {/* ISO 13485 Persona Switcher */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg pl-2.5 pr-1.5 py-1 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <UserCheck className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-medium text-zinc-400 hidden xl:inline">Operator Role:</span>
          </div>

          <select
            value={activeRole}
            onChange={(e) => onRoleChange(e.target.value as RoleKey)}
            className="bg-zinc-800 text-zinc-100 text-xs font-medium rounded px-2 py-0.5 focus:outline-none border border-zinc-700/80 cursor-pointer"
            title={roleConfigs[activeRole].desc}
          >
            <option value="ADMIN">👑 Plant Administrator (Full)</option>
            <option value="BIOMEDICAL_ENGINEER">👨‍🔬 Biomedical Engineer (Step 1)</option>
            <option value="PRODUCTION_OPERATOR">⚙️ Production Operator (Steps 2-3)</option>
            <option value="QA_SPECIALIST">🛡️ QA Specialist (Steps 4-5)</option>
          </select>

          {/* Active Station Permission Badge */}
          <span
            className={`hidden md:inline-flex text-[10px] px-2 py-0.5 rounded border font-mono font-medium ${roleConfigs[activeRole].color}`}
            title={roleConfigs[activeRole].desc}
          >
            {roleConfigs[activeRole].badge}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50"
          title="Refresh Plant Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
        </button>

        {/* Create Case Button */}
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm shadow-sky-900/50 transition active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Case</span>
        </button>
      </div>
    </header>
  );
};
