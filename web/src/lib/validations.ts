const VIN_LENGTH = 17;

export function formatVIN(vin: string | null | undefined): string {
  if (!vin) return 'N/A';
  const normalized = vin.trim().toUpperCase();
  if (normalized.length <= 8) return normalized;
  return `${normalized.slice(0, 4)}…${normalized.slice(-4)}`;
}

export function getVINError(vin: string | null | undefined): string | null {
  const normalized = (vin || '').trim().toUpperCase();
  if (!normalized) return 'VIN is required';
  if (normalized.length !== VIN_LENGTH) return 'VIN must be exactly 17 characters';
  if (/[IOQ]/.test(normalized)) return 'VIN cannot contain I, O, or Q';
  if (!/^[A-HJ-NPR-Z0-9]+$/.test(normalized)) {
    return 'VIN can contain only letters and numbers';
  }
  return null;
}

export function validateVehicleYear(year: number | string | null | undefined): boolean {
  const numericYear = Number(year);
  const currentYear = new Date().getFullYear();
  return Number.isInteger(numericYear) && numericYear >= 1900 && numericYear <= currentYear + 2;
}

export function validateOdometer(value: number | string | null | undefined): boolean {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0;
}
