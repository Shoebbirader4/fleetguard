import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { DocumentWithVehicle, DOCUMENT_TYPES } from '../types/document';
import { useAuthStore } from '../stores/authStore';
import DocumentUploadForm from '../components/DocumentUploadForm';

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentWithVehicle | null>(null);

  // Fetch documents with vehicle info
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', selectedDocumentType, selectedVehicle, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          vehicle:vehicles(id, vin, make, model, year),
          uploader:users!documents_uploaded_by_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (selectedDocumentType !== 'all') {
        query = query.eq('document_type', selectedDocumentType);
      }

      if (selectedVehicle !== 'all') {
        query = query.eq('vehicle_id', selectedVehicle);
      }

      if (searchQuery) {
        query = query.ilike('file_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as DocumentWithVehicle[];
    },
    enabled: !!user,
  });

  // Fetch vehicles for filter dropdown
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-for-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, vin, make, model, year')
        .eq('status', 'active')
        .order('make', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: DocumentWithVehicle) => {
      // Extract file path from URL
      const urlParts = doc.file_url.split('/');
      const bucketIndex = urlParts.findIndex((part) => part === 'documents');
      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDeleteModalOpen(false);
      setDocumentToDelete(null);
    },
  });

  // Get expiry status
  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { label: 'Expired', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300', warning: true };
    } else if (daysUntilExpiry <= 30) {
      return { label: `Expires in ${daysUntilExpiry} days`, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300', warning: true };
    }
    return { label: 'Valid', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300', warning: false };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const handleDownload = (doc: DocumentWithVehicle) => {
    window.open(doc.file_url, '_blank');
  };

  const handleDelete = (doc: DocumentWithVehicle) => {
    setDocumentToDelete(doc);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Documents
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage vehicle documents, certificates, and compliance records
              </p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              + Upload Document
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search by file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Document Type Filter */}
            <div>
              <select
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Document Types</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Filter */}
            <div>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Vehicles</option>
                {vehicles?.map((vehicle: any) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} {vehicle.year} - {vehicle.vin}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="card">
          {isLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading documents...
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      File Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Expiry Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Uploaded
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {documents.map((doc: any) => {
                    const expiryStatus = getExpiryStatus(doc.expiry_date);
                    const isExpiringSoon = expiryStatus?.warning;

                    return (
                      <tr
                        key={doc.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          isExpiringSoon ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {doc.file_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {getDocumentTypeLabel(doc.document_type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {doc.vehicle ? (
                            <span>
                              {doc.vehicle.make} {doc.vehicle.model} ({doc.vehicle.year})
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {doc.expiry_date ? formatDate(doc.expiry_date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {expiryStatus ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${expiryStatus.color}`}>
                              {expiryStatus.label}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatFileSize(doc.file_size)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm space-x-3">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(doc)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
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
                No documents found. {searchQuery || selectedDocumentType !== 'all' || selectedVehicle !== 'all' ? 'Try adjusting your filters.' : 'Upload your first document to get started.'}
              </p>
              {!searchQuery && selectedDocumentType === 'all' && selectedVehicle === 'all' && (
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  + Upload Document
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && documentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Delete Document
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{documentToDelete.file_name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDocumentToDelete(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <DocumentUploadForm
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
        />
      )}
    </div>
  );
}
