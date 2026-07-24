import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

type ImportType = 'vehicles' | 'odometer_readings' | 'components';

interface ImportResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ row: number; error: string }>;
  preview?: any[];
}

interface ValidationError {
  row: number;
  field: string;
  error: string;
}

export default function DataImportPage() {
  const user = useAuthStore((state) => state.user);
  const [selectedType, setSelectedType] = useState<ImportType>('vehicles');
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        // Parse CSV using papaparse
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            resolve(results.data);
          },
          error: (error) => {
            reject(error);
          },
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel using xlsx
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file format'));
      }
    });
  };

  const validateRecords = (records: any[], type: ImportType): ValidationError[] => {
    const errors: ValidationError[] = [];

    records.forEach((record, index) => {
      const rowNum = index + 2; // +2 for header and 0-indexing

      switch (type) {
        case 'vehicles':
          if (!record.vin) errors.push({ row: rowNum, field: 'vin', error: 'VIN is required' });
          if (!record.make) errors.push({ row: rowNum, field: 'make', error: 'Make is required' });
          if (!record.model) errors.push({ row: rowNum, field: 'model', error: 'Model is required' });
          if (!record.year || isNaN(record.year)) errors.push({ row: rowNum, field: 'year', error: 'Valid year is required' });
          if (!record.vehicle_type) errors.push({ row: rowNum, field: 'vehicle_type', error: 'Vehicle type is required' });
          break;
        case 'odometer_readings':
          if (!record.vehicle_id) errors.push({ row: rowNum, field: 'vehicle_id', error: 'Vehicle ID is required' });
          if (!record.reading || isNaN(record.reading)) errors.push({ row: rowNum, field: 'reading', error: 'Valid reading is required' });
          break;
        case 'components':
          if (!record.vehicle_id) errors.push({ row: rowNum, field: 'vehicle_id', error: 'Vehicle ID is required' });
          if (!record.component_type) errors.push({ row: rowNum, field: 'component_type', error: 'Component type is required' });
          if (!record.installation_date) errors.push({ row: rowNum, field: 'installation_date', error: 'Installation date is required' });
          break;
      }
    });

    return errors;
  };

  const importMutation = useMutation({
    mutationFn: async ({ type, records }: { type: ImportType; records: any[] }) => {
      const result: ImportResult = {
        successCount: 0,
        failureCount: 0,
        errors: [],
      };

      for (let i = 0; i < records.length; i++) {
        try {
          const record = { ...records[i] };
          
          // Add tenant_id to record
          if (user?.tenantId) {
            record.tenant_id = user.tenantId;
          }

          // Add source for odometer readings
          if (type === 'odometer_readings' && !record.source) {
            record.source = 'bulk';
          }

          // Import based on type
          let error;
          switch (type) {
            case 'vehicles':
              ({ error } = await supabase.from('vehicles').insert(record));
              break;
            case 'odometer_readings':
              // Add submitted_by
              if (user?.id) {
                record.submitted_by = user.id;
              }
              ({ error } = await supabase.from('odometer_readings').insert(record));
              break;
            case 'components':
              ({ error } = await supabase.from('components').insert(record));
              break;
          }

          if (error) throw error;
          result.successCount++;
        } catch (err: any) {
          result.failureCount++;
          result.errors.push({
            row: i + 2, // +2 because of header row and 0-indexing
            error: err.message || 'Unknown error',
          });
        }
      }

      return result;
    },
    onSuccess: (result) => {
      setImportResult(result);
      setFile(null);
      setPreview([]);
      setShowPreview(false);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      try {
        setFile(selectedFile);
        setImportResult(null);
        setValidationErrors([]);
        
        // Parse and preview file
        const parsedData = await parseFile(selectedFile);
        setPreview(parsedData.slice(0, 10)); // Preview first 10 rows
        
        // Validate records
        const errors = validateRecords(parsedData, selectedType);
        setValidationErrors(errors);
        setShowPreview(true);
      } catch (error: any) {
        alert(`Failed to parse file: ${error.message}`);
        setFile(null);
        setPreview([]);
        setShowPreview(false);
      }
    }
  };

  const handleImport = async () => {
    if (file) {
      try {
        const parsedData = await parseFile(file);
        
        // Final validation
        const errors = validateRecords(parsedData, selectedType);
        if (errors.length > 0) {
          alert(`Please fix ${errors.length} validation errors before importing`);
          return;
        }

        importMutation.mutate({ type: selectedType, records: parsedData });
      } catch (error: any) {
        alert(`Failed to import: ${error.message}`);
      }
    }
  };

  const handleDownloadTemplate = () => {
    let headers: string[];
    switch (selectedType) {
      case 'vehicles':
        headers = ['vin', 'make', 'model', 'year', 'vehicle_type', 'current_odometer', 'unit'];
        break;
      case 'odometer_readings':
        headers = ['vehicle_id', 'reading', 'timestamp', 'source'];
        break;
      case 'components':
        headers = ['vehicle_id', 'component_type', 'installation_date', 'installation_odometer', 'expected_life_km'];
        break;
      default:
        headers = [];
    }

    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Data Import
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Import bulk data from CSV or Excel files
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="card">
          {/* Import Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Data Type to Import
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 'vehicles', label: 'Vehicles', description: 'Import vehicle records' },
                { value: 'odometer_readings', label: 'Odometer Readings', description: 'Import odometer data' },
                { value: 'components', label: 'Components', description: 'Import component installations' },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value as ImportType)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedType === type.value
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Template Download */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  Download Template
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Download a CSV template with the correct headers for {selectedType.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
              >
                Download
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Selected: {file.name}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Supported formats: CSV, XLSX, XLS (Max 10,000 rows)
            </p>
          </div>

          {/* Import Button */}
          <div className="mb-6">
            <button
              onClick={handleImport}
              disabled={!file || importMutation.isPending || validationErrors.length > 0}
              className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importMutation.isPending ? 'Importing...' : `Import ${selectedType.replace('_', ' ')}`}
            </button>
            {validationErrors.length > 0 && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                Please fix {validationErrors.length} validation error(s) before importing
              </p>
            )}
          </div>

          {/* Preview Section */}
          {showPreview && preview.length > 0 && (
            <div className="mb-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                Preview (First 10 Rows)
              </h3>
              
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                    Validation Errors ({validationErrors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
                      {validationErrors.slice(0, 10).map((error, index) => (
                        <li key={index}>
                          Row {error.row}, Field "{error.field}": {error.error}
                        </li>
                      ))}
                      {validationErrors.length > 10 && (
                        <li className="italic">... and {validationErrors.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {Object.keys(preview[0] || {}).map((key) => (
                        <th
                          key={key}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {preview.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        {Object.values(row).map((value: any, idx) => (
                          <td key={idx} className="px-3 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                Import Results
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.successCount}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-300">
                    Successful Imports
                  </div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.failureCount}
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-300">
                    Failed Imports
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Error Details:
                  </h4>
                  <div className="max-h-60 overflow-y-auto bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                    <table className="min-w-full divide-y divide-red-200 dark:divide-red-800">
                      <thead className="bg-red-100 dark:bg-red-900/30">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-900 dark:text-red-200">
                            Row
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-900 dark:text-red-200">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-200 dark:divide-red-800">
                        {importResult.errors.map((error, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-red-800 dark:text-red-300">
                              {error.row}
                            </td>
                            <td className="px-4 py-2 text-sm text-red-800 dark:text-red-300">
                              {error.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
