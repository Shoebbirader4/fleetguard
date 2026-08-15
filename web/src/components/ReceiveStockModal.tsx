import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { toast } from './ToastContainer';

interface ReceiveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: {
    id: string;
    part_number: string;
    description: string;
    current_quantity: number;
    unit_of_measure: string;
    unit_cost: number;
  };
}

export default function ReceiveStockModal({ isOpen, onClose, part }: ReceiveStockModalProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState(part.unit_cost.toString());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      const qty = parseInt(quantity);
      const cost = parseFloat(unitCost);

      if (isNaN(qty) || qty <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      if (isNaN(cost) || cost < 0) {
        throw new Error('Unit cost must be a valid number');
      }

      // Update spare part quantity
      const { error: partError } = await supabase
        .from('spare_parts')
        .update({ 
          current_quantity: part.current_quantity + qty,
          unit_cost: cost,
        })
        .eq('tenant_id', user!.tenantId)
        .eq('id', part.id);

      if (partError) throw partError;

      // Create stock transaction
      const { error: transError } = await supabase
        .from('stock_transactions')
        .insert({
          tenant_id: user!.tenantId,
          part_id: part.id,
          transaction_type: 'purchase',
          quantity: qty,
          unit_cost: cost,
          reference_type: 'manual',
          reference_id: null,
          notes: notes || `Manual stock receipt for ${part.part_number}`,
          created_by: user!.id,
        });

      if (transError) throw transError;
    },
    onSuccess: () => {
      toast.success('Stock received successfully');
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to receive stock: ${error.message}`);
    },
  });

  const resetForm = () => {
    setQuantity('');
    setUnitCost(part.unit_cost.toString());
    setNotes('');
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const qty = parseInt(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    const cost = parseFloat(unitCost);
    if (!unitCost || isNaN(cost) || cost < 0) {
      newErrors.unitCost = 'Unit cost must be a valid positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      mutation.mutate();
    }
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const qty = parseInt(quantity) || 0;
  const cost = parseFloat(unitCost) || 0;
  const totalCost = qty * cost;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Receive Stock
          </h2>

          {/* Part Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">Receiving stock for:</div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{part.part_number}</div>
            <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">{part.description}</div>
            <div className="mt-2 text-sm font-normal leading-normal">
              <span className="text-gray-600 dark:text-gray-400">Current Stock: </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {part.current_quantity} {part.unit_of_measure}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity Received ({part.unit_of_measure}) *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setErrors((prev) => ({ ...prev, quantity: '' }));
                }}
                min="1"
                step="1"
                className={`block w-full rounded-md shadow-sm ${
                  errors.quantity
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                } dark:bg-gray-700 dark:text-gray-100`}
                placeholder="Enter quantity"
              />
              {errors.quantity && (
                <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.quantity}</p>
              )}
            </div>

            {/* Unit Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit Cost ($) *
              </label>
              <input
                type="number"
                value={unitCost}
                onChange={(e) => {
                  setUnitCost(e.target.value);
                  setErrors((prev) => ({ ...prev, unitCost: '' }));
                }}
                min="0"
                step="0.01"
                className={`block w-full rounded-md shadow-sm ${
                  errors.unitCost
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                } dark:bg-gray-700 dark:text-gray-100`}
                placeholder="Enter unit cost"
              />
              {errors.unitCost && (
                <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.unitCost}</p>
              )}
            </div>

            {/* Total Cost Display */}
            {qty > 0 && cost > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">Total Cost</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  ${totalCost.toFixed(2)}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Add any additional notes..."
              />
            </div>

            {/* New Stock Level Preview */}
            {qty > 0 && (
              <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                New stock level will be:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {part.current_quantity + qty} {part.unit_of_measure}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={mutation.isPending}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {mutation.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Receiving...
                  </>
                ) : (
                  'Receive Stock'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
