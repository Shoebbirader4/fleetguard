import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, children } from '@nozbe/watermelondb/decorators';

export default class InspectionChecklist extends Model {
  static table = 'inspection_checklists';
  static associations = {
    inspections: { type: 'has_many', foreignKey: 'checklist_id' },
  } as const;

  @field('tenant_id') tenantId!: string;
  @field('name') name!: string;
  @field('vehicle_type') vehicleType!: string;
  @field('checklist_items') checklistItems!: string; // JSON string
  @field('synced') synced!: boolean;
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('inspections') inspections: any;
}
