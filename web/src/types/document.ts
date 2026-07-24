/**
 * Document types for FleetGuard AI
 */

export interface Document {
  id: string;
  tenant_id: string;
  vehicle_id: string | null;
  document_type: 'insurance' | 'rc_book' | 'fitness_certificate' | 'pollution_certificate' | 'invoice' | 'warranty' | 'service_report';
  file_name: string;
  file_url: string;
  file_size: number;
  expiry_date: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface DocumentWithVehicle extends Document {
  vehicle?: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
  };
  uploader?: {
    full_name: string;
    email: string;
  };
}

export const DOCUMENT_TYPES = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'rc_book', label: 'RC Book' },
  { value: 'fitness_certificate', label: 'Fitness Certificate' },
  { value: 'pollution_certificate', label: 'Pollution Certificate' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'service_report', label: 'Service Report' },
] as const;
