import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Alert extends Model {
  static table = 'alerts';

  @field('tenant_id') tenantId!: string;
  @field('vehicle_id') vehicleId?: string;
  @field('component_id') componentId?: string;
  @field('alert_type') alertType!: string;
  @field('severity') severity!: string;
  @field('title') title!: string;
  @field('description') description!: string;
  @field('status') status!: string;
  @field('synced') synced!: boolean;
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
