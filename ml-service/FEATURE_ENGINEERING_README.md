# Feature Engineering Pipeline Documentation

## Overview

The feature engineering pipeline transforms raw database records into meaningful features for machine learning models. This module is the foundation of the FleetGuard AI predictive maintenance system.

## Quick Start

```python
from feature_engineering import feature_engineer

# Extract features for prediction
features = feature_engineer.extract_component_features(
    tenant_id='your-tenant-uuid',
    vehicle_ids=['vehicle-uuid-1', 'vehicle-uuid-2']  # Optional
)

# Extract training data with labels
feature_matrix, labels = feature_engineer.extract_training_data(
    tenant_id='your-tenant-uuid',
    component_type='brake'  # Optional
)

# Convert feature dict to numeric vector
vector = feature_engineer.get_feature_vector(features[0])
```

## Feature Catalog

### 1. Component Age (Days)

**Name:** `component_age_days`

**Type:** Integer

**Range:** 0 to ∞

**Description:** Number of days since the component was installed on the vehicle.

**Calculation:** `current_date - installation_date`

**ML Value:** Older components are more likely to fail. This is the primary time-based predictor.

**Example:**
```python
component_age_days: 180  # Component installed 6 months ago
```

---

### 2. Usage Intensity (km/day)

**Name:** `usage_intensity_km_per_day`

**Type:** Float

**Range:** 0.0 to ∞

**Description:** Average kilometers driven per day since installation.

**Calculation:** `(current_odometer - installation_odometer) / component_age_days`

**ML Value:** High usage intensity accelerates wear. A bus driving 500 km/day will wear components faster than one driving 50 km/day, even if both are the same age.

**Example:**
```python
usage_intensity_km_per_day: 150.5  # Vehicle drives ~150 km per day
```

**Typical Ranges:**
- Urban bus: 80-150 km/day
- Long-haul truck: 400-600 km/day
- School bus: 40-80 km/day

---

### 3. Historical Failure Count

**Name:** `historical_failure_count`

**Type:** Integer

**Range:** 0 to ∞

**Description:** Total number of historical failures for this component type across the entire fleet.

**Calculation:** COUNT of completed work orders with failure categories for this component type.

**ML Value:** Component types with high historical failure rates are more likely to fail again. This captures component reliability at the fleet level.

**Example:**
```python
historical_failure_count: 12  # This component type has failed 12 times across fleet
```

**Business Logic:**
- Low count (0-5): Reliable component type
- Medium count (6-20): Normal wear item
- High count (20+): Problem component, consider alternative suppliers

---

### 4. Maintenance Compliance Rate (%)

**Name:** `maintenance_compliance_rate`

**Type:** Float

**Range:** 0.0 to 100.0

**Description:** Percentage of scheduled maintenance that has been completed on time.

**Calculation:** `(actual_maintenance_count / expected_maintenance_count) * 100`

**ML Value:** Low compliance correlates with higher failure risk. Skipping scheduled maintenance increases the probability of unexpected failures.

**Example:**
```python
maintenance_compliance_rate: 85.0  # 85% of scheduled maintenance completed
```

**Business Logic:**
- 100%: Fully compliant (no maintenance due yet, or all completed)
- 80-99%: Good compliance
- 50-79%: Moderate compliance
- <50%: Poor compliance, high failure risk

**Special Cases:**
- No maintenance schedule defined → 100% (no compliance requirement)
- Not yet due for maintenance → 100% (compliant until first due date)

---

### 5. Route Type (Categorical)

**Name:** `route_type`

**Type:** String (categorical)

**Values:** `urban`, `highway`, `mixed`, `unknown`

**Description:** Classification of the vehicle's operating environment.

**Classification Logic:**
```python
'urban'    # Keywords: city, urban, downtown, local
'highway'  # Keywords: highway, expressway, interstate
'mixed'    # Keywords: mixed, combined
'unknown'  # No classification or no route assigned
```

**ML Value:** Different routes cause different wear patterns:
- **Urban:** More brake wear (stop-and-go), less tire wear
- **Highway:** More tire wear, less brake wear, sustained engine stress
- **Mixed:** Balanced wear patterns

**Encoding for ML:**
```python
urban: 0
highway: 1
mixed: 2
unknown: 3
```

**Example:**
```python
route_type: 'urban'  # City bus route
```

---

### 6. Current Season (Categorical)

**Name:** `current_season`

**Type:** String (categorical)

**Values:** `winter`, `spring`, `summer`, `autumn`

**Description:** Current season based on month.

**Season Mapping:**
- Winter: December, January, February
- Spring: March, April, May
- Summer: June, July, August
- Autumn: September, October, November

**ML Value:** Weather impacts component performance:
- **Winter:** Battery failures, cold-weather tire issues, heater failures
- **Summer:** A/C failures, cooling system stress, tire blowouts from heat
- **Spring/Autumn:** Moderate conditions, fewer weather-related failures

**Encoding for ML:**
```python
winter: 0
spring: 1
summer: 2
autumn: 3
```

**Example:**
```python
current_season: 'winter'  # Current month is December, January, or February
```

---

### 7. Odometer Usage Ratio

