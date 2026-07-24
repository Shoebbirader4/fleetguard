import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ExportButtonProps {
  data: any[];
  filename: string;
  format: 'csv' | 'excel';
  label?: string;
  className?: string;
}

export default function ExportButton({
  data,
  filename,
  format,
  label = 'Export',
  className = 'px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium',
}: ExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      if (format === 'csv') {
        // Export as CSV using papaparse
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `${filename}.csv`);
      } else if (format === 'excel') {
        // Export as Excel using xlsx
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

        // Generate Excel file
        const excelBuffer = XLSX.write(workbook, {
          bookType: 'xlsx',
          type: 'array',
        });

        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, `${filename}.xlsx`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  return (
    <button onClick={handleExport} className={className}>
      {label}
    </button>
  );
}
