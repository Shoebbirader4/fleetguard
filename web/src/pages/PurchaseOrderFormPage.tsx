import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import Layout from '../components/Layout';
import { toast } from '../components/ToastContainer';
import VendorSelector from '../components/VendorSelector';

interface SparePart {
  id: string;
  part_number: string;
  description: string;
  unit_cost: number;
  unit_of_measure: string;
  current_quantity: number;
}

interface LineItem {
  id: string;
  part_id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
}

interface POFormData {
  vendor_id: string;
  order_date: string;
  expected_delivery_date: string;
  notes: string;
  line_items: LineItem[];
}

export default function PurchaseOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isEditMode = !!id;

  const [formData, setFormData] = useState<POFormData>({
    vendor_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
    line_items: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPart, setSelectedPart] = useState<string>('');
  const [lineQuantity, setLineQuantity] = useState<string>('');

  // Note: Vendors are now fetched by VendorSelector component

  // Fetch spare parts
  const { data: spareParts } = useQuery<SparePart[]>({
    queryKey: ['spare-parts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('id, part_number, description, unit_cost, unit_of_measure, current_quantity')
        .order('part_number');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing PO if editing
  const { data: existingPO, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (poError) throw poError;

      const { data: lines, error: linesError } = await supabase
        .from('purchase_order_lines')
        .select('*')
        .eq('purchase_order_id', id);

      if (linesError) throw linesError;

      return { ...po, line_items: lines };
    },
    enabled: isEditMode,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingPO) {
      setFormData({
        vendor_id: existingPO.vendor_id,
        order_date: existingPO.order_date.split('T')[0],
        expected_delivery_date: existingPO.expected_delivery_date?.split('T')[0] || '',
        notes: existingPO.notes || '',
        line_items: existingPO.line_items.map((line: any) => ({
          id: line.id,
          part_id: line.part_id,
          quantity: line.quantity,
          unit_cost: line.unit_cost,
          line_total: line.line_total,
        })),
      });
    }
  }, [existingPO]);

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: POFormData) => {
      const poData = {
        vendor_id: data.vendor_id,
        order_date: data.order_date,
        expected_delivery_date: data.expected_delivery_date || null,
        notes: data.notes || null,
        total_cost: data.line_items.reduce((sum, item) => sum + item.line_total, 0),
        status: 'pending',
      };

      if (isEditMode && id) {
        // Update PO
        const { error: poError } = await supabase
          .from('purchase_orders')
          .update(poData)
          .eq('id', id);

        if (poError) throw poError;

        // Delete old lines and insert new ones
        const { error: deleteError } = await supabase
          .from('purchase_order_lines')
          .delete()
          .eq('purchase_order_id', id);

        if (deleteError) throw deleteError;

        const lines = data.line_items.map((item) => ({
          purchase_order_id: id,
          part_id: item.part_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          line_total: item.line_total,
          received_quantity: 0,
        }));

        const { error: linesError } = await supabase
          .from('purchase_order_lines')
          .insert(lines);

        if (linesError) throw linesError;

        return { id };
      } else {
        // Generate PO number
        const poNumber = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

        // Create PO
        const { data: newPO, error: poError } = await supabase
          .from('purchase_orders')
          .insert([{
            ...poData,
            po_number: poNumber,
            created_by: user!.id,
          }])
          .select()
          .single();

        if (poError) throw poError;

        // Create line items
        const lines = data.line_items.map((item) => ({
          purchase_order_id: newPO.id,
          part_id: item.part_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          line_total: item.line_total,
          received_quantity: 0,
        }));

        const { error: linesError } = await supabase
          .from('purchase_order_lines')
          .insert(lines);

        if (linesError) throw linesError;

        return newPO;
      }
    },
    onSuccess: (data) => {
      toast.success(isEditMode ? 'Purchase order updated!' : 'Purchase order created!');
      navigate(`/inventory/purchase-orders/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} purchase order: ${error.message}`);
    },
  });

  const handleAddLineItem = () => {
    if (!selectedPart || !lineQuantity) {
      toast.warning('Please select a part and enter quantity');
      return;
    }

    const part = spareParts?.find((p) => p.id === selectedPart);
    if (!part) return;

    const quantity = parseInt(lineQuantity);
    if (quantity <= 0) {
      toast.warning('Quantity must be greater than 0');
      return;
    }

    const newLine: LineItem = {
      id: `temp-${Date.now()}`,
      part_id: part.id,
      quantity,
      unit_cost: part.unit_cost,
      line_total: quantity * part.unit_cost,
    };

    setFormData((prev) => ({
      ...prev,
      line_items: [...prev.line_items, newLine],
    }));

    setSelectedPart('');
    setLineQuantity('');
  };

  const handleRemoveLineItem = (lineId: string) => {
    setFormData((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((item) => item.id !== lineId),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendor_id) newErrors.vendor_id = 'Vendor is required';
    if (!formData.order_date) newErrors.order_date = 'Order date is required';
    if (formData.line_items.length === 0) newErrors.line_items = 'At least one line item is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      mutation.mutate(formData);
    }
  };

  const totalCost = formData.line_items.reduce((sum, item) => sum + item.line_total, 0);

  if (isEditMode && isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading purchase order...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/inventory/purchase-orders')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                {isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </h1>
              <p className="mt-1 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                {isEditMode ? 'Update purchase order details' : 'Create a new purchase order for parts'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PO Header */}
          <div className="card">
            <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">Order Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vendor *
                </label>
                <VendorSelector
                  value={formData.vendor_id}
                  onChange={(vendorId) => {
                    setFormData((prev) => ({ ...prev, vendor_id: vendorId || '' }));
                    setErrors((prev) => ({ ...prev, vendor_id: '' }));
                  }}
                  required={true}
                  placeholder="Select vendor..."
                />
                {errors.vendor_id && <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.vendor_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order Date *
                </label>
                <input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, order_date: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expected_delivery_date: e.target.value }))}
                  min={formData.order_date}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Cost
                </label>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    ${totalCost.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card">
            <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">Line Items</h2>
            
            {/* Add Line Item */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Part
                  </label>
                  <select
                    value={selectedPart}
                    onChange={(e) => setSelectedPart(e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Choose a part...</option>
                    {spareParts?.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.part_number} - {part.description} (${part.unit_cost.toFixed(2)}/{part.unit_of_measure})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={lineQuantity}
                      onChange={(e) => setLineQuantity(e.target.value)}
                      min="1"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="self-end">
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            {formData.line_items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Part
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Unit Cost
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Line Total
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {formData.line_items.map((item) => {
                      const part = spareParts?.find((p) => p.id === item.part_id);
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-900 dark:text-gray-100">
                            {part?.part_number} - {part?.description}
                          </td>
                          <td className="px-4 py-3 text-sm font-normal leading-normal text-right text-gray-900 dark:text-gray-100">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm font-normal leading-normal text-right text-gray-900 dark:text-gray-100">
                            ${item.unit_cost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm font-normal leading-normal text-right font-medium text-gray-900 dark:text-gray-100">
                            ${item.line_total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm font-normal leading-normal text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(item.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-right text-gray-900 dark:text-gray-100">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-gray-900 dark:text-gray-100">
                        ${totalCost.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No line items added yet. Add parts above to create the purchase order.
              </div>
            )}
            {errors.line_items && <p className="mt-2 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.line_items}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/inventory/purchase-orders')}
              disabled={mutation.isPending}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditMode ? 'Update Purchase Order' : 'Create Purchase Order'}</>
              )}
            </button>
          </div>
        </form>
      </main>
    </Layout>
  );
}