**Name:** `odometer_usage_ratio`

**Type:** Float

**Range:** 0.0 to ∞ (typically 0.0-1.0, can exceed 1.0)

**Description:** Ratio of kilometers used versus expected component life in kilometers.

**Calculation:** `km_used / expected_life_km`

**ML Value:** This is the **primary predictor** for distance-based components (tires, brakes). A ratio of 0.9 means the component is at 90% of its expected life.

**Example:**
```python
odometer_usage_ratio: 0.75  # Component has used 75% of expected km life
```

**Interpretation:**
- 0.0-0.5: Early life, low failure risk
- 0.5-0.8: Mid-life, moderate risk
- 0.8-1.0: Near end of life, high risk
- \>1.0: Exceeded expected life, critical risk

---

### 8. Time Usage Ratio

**Name:** `time_usage_ratio`

**Type:** Float

**Range:** 0.0 to ∞ (typically 0.0-1.0, can exceed 1.0)

**Description:** Ratio of time elapsed versus expected component life in days.

**Calculation:** `days_used / expected_life_days`

**ML Value:** This is the **primary predictor** for time-based components (batteries, fluids, seals). Some components degrade over time regardless of usage.

**Example:**
```python
time_usage_ratio: 0.82  # Component has used 82% of expected time life
```

**Interpretation:**
- 0.0-0.5: Early life, low failure risk
- 0.5-0.8: Mid-life, moderate risk
- 0.8-1.0: Near end of life, high risk
- \>1.0: Exceeded expected life, critical risk

**Combined Analysis:**

Compare `odometer_usage_ratio` vs `time_usage_ratio`:

| Odometer | Time | Interpretation |
|----------|------|----------------|
| 0.9 | 0.5 | High usage intensity - worn from heavy use |
| 0.5 | 0.9 | Low usage intensity - aging but not worn |
| 0.8 | 0.8 | Normal usage - both factors at end of life |
| 1.2 | 0.7 | Exceeded km life but time OK - inspect now |
| 0.7 | 1.2 | Exceeded time life but km OK - replace soon |

---

## Feature Vector Format

### For Prediction

```python
features = {
    'component_id': 'uuid',
    'vehicle_id': 'uuid',
    'component_type': 'brake',
    'component_subtype': 'front_brake_pad',
    
    # 8 engineered features
    'component_age_days': 180,
    'usage_intensity_km_per_day': 120.5,
    'historical_failure_count': 8,
    'maintenance_compliance_rate': 85.0,
    'route_type': 'urban',
    'current_season': 'winter',
    'odometer_usage_ratio': 0.75,
    'time_usage_ratio': 0.60,
    
    # Reference data
    'current_odometer': 45000,
    'installation_odometer': 10000,
    'expected_life_days': 300,
    'expected_life_km': 50000,
    'vehicle_type': 'bus'
}
```

### For ML Models (Numeric Vector)

```python
vector = [
    180,    # component_age_days
    120.5,  # usage_intensity_km_per_day
    8,      # historical_failure_count
    85.0,   # maintenance_compliance_rate
    0,      # route_type_encoded (urban)
    0,      # season_encoded (winter)
    0.75,   # odometer_usage_ratio
    0.60    # time_usage_ratio
]
```

---

## API Usage Examples

### Extract Features for All Vehicles

```python
from feature_engineering import feature_engineer

# Get features for all active components in a tenant
features = feature_engineer.extract_component_features(
    tenant_id='550e8400-e29b-41d4-a716-446655440000'
)

print(f"Extracted {len(features)} components")
for feature in features[:5]:  # Show first 5
    print(f"{feature['component_type']}: age={feature['component_age_days']}d, "
          f"usage={feature['usage_intensity_km_per_day']}km/day")
```

### Extract Features for Specific Vehicles

```python
# Get features for specific vehicles only
vehicle_ids = [
    '650e8400-e29b-41d4-a716-446655440001',
    '650e8400-e29b-41d4-a716-446655440002'
]

features = feature_engineer.extract_component_features(
    tenant_id='550e8400-e29b-41d4-a716-446655440000',
    vehicle_ids=vehicle_ids
)
```

### Extract Training Data

```python
# Get training data for all component types
X, y = feature_engineer.extract_training_data(
    tenant_id='550e8400-e29b-41d4-a716-446655440000'
)

print(f"Training samples: {len(X)}")
print(f"Failures: {sum(y)}")
print(f"Failure rate: {sum(y)/len(y)*100:.2f}%")
```

### Extract Training Data for Specific Component

```python
# Get training data for brakes only
X_brakes, y_brakes = feature_engineer.extract_training_data(
    tenant_id='550e8400-e29b-41d4-a716-446655440000',
    component_type='brake'
)
```

### Convert to Numeric Vector

```python
# Extract features
features = feature_engineer.extract_component_features(tenant_id)

# Convert first component to numeric vector
vector = feature_engineer.get_feature_vector(features[0])
print(vector)
# Output: [180, 120.5, 8, 85.0, 0, 0, 0.75, 0.60]

# Get feature names
names = feature_engineer.get_feature_names()
print(names)
# Output: ['component_age_days', 'usage_intensity_km_per_day', ...]
```

