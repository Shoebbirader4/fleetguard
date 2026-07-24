import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import Vehicle from './Vehicle';

export default class Component extends Model {
  static table = 'components';
  static associations = {
    vehicles: { type: 'belongs_to', key: 'vehicle_id' },
  } as const;

  @field('tenant_id') tenantId!: string;
  @field('vehicle_id') vehicleId!: string;
  @field('component_type') componentType!: string;
  @field('component_subtype') componentSubtype?: string;
  @field('brand') brand?: string;
  @field('model') model?: string;
  @field('installation_date') installationDate!: number;
  @field('installation_odometer') installationOdometer!: number;
  @field('expected_life_days') expectedLifeDays?: number;
  @field('expected_life_km') expectedLifeKm?: number;
  @field('status') status!: string;
  @field('synced') synced!: boolean;
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('vehicles', 'vehicle_id') vehicle: any;
}
