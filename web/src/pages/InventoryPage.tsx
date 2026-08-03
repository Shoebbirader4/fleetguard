import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SparePart } from '../types/inventory';
import { useAuthStore } from '../stores/authStore';
import ReceiveStockModal from '../components/ReceiveStockModal';

export default function InventoryPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [receiveStockPart, setReceiveStockPart] = useState<SparePart | null>(null);

  // Fetch spare parts
  const { data: parts, isLoading } = useQuery({
    queryKey: ['spare-parts', selectedCategory, searchQuery, showLowStockOnly],
    queryFn: async () => {
      let query = supabase
        .from('spare_parts')
        .select('*, vendors(vendor_name)')
        .order('part_number', { ascending: true });

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(
          `part_number.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter low stock if needed
      if (showLowStockOnly) {
        return (data as SparePart[]).filter(
          (part) => part.current_quantity <= part.reorder_level
        );
      }

      return data as SparePart[];
    },
    enabled: !!user,
  });

  // Fetch unique categories
  const { data: categories } = useQuery({
    queryKey: ['part-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('category')
        .order('category', { ascending: true });

      if (error) throw error;

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data.map((item: any) => item.category))
      );
      return uniqueCategories as string[];
    },
    enabled: !!user,
  });

  // Calculate inventory valuation
  const totalInventoryValue = parts?.reduce(
    (sum, part) => sum + part.current_quantity * part.unit_cost,
    0
  ) || 0;

  const lowStockCount = parts?.filter(
    (part) => part.current_quantity <= part.reorder_level
  ).length || 0;

  const getStockStatus = (part: SparePart) => {
    if (part.current_quantity === 0) {
      return { label: 'Out of Stock', color: 'text-error-600 bg-error-100 dark:bg-error-900/30 dark:text-error-300' };
    }
    if (part.current_quantity <= part.reorder_level) {
      return { label: 'Low Stock', color: 'text-warning-600 bg-warning-100 dark:bg-warning-900/30 dark:text-warning-300' };
    }
    return { label: 'In Stock', color: 'text-success-600 bg-success-100 dark:bg-success-900/30 dark:text-success-300' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              Spare Parts Inventory
            </h1>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/inventory/purchase-orders')}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
              >
                Purchase Orders
              </button>
              <button
                onClick={() => navigate('/inventory/parts/new')}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-normal leading-normal"
              >
                + Add Part
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Inventory Value
            </h3>
            <div className="mt-2 text-3xl font-bold text-primary-600">
              {formatCurrency(totalInventoryValue)}
            </div>
            <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
              Weighted average cost
            </p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Parts
            </h3>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {parts?.length || 0}
            </div>
            <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
              Unique parts in catalog
            </p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Low Stock Alerts
            </h3>
            <div className="mt-2 text-3xl font-bold text-warning-600">
              {lowStockCount}
            </div>
            <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
              Parts below reorder level
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by part number or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                {categories?.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Low Stock Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lowStockFilter"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label
                htmlFor="lowStockFilter"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
              >
                Low Stock Only
              </label>
            </div>
          </div>
        </div>

        {/* Parts Table */}
        <div className="card">
          {isLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading parts...
            </div>
          ) : parts && parts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Part Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Unit Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Total Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {parts.map((part) => {
                    const status = getStockStatus(part);
                    const totalValue = part.current_quantity * part.unit_cost;

                    return (
                      <tr key={part.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {part.part_number}
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {part.description}
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {part.category}
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal">
                          <span className={part.current_quantity <= part.reorder_level ? 'text-warning-600 font-semibold' : 'text-gray-900 dark:text-gray-100'}>
                            {part.current_quantity}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-tight ml-1">
                            / {part.reorder_level} {part.unit_of_measure}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-900 dark:text-gray-100">
                          {formatCurrency(part.unit_cost)}
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-900 dark:text-gray-100 font-medium">
                          {formatCurrency(totalValue)}
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal">
                          <span className={`px-2 py-1 rounded-full text-xs font-normal leading-tight font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal space-x-3">
                          <button
                            onClick={() => navigate(`/inventory/parts/${part.id}/edit`)}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setReceiveStockPart(part)}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Receive Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No parts found. {searchQuery || selectedCategory !== 'all' ? 'Try adjusting your filters.' : 'Add your first part to get started.'}
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <button
                  onClick={() => navigate('/inventory/parts/new')}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-normal leading-normal"
                >
                  + Add Part
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Receive Stock Modal */}
      {receiveStockPart && (
        <ReceiveStockModal
          isOpen={!!receiveStockPart}
          onClose={() => setReceiveStockPart(null)}
          part={receiveStockPart}
        />
      )}
    </div>
  );
}
