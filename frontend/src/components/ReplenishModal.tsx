'use client';

import React, { useState } from 'react';
import { X, Boxes, AlertCircle, Loader2, PlusCircle } from 'lucide-react';
import { Resource } from '../types';
import { api } from '../lib/api';

interface ReplenishModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Resource) => void;
}

export const ReplenishModal: React.FC<ReplenishModalProps> = ({
  resource,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState<number>(100);
  const [operatorName, setOperatorName] = useState('Inventory Specialist');
  const [notes, setNotes] = useState('Certified batch replenishment from approved supplier.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !resource) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await api.replenishResource(resource.id, {
        quantity: Number(quantity),
        operator_name: operatorName,
        notes: notes,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to replenish stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-zinc-100 text-sm">
              Warehouse Stock Replenishment
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="font-mono text-[11px]">{errorMessage}</p>
            </div>
          )}

          <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase font-semibold">Resource Target</span>
            <div className="flex items-center justify-between text-zinc-200 font-semibold">
              <span>{resource.name}</span>
              <span className="font-mono text-sky-400">
                Current: {Number(resource.total_available)} {resource.unit.toLowerCase()}
              </span>
            </div>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1 font-medium">
              Replenish Quantity ({resource.unit.toLowerCase()})
            </label>
            <input
              type="number"
              step="0.1"
              min="0.01"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="e.g. 500"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-zinc-400 block mb-1 font-medium">Warehouse Officer</label>
            <input
              type="text"
              required
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-zinc-400 block mb-1 font-medium">Vendor Lot / Delivery Note</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Formula Callout */}
          <div className="text-[11px] text-zinc-500 font-mono">
            Formula: Stock_new = {Number(resource.total_available)} + {quantity} ={' '}
            <strong className="text-emerald-400">
              {(Number(resource.total_available) + Number(quantity)).toFixed(2)} {resource.unit.toLowerCase()}
            </strong>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Stock...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Confirm Replenishment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
