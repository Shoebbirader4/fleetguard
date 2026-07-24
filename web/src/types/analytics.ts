/**
 * Analytics types for FleetGuard AI
 */

export interface FleetMetrics {
  fleet_health_score: number;
  total_vehicles: number;
  vehicles_in_service: number;
  vehicles_under_maintenance: number;
  vehicles_overdue: number;
}

export interface MTBFMTTRMetric {
  vehicle_id?: string;
  vehicle_name?: string;
  mtbf_hours: number; // Mean Time Between Failures
  mttr_hours: number; // Mean Time To Repair
  failure_count: number;
  total_downtime_hours: number;
}

export interface BreakdownTrend {
  failure_category: string;
  count: number;
  percentage: number;
  total_cost: number;
}

export interface CostAnalysis {
  total_cost: number;
  cost_per_vehicle: number;
  cost_per_km: number;
  cost_by_category: {
    parts: number;
    labor: number;
    external_service: number;
    fuel: number;
  };
  top_cost_contributors: {
    vehicle_id: string;
    vehicle_name: string;
    total_cost: number;
  }[];
}

export interface DowntimeAnalysis {
  total_downtime_hours: number;
  downtime_per_vehicle: number;
  downtime_cost: number; // estimated cost based on hourly rate
  downtime_by_vehicle: {
    vehicle_id: string;
    vehicle_name: string;
    downtime_hours: number;
    percentage: number;
  }[];
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface AnalyticsFilters extends DateRange {
  vehicle_id?: string;
}
