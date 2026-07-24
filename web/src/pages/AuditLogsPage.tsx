/**
 * Audit Logs Page
 * 
 * Provides UI for viewing and searching audit logs with filters.
 * Supports CSV export functionality.
 * 
 * Task: 15.7 Implement audit logging
 * Requirements: 23.3, 23.4, 23.6
 */

import { useState } from 'react';
import { useAuditLogs, exportAuditLogsToCSV } from '../hooks/useAuditLogs';
import type { AuditLogFilters, AuditOperation } from '../types/auditLog';

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    startDate: '',
    endDate: '',
    userId: '',
    entityType: '',
    operation: undefined,
    page: 1,
    pageSize: 50,
  });

  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, loading, error } = useAuditLogs(filters);

  const handleFilterChange = (field: keyof AuditLogFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      page: field !== 'page' ? 1 : value, // Reset to page 1 when filter changes
    }));
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportAuditLogsToCSV(filters);
      alert('Audit logs exported successfully');
    } catch (err) {
      alert('Failed to export audit logs');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatEntityType = (entityType: string) => {
    return entityType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getOperationBadgeColor = (operation: AuditOperation) => {
    switch (operation) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-2 text-gray-600">
            Complete audit trail of all system changes with before/after values
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            {/* Entity Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="vehicles">Vehicles</option>
                <option value="components">Components</option>
                <option value="odometer_readings">Odometer Readings</option>
                <option value="work_orders">Work Orders</option>
                <option value="labor_hours">Labor Hours</option>
                <option value="work_order_parts">Work Order Parts</option>
                <option value="spare_parts">Spare Parts</option>
                <option value="vendors">Vendors</option>
                <option value="alerts">Alerts</option>
                <option value="documents">Documents</option>
                <option value="inspections">Inspections</option>
                <option value="inspection_checklists">Inspection Checklists</option>
                <option value="users">Users</option>
                <option value="tenants">Tenants</option>
              </select>
            </div>

            {/* Operation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operation
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.operation || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'operation',
                    e.target.value ? (e.target.value as AuditOperation) : undefined
                  )
                }
              >
                <option value="">All Operations</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'Exporting...' : 'Export to CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading audit logs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Audit Logs Table */}
        {!loading && data && (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No audit logs found matching the selected filters
                      </td>
                    </tr>
                  ) : (
                    data.logs.map((log) => (
                      <>
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{log.user_name}</div>
                            <div className="text-sm text-gray-500">{log.user_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getOperationBadgeColor(
                                log.operation
                              )}`}
                            >
                              {log.operation.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatEntityType(log.entity_type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {log.entity_id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {log.changed_fields && (
                              <button
                                onClick={() =>
                                  setShowDetails(showDetails === log.id ? null : log.id)
                                }
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {showDetails === log.id ? 'Hide' : 'Show'} Details
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Details Row */}
                        {showDetails === log.id && log.changed_fields && (
                          <tr key={`${log.id}-details`}>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="text-sm">
                                <h4 className="font-semibold text-gray-900 mb-2">
                                  Changed Fields:
                                </h4>
                                <div className="space-y-2">
                                  {Object.entries(log.changed_fields).map(
                                    ([field, values]) => (
                                      <div key={field} className="grid grid-cols-3 gap-4">
                                        <div className="font-medium text-gray-700">
                                          {field}:
                                        </div>
                                        <div>
                                          <span className="text-red-600 line-through">
                                            {values.old_value || '(empty)'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-green-600 font-semibold">
                                            {values.new_value || '(empty)'}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="bg-white rounded-lg shadow px-6 py-4 mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {data.pagination.page} of {data.pagination.totalPages} (
                  {data.pagination.total} total logs)
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleFilterChange('page', filters.page! - 1)}
                    disabled={filters.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleFilterChange('page', filters.page! + 1)}
                    disabled={filters.page === data.pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
