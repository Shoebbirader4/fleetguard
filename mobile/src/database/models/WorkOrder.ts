import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import Vehicle from './Vehicle';

export default class WorkOrder extends Model {
  static table = 'work_orders';
  static associations = {
    vehicles: { type: 'belongs_to', key: 'vehicle_id' },
  } as const;

  @field('tenant_id') tenantId!: string;
  @field('work_order_number') workOrderNumber!: string;
  @field('vehicle_id') vehicleId!: string;
  @field('description') description!: string;
  @field('priority') priority!: string;
  @field('status') status!: string;
  @field('requested_by') requestedBy!: string;
  @field('assigned_to') assignedTo?: string;
  @field('started_at') startedAt?: number;
  @field('completed_at') completedAt?: number;
  @field('total_labor_hours') totalLaborHours?: number;
  @field('total_cost') totalCost?: number;
  @field('synced') synced!: boolean;
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('vehicles', 'vehicle_id') vehicle: any;
}
