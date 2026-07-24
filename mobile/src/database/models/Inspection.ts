import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import Vehicle from './Vehicle';

export default class Inspection extends Model {
  static table = 'inspections';
  static associations = {
    vehicles: { type: 'belongs_to', key: 'vehicle_id' },
  } as const;

  @field('tenant_id') tenantId!: string;
  @field('vehicle_id') vehicleId!: string;
  @field('inspector_id') inspectorId!: string;
  @field('checklist_id') checklistId!: string;
  @field('inspection_date') inspectionDate!: number;
  @field('odometer_reading') odometerReading!: number;
  @field('overall_status') overallStatus!: string;
  @field('checklist_results') checklistResults!: string; // JSON string
  @field('defects_reported') defectsReported!: number;
  @field('synced') synced!: boolean;
  
  @readonly @date('created_at') createdAt!: Date;

  @relation('vehicles', 'vehicle_id') vehicle: any;
}