---

## Database Schema Requirements

### Required Tables

The feature engineering pipeline queries these tables:

1. **`components`**
   - `id`, `vehicle_id`, `component_type`, `component_subtype`
   - `installation_date`, `installation_odometer`
   - `expected_life_days`, `expected_life_km`
   - `maintenance_frequency_km`
   - `status` (must be 'active')

2. **`vehicles`**
   - `id`, `current_odometer`, `assigned_route`
   - `vehicle_type`, `status` (must be 'active')

3. **`work_orders`** (for historical failures)
   - `vehicle_id`, `status`, `failure_category`
   - `completed_at`, `description`

4. **`odometer_readings`** (for historical usage)
   - `vehicle_id`, `reading`, `timestamp`

### Required Indexes

Ensure these indexes exist for optimal performance:

```sql
-- Component queries
CREATE INDEX idx_components_tenant_id ON components(tenant_id);
CREATE INDEX idx_components_vehicle_id ON components(vehicle_id);
CREATE INDEX idx_components_status ON components(status);

-- Vehicle queries
CREATE INDEX idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- Work order queries
CREATE INDEX idx_work_orders_vehicle_id ON work_orders(vehicle_id);
CREATE INDEX idx_work_orders_completed_at ON work_orders(completed_at);
```

---

## Performance Characteristics

### Query Performance

| Component Count | Execution Time | Notes |
|-----------------|----------------|-------|
| 100 | ~0.5s | Single vehicle |
| 1,000 | ~2-3s | Small fleet |
| 10,000 | ~20-30s | Large fleet |
| 50,000 | ~2-3 min | Enterprise fleet |

**Optimization Tips:**
- Use `vehicle_ids` parameter to limit scope
- Run predictions in batches
- Consider caching for repeated queries
- Use materialized views for historical failure counts

### Memory Usage

| Component Count | Memory |
|-----------------|--------|
| 1,000 | ~5 MB |
| 10,000 | ~50 MB |
| 100,000 | ~500 MB |

Each feature dictionary is approximately 500 bytes.

---

## Error Handling

### Graceful Degradation

The pipeline handles missing data gracefully:

```python
# Missing maintenance schedule → 100% compliance
# Missing route information → 'unknown' route type
# Missing historical failures → 0 failures
# Invalid dates → 0 age
# Negative odometer values → 0 usage
```

### Logging

All operations are logged:

```python
logger.info(f"Extracted {len(features)} components for feature engineering")
logger.warning(f"Failed to build features for component {comp_id}: {error}")
logger.error(f"Failed to extract component features: {error}")
```

### Error Recovery

If feature extraction fails for one component, processing continues for others:

```python
for comp in components:
    feature_dict = self._build_component_features(comp, tenant_id)
    if feature_dict:  # Only add if successful
        features.append(feature_dict)
    # Else: Warning logged, continue to next component
```

---

## Testing

### Run All Tests

```bash
cd ml-service
pytest test_feature_engineering.py -v
```

### Run Specific Test Class

```bash
pytest test_feature_engineering.py::TestUsageIntensity -v
```

### Test Coverage

```bash
pytest test_feature_engineering.py --cov=feature_engineering
```

Expected coverage: ~95%

---

## Future Enhancements

### Planned Features

1. **GPS-based features**
   - Route difficulty score (elevation changes)
   - Actual vs planned distance variance
   - Idle time percentage

2. **Weather integration**
   - Temperature extremes
   - Precipitation history
   - Road condition factors

3. **Driver behavior**
   - Hard braking frequency
   - Rapid acceleration events
   - Speeding incidents

4. **Component interaction**
   - Correlation between component failures
   - Cascade failure patterns
   - Fleet-wide trends

### Performance Improvements

1. **Caching layer**
   - Cache historical failure counts (refresh daily)
   - Cache route type classifications
   - Cache seasonal mappings

2. **Parallel processing**
   - Process vehicles in parallel
   - Async database queries
   - Batch processing for large fleets

3. **Incremental updates**
   - Only recalculate changed components
   - Delta-based feature updates
   - Event-driven feature refresh

---

## References

### Related Documentation

- [Task 8.1: FastAPI Service Structure](TASK_8.1_COMPLETION_SUMMARY.md)
- [Task 8.2: Feature Engineering](TASK_8.2_COMPLETION_SUMMARY.md)
- [Design Document](../.kiro/specs/fleetguard-ai/design.md)
- [Requirements](../.kiro/specs/fleetguard-ai/requirements.md)

### Database Schema

- [Core Tables Migration](../supabase/migrations/20250607060400_create_core_tables.sql)
- [Component Tracking Migration](../supabase/migrations/20250607070000_create_component_tracking_tables.sql)
- [Workshop Tables Migration](../supabase/migrations/20250607080000_create_workshop_maintenance_tables.sql)

---

## Support

For issues or questions:

1. Check test suite for usage examples
2. Review completion summary for implementation details
3. Check database schema for data requirements
4. Review logs for error details

**Authors:** FleetGuard AI Development Team  
**Version:** 1.0.0  
**Last Updated:** June 2025
