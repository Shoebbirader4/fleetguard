import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, children } from '@nozbe/watermelondb/decorators';

export default class Vehicle extends Model {
  static table = 'vehicles';
  static associations = {
    work_orders: { type: 'has_many', foreignKey: 'vehicle_id' },
    components: { type: 'has_many', foreignKey: 'vehicle_id' },
    inspections: { type: 'has_many', foreignKey: 'vehicle_id' },
  } as const;

  @field('tenant_id') tenantId!: string;
  @field('vin') vin!: string;
  @field('chassis_number') chassisNumber?: string;
  @field('engine_number') engineNumber?: string;
  @field('make') make!: string;
  @field('model') model!: string;
  @field('year') year!: number;
  @field('vehicle_type') vehicleType!: string;
  @field('current_odometer') currentOdometer!: number;
  @field('unit') unit!: string;
  @field('status') status!: string;
  @field('assigned_route') assignedRoute?: string;
  @field('depot_location') depotLocation?: string;
  @field('synced') synced!: boolean;
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('work_orders') workOrders: any;
  @children('components') components: any;
  @children('inspections') inspections: any;
}
