import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { DOCUMENT_TYPES } from '../types/document';
import { useAuthStore } from '../stores/authStore';

interface DocumentUploadFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DocumentUploadForm({ onClose, onSuccess }: DocumentUploadFormProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('insurance');
  const [vehicleId, setVehicleId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Fetch vehicles for dropdown
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-for-upload'],
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

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !documentType || !vehicleId || !user?.tenantId || !user?.id) {
        throw new Error('Missing required fields');
      }

      // Validate file size (10 MB max)
      const maxSizeBytes = 10 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new Error('File size exceeds 10 MB limit');
      }

      // Construct file path: tenant_id/vehicle_id/timestamp_filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.tenantId}/${vehicleId}/${timestamp}_${sanitizedFileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Insert document record into database
      const { error: dbError } = await supabase.from('documents').insert({
        tenant_id: user.tenantId,
        vehicle_id: vehicleId,
        document_type: documentType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        expiry_date: expiryDate || null,
        uploaded_by: user.id,
      });

      if (dbError) {
        // If database insert fails, delete the uploaded file
        await supabase.storage.from('documents').remove([filePath]);
        throw dbError;
      }

      return { filePath, publicUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setFile(null);
      setDocumentType('insurance');
      setVehicleId('');
      setExpiryDate('');
      setUploadError('');
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      setUploadError(error.message || 'Failed to upload document');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(selectedFile.type)) {
        setUploadError('Invalid file type. Please upload PDF, JPG, PNG, or DOC files.');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setUploadError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setUploadError('Please select a file');
      return;
    }

    if (!vehicleId) {
      setUploadError('Please select a vehicle');
      return;
    }

    uploadMutation.mutate();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Upload Document
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File *
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none"
              />
              {file && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Selected: {file.name} ({formatFileSize(file.size)})
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Max file size: 10 MB. Supported: PDF, JPG, PNG, DOC
              </p>
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Document Type *
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                required
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vehicle *
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select a vehicle...</option>
                {vehicles?.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} {vehicle.year} - {vehicle.vin}
                  </option>
                ))}
              </select>
            </div>

            {/* Expiry Date (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Set expiry date for certificates and insurance documents
              </p>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">{uploadError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
                disabled={uploadMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                disabled={uploadMutation.isPending || !file}
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
