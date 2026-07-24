"""
Feature Engineering Pipeline for Predictive Maintenance

This module extracts and transforms data from PostgreSQL database
to prepare features for ML model training and prediction.

Features extracted:
1. Component age (days since installation)
2. Usage intensity (km per day average)
3. Historical failure count for component type
4. Maintenance frequency compliance rate
5. Vehicle route type and seasonal factors
"""
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, date
import psycopg2.extras
from database import get_db_cursor

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Feature engineering pipeline for predictive maintenance ML models
    """
    
    def __init__(self):
        """Initialize the feature engineering pipeline"""
        self.season_map = {
            12: 'winter', 1: 'winter', 2: 'winter',
            3: 'spring', 4: 'spring', 5: 'spring',
            6: 'summer', 7: 'summer', 8: 'summer',
            9: 'autumn', 10: 'autumn', 11: 'autumn'
        }
    
    def extract_component_features(
        self, 
        tenant_id: str, 
        vehicle_ids: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Extract features for all active components
        
        Args:
            tenant_id: Tenant UUID
            vehicle_ids: Optional list of vehicle UUIDs to filter
            
        Returns:
            List of feature dictionaries for each component
        """
        try:
            with get_db_cursor() as cursor:
                # Build query with optional vehicle filter
                vehicle_filter = ""
                params = [tenant_id]
                
                if vehicle_ids:
                    placeholders = ','.join(['%s'] * len(vehicle_ids))
                    vehicle_filter = f"AND c.vehicle_id IN ({placeholders})"
                    params.extend(vehicle_ids)
                
                query = f"""
                    SELECT 
                        c.id as component_id,
                        c.vehicle_id,
                        c.component_type,
                        c.component_subtype,
                        c.installation_date,
                        c.installation_odometer,
                        c.expected_life_days,
                        c.expected_life_km,
                        c.maintenance_frequency_km,
                        v.current_odometer,
                        v.assigned_route,
                        v.vehicle_type
                    FROM components c
                    INNER JOIN vehicles v ON c.vehicle_id = v.id
                    WHERE c.tenant_id = %s
                      AND c.status = 'active'
                      AND v.status = 'active'
                      {vehicle_filter}
                    ORDER BY c.vehicle_id, c.component_type
                """
                
                cursor.execute(query, params)
                components = cursor.fetchall()
                
                logger.info(f"Extracted {len(components)} components for feature engineering")
                
                # Extract features for each component
                features = []
                for comp in components:
                    feature_dict = self._build_component_features(comp, tenant_id)
                    if feature_dict:
                        features.append(feature_dict)
                
                return features
                
        except Exception as e:
            logger.error(f"Failed to extract component features: {e}")
            raise
    
    def _build_component_features(self, component: Dict, tenant_id: str) -> Optional[Dict]:
        """
        Build feature dictionary for a single component
        
        Args:
            component: Component record from database
            tenant_id: Tenant UUID
            
        Returns:
            Dictionary of features or None if insufficient data
        """
        try:
            # Feature 1: Component age (days since installation)
            component_age_days = self._calculate_component_age(
                component['installation_date']
            )
            
            # Feature 2: Usage intensity (km per day average)
            usage_intensity = self._calculate_usage_intensity(
                component['vehicle_id'],
                component['installation_date'],
                component['installation_odometer'],
                component['current_odometer']
            )
            
            # Feature 3: Historical failure count for component type
            failure_count = self._get_historical_failure_count(
                tenant_id,
                component['component_type']
            )
            
            # Feature 4: Maintenance frequency compliance rate
            compliance_rate = self._calculate_maintenance_compliance(
                component['component_id'],
                component['vehicle_id'],
                component['installation_date'],
                component['maintenance_frequency_km'],
                component['current_odometer'],
                component['installation_odometer']
            )
            
            # Feature 5: Route type encoding
            route_type_encoded = self._encode_route_type(
                component['assigned_route']
            )
            
            # Feature 6: Seasonal factors
            current_season = self._get_current_season()
            
            # Calculate usage ratios
            odometer_usage_ratio = self._calculate_odometer_usage_ratio(
                component['installation_odometer'],
                component['current_odometer'],
                component['expected_life_km']
            )
            
            time_usage_ratio = self._calculate_time_usage_ratio(
                component['installation_date'],
                component['expected_life_days']
            )
            
            # Build feature dictionary
            features = {
                'component_id': str(component['component_id']),
                'vehicle_id': str(component['vehicle_id']),
                'component_type': component['component_type'],
                'component_subtype': component['component_subtype'],
                
                # Engineered features
                'component_age_days': component_age_days,
                'usage_intensity_km_per_day': usage_intensity,
                'historical_failure_count': failure_count,
                'maintenance_compliance_rate': compliance_rate,
                'route_type': route_type_encoded,
                'current_season': current_season,
                'odometer_usage_ratio': odometer_usage_ratio,
                'time_usage_ratio': time_usage_ratio,
                
                # Raw data for reference
                'current_odometer': component['current_odometer'],
                'installation_odometer': component['installation_odometer'],
                'expected_life_days': component['expected_life_days'],
                'expected_life_km': component['expected_life_km'],
                'vehicle_type': component['vehicle_type']
            }
            
            return features
            
        except Exception as e:
            logger.warning(f"Failed to build features for component {component.get('component_id')}: {e}")
            return None
    
    def _calculate_component_age(self, installation_date: date) -> int:
        """
        Calculate component age in days since installation
        
        Args:
            installation_date: Date component was installed
            
        Returns:
            Age in days
        """
        if not installation_date:
            return 0
        
        today = date.today()
        age = (today - installation_date).days
        return max(0, age)
    
    def _calculate_usage_intensity(
        self,
        vehicle_id: str,
        installation_date: date,
        installation_odometer: int,
        current_odometer: int
    ) -> float:
        """
        Calculate usage intensity as km per day average
        
        Args:
            vehicle_id: Vehicle UUID
            installation_date: Date component was installed
            installation_odometer: Odometer reading at installation
            current_odometer: Current odometer reading
            
        Returns:
            Average km per day
        """
        try:
            age_days = self._calculate_component_age(installation_date)
            
            if age_days == 0:
                return 0.0
            
            km_driven = max(0, current_odometer - installation_odometer)
            usage_intensity = km_driven / age_days
            
            return round(usage_intensity, 2)
            
        except Exception as e:
            logger.warning(f"Failed to calculate usage intensity for vehicle {vehicle_id}: {e}")
            return 0.0
    
    def _get_historical_failure_count(
        self,
        tenant_id: str,
        component_type: str
    ) -> int:
        """
        Query historical failure count for component type
        
        Args:
            tenant_id: Tenant UUID
            component_type: Type of component
            
        Returns:
            Count of historical failures
        """
        try:
            with get_db_cursor() as cursor:
                # Count completed work orders with failure category for this component type
                # Look for work orders that involved replacing components of this type
                query = """
                    SELECT COUNT(DISTINCT wo.id)
                    FROM work_orders wo
                    INNER JOIN components c ON wo.vehicle_id = c.vehicle_id
                    WHERE wo.tenant_id = %s
                      AND c.component_type = %s
                      AND wo.status = 'completed'
                      AND wo.failure_category IS NOT NULL
                      AND wo.completed_at IS NOT NULL
                """
                
                cursor.execute(query, (tenant_id, component_type))
                result = cursor.fetchone()
                
                return result['count'] if result else 0
                
        except Exception as e:
            logger.warning(f"Failed to get historical failure count: {e}")
            return 0
    
    def _calculate_maintenance_compliance(
        self,
        component_id: str,
        vehicle_id: str,
        installation_date: date,
        maintenance_frequency_km: Optional[int],
        current_odometer: int,
        installation_odometer: int
    ) -> float:
        """
        Calculate maintenance frequency compliance rate
        
        Args:
            component_id: Component UUID
            vehicle_id: Vehicle UUID
            installation_date: Date component was installed
            maintenance_frequency_km: Expected maintenance interval in km
            current_odometer: Current odometer reading
            installation_odometer: Odometer at installation
            
        Returns:
            Compliance rate as percentage (0-100)
        """
        try:
            if not maintenance_frequency_km or maintenance_frequency_km == 0:
                # If no maintenance schedule, consider fully compliant
                return 100.0
            
            # Calculate how many maintenance events should have occurred
            km_driven = max(0, current_odometer - installation_odometer)
            expected_maintenance_count = km_driven / maintenance_frequency_km
            
            if expected_maintenance_count < 1:
                # Not due for maintenance yet
                return 100.0
            
            # Count actual maintenance events for this component
            with get_db_cursor() as cursor:
                query = """
                    SELECT COUNT(DISTINCT wo.id)
                    FROM work_orders wo
                    WHERE wo.vehicle_id = %s
                      AND wo.status = 'completed'
                      AND wo.completed_at >= %s
                      AND wo.description ILIKE %s
                """
                
                # Search for work orders mentioning this component type
                search_pattern = f"%maintenance%"
                cursor.execute(query, (vehicle_id, installation_date, search_pattern))
                result = cursor.fetchone()
                
                actual_maintenance_count = result['count'] if result else 0
                
                # Calculate compliance rate
                compliance_rate = (actual_maintenance_count / expected_maintenance_count) * 100
                
                # Cap at 100%
                return min(100.0, round(compliance_rate, 2))
                
        except Exception as e:
            logger.warning(f"Failed to calculate maintenance compliance: {e}")
            return 50.0  # Default to 50% if calculation fails
    
    def _encode_route_type(self, assigned_route: Optional[str]) -> str:
        """
        Encode vehicle route type
        
        Args:
            assigned_route: Route description
            
        Returns:
            Route type category: 'urban', 'highway', 'mixed', 'unknown'
        """
        if not assigned_route:
            return 'unknown'
        
        route_lower = assigned_route.lower()
        
        # Simple keyword-based classification (check mixed first to avoid conflicts)
        if any(keyword in route_lower for keyword in ['mixed', 'combined']):
            return 'mixed'
        elif any(keyword in route_lower for keyword in ['highway', 'expressway', 'interstate']):
            return 'highway'
        elif any(keyword in route_lower for keyword in ['city', 'urban', 'downtown', 'local']):
            return 'urban'
        else:
            return 'unknown'
    
    def _get_current_season(self) -> str:
        """
        Get current season based on month
        
        Returns:
            Season: 'winter', 'spring', 'summer', 'autumn'
        """
        current_month = datetime.now().month
        return self.season_map.get(current_month, 'unknown')
    
    def _calculate_odometer_usage_ratio(
        self,
        installation_odometer: int,
        current_odometer: int,
        expected_life_km: Optional[int]
    ) -> float:
        """
        Calculate ratio of odometer usage vs expected life
        
        Args:
            installation_odometer: Odometer at installation
            current_odometer: Current odometer
            expected_life_km: Expected life in kilometers
            
        Returns:
            Usage ratio (0.0 to 1.0+, can exceed 1.0 if over expected life)
        """
        if not expected_life_km or expected_life_km == 0:
            return 0.0
        
        km_used = max(0, current_odometer - installation_odometer)
        ratio = km_used / expected_life_km
        
        return round(ratio, 4)
    
    def _calculate_time_usage_ratio(
        self,
        installation_date: date,
        expected_life_days: Optional[int]
    ) -> float:
        """
        Calculate ratio of time usage vs expected life
        
        Args:
            installation_date: Date component was installed
            expected_life_days: Expected life in days
            
        Returns:
            Usage ratio (0.0 to 1.0+, can exceed 1.0 if over expected life)
        """
        if not expected_life_days or expected_life_days == 0:
            return 0.0
        
        days_used = self._calculate_component_age(installation_date)
        ratio = days_used / expected_life_days
        
        return round(ratio, 4)
    
    def get_feature_vector(self, feature_dict: Dict) -> List[float]:
        """
        Convert feature dictionary to numeric vector for ML models
        
        Args:
            feature_dict: Feature dictionary
            
        Returns:
            List of numeric features
        """
        # Map categorical features to numeric
        route_type_map = {
            'urban': 0,
            'highway': 1,
            'mixed': 2,
            'unknown': 3
        }
        
        season_map = {
            'winter': 0,
            'spring': 1,
            'summer': 2,
            'autumn': 3,
            'unknown': 4
        }
        
        # Build numeric feature vector
        features = [
            feature_dict['component_age_days'],
            feature_dict['usage_intensity_km_per_day'],
            feature_dict['historical_failure_count'],
            feature_dict['maintenance_compliance_rate'],
            route_type_map.get(feature_dict['route_type'], 3),
            season_map.get(feature_dict['current_season'], 4),
            feature_dict['odometer_usage_ratio'],
            feature_dict['time_usage_ratio']
        ]
        
        return features
    
    def get_feature_names(self) -> List[str]:
        """
        Get list of feature names in order
        
        Returns:
            List of feature names
        """
        return [
            'component_age_days',
            'usage_intensity_km_per_day',
            'historical_failure_count',
            'maintenance_compliance_rate',
            'route_type_encoded',
            'season_encoded',
            'odometer_usage_ratio',
            'time_usage_ratio'
        ]
    
    def extract_training_data(
        self,
        tenant_id: str,
        component_type: Optional[str] = None
    ) -> Tuple[List[List[float]], List[int]]:
        """
        Extract training data with labels (failures)
        
        Args:
            tenant_id: Tenant UUID
            component_type: Optional component type filter
            
        Returns:
            Tuple of (feature_matrix, labels)
        """
        try:
            with get_db_cursor() as cursor:
                # Query components that were replaced with failure information
                component_filter = ""
                params = [tenant_id]
                
                if component_type:
                    component_filter = "AND c.component_type = %s"
                    params.append(component_type)
                
                query = f"""
                    SELECT 
                        c.id as component_id,
                        c.vehicle_id,
                        c.component_type,
                        c.component_subtype,
                        c.installation_date,
                        c.installation_odometer,
                        c.expected_life_days,
                        c.expected_life_km,
                        c.maintenance_frequency_km,
                        c.status,
                        v.current_odometer,
                        v.assigned_route,
                        v.vehicle_type,
                        -- Check if component was replaced due to failure
                        CASE 
                            WHEN EXISTS (
                                SELECT 1 FROM work_orders wo
                                WHERE wo.vehicle_id = c.vehicle_id
                                  AND wo.completed_at > c.installation_date
                                  AND wo.failure_category IS NOT NULL
                                  AND wo.status = 'completed'
                            ) THEN 1
                            ELSE 0
                        END as failed
                    FROM components c
                    INNER JOIN vehicles v ON c.vehicle_id = v.id
                    WHERE c.tenant_id = %s
                      {component_filter}
                    ORDER BY c.created_at DESC
                    LIMIT 10000
                """
                
                cursor.execute(query, params)
                components = cursor.fetchall()
                
                logger.info(f"Extracted {len(components)} components for training data")
                
                # Extract features and labels
                feature_matrix = []
                labels = []
                
                for comp in components:
                    feature_dict = self._build_component_features(comp, tenant_id)
                    if feature_dict:
                        feature_vector = self.get_feature_vector(feature_dict)
                        feature_matrix.append(feature_vector)
                        labels.append(comp['failed'])
                
                return feature_matrix, labels
                
        except Exception as e:
            logger.error(f"Failed to extract training data: {e}")
            raise


# Global instance for reuse
feature_engineer = FeatureEngineer()
