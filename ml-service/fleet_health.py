"""
Fleet Health Score Calculation

This module calculates the overall fleet health score (0-100) based on
aggregate predictions and component health metrics.

Fleet Health Score Formula:
- Components with LOW risk: +100 points (full health)
- Components with MEDIUM risk: +75 points
- Components with HIGH risk: +50 points
- Components with CRITICAL risk: +25 points
- Average all components to get overall fleet health

The score is normalized to 0-100 scale where:
- 90-100: Excellent fleet health
- 75-89: Good fleet health
- 60-74: Fair fleet health (attention needed)
- 40-59: Poor fleet health (immediate action required)
- 0-39: Critical fleet health (emergency)
"""
import logging
from typing import Dict, List, Optional
from database import get_db_cursor

logger = logging.getLogger(__name__)


def calculate_fleet_health_score(tenant_id: str) -> Dict:
    """
    Calculate fleet health score for a tenant based on latest predictions
    
    Args:
        tenant_id: Tenant UUID
        
    Returns:
        Dictionary with health score and breakdown
    """
    try:
        with get_db_cursor() as cursor:
            # Get latest predictions for all active components
            query = """
                WITH latest_predictions AS (
                    SELECT DISTINCT ON (component_id)
                        p.component_id,
                        p.vehicle_id,
                        p.risk_score,
                        p.failure_probability,
                        p.remaining_useful_life_days,
                        c.component_type
                    FROM predictions p
                    INNER JOIN components c ON p.component_id = c.id
                    WHERE p.tenant_id = %s
                      AND c.status = 'active'
                    ORDER BY p.component_id, p.prediction_date DESC
                )
                SELECT 
                    COUNT(*) as total_components,
                    COUNT(CASE WHEN risk_score = 'low' THEN 1 END) as low_risk,
                    COUNT(CASE WHEN risk_score = 'medium' THEN 1 END) as medium_risk,
                    COUNT(CASE WHEN risk_score = 'high' THEN 1 END) as high_risk,
                    COUNT(CASE WHEN risk_score = 'critical' THEN 1 END) as critical_risk,
                    AVG(failure_probability) as avg_failure_probability,
                    AVG(remaining_useful_life_days) as avg_rul_days
                FROM latest_predictions
            """
            
            cursor.execute(query, (tenant_id,))
            result = cursor.fetchone()
            
            if not result or result['total_components'] == 0:
                logger.warning(f"No predictions found for tenant {tenant_id}")
                return {
                    'fleet_health_score': None,
                    'health_category': 'unknown',
                    'total_components': 0,
                    'risk_breakdown': {
                        'low': 0,
                        'medium': 0,
                        'high': 0,
                        'critical': 0
                    },
                    'avg_failure_probability': None,
                    'avg_remaining_useful_life_days': None,
                    'message': 'No predictions available'
                }
            
            # Calculate health score based on risk distribution
            total = result['total_components']
            low_count = result['low_risk'] or 0
            medium_count = result['medium_risk'] or 0
            high_count = result['high_risk'] or 0
            critical_count = result['critical_risk'] or 0
            
            # Weighted scoring
            score = (
                (low_count * 100) +
                (medium_count * 75) +
                (high_count * 50) +
                (critical_count * 25)
            ) / total
            
            # Round to 2 decimal places
            fleet_health_score = round(score, 2)
            
            # Determine health category
            if fleet_health_score >= 90:
                health_category = 'excellent'
            elif fleet_health_score >= 75:
                health_category = 'good'
            elif fleet_health_score >= 60:
                health_category = 'fair'
            elif fleet_health_score >= 40:
                health_category = 'poor'
            else:
                health_category = 'critical'
            
            # Get vehicle-level breakdown
            vehicle_breakdown = get_vehicle_health_breakdown(tenant_id)
            
            return {
                'fleet_health_score': fleet_health_score,
                'health_category': health_category,
                'total_components': total,
                'risk_breakdown': {
                    'low': low_count,
                    'medium': medium_count,
                    'high': high_count,
                    'critical': critical_count
                },
                'avg_failure_probability': round(float(result['avg_failure_probability']), 4) if result['avg_failure_probability'] else None,
                'avg_remaining_useful_life_days': int(result['avg_rul_days']) if result['avg_rul_days'] else None,
                'vehicle_breakdown': vehicle_breakdown,
                'message': f'Fleet health is {health_category} with {critical_count + high_count} components needing attention'
            }
            
    except Exception as e:
        logger.error(f"Failed to calculate fleet health score for tenant {tenant_id}: {e}")
        raise


def get_vehicle_health_breakdown(tenant_id: str) -> List[Dict]:
    """
    Get per-vehicle health breakdown
    
    Args:
        tenant_id: Tenant UUID
        
    Returns:
        List of vehicle health summaries
    """
    try:
        with get_db_cursor() as cursor:
            query = """
                WITH latest_predictions AS (
                    SELECT DISTINCT ON (p.component_id)
                        p.component_id,
                        p.vehicle_id,
                        p.risk_score,
                        p.failure_probability
                    FROM predictions p
                    INNER JOIN components c ON p.component_id = c.id
                    WHERE p.tenant_id = %s
                      AND c.status = 'active'
                    ORDER BY p.component_id, p.prediction_date DESC
                )
                SELECT 
                    v.id as vehicle_id,
                    v.vin,
                    v.make,
                    v.model,
                    COUNT(lp.component_id) as component_count,
                    COUNT(CASE WHEN lp.risk_score IN ('high', 'critical') THEN 1 END) as high_risk_count,
                    AVG(lp.failure_probability) as avg_failure_probability,
                    MAX(CASE WHEN lp.risk_score = 'critical' THEN 1 ELSE 0 END) as has_critical
                FROM vehicles v
                LEFT JOIN latest_predictions lp ON v.id = lp.vehicle_id
                WHERE v.tenant_id = %s
                  AND v.status = 'active'
                GROUP BY v.id, v.vin, v.make, v.model
                ORDER BY has_critical DESC, high_risk_count DESC, avg_failure_probability DESC
                LIMIT 20
            """
            
            cursor.execute(query, (tenant_id, tenant_id))
            vehicles = cursor.fetchall()
            
            breakdown = []
            for vehicle in vehicles:
                # Calculate vehicle health score
                if vehicle['component_count'] > 0:
                    # Simple formula: reduce from 100 based on risk
                    high_risk_penalty = vehicle['high_risk_count'] * 10
                    vehicle_score = max(0, 100 - high_risk_penalty)
                else:
                    vehicle_score = None
                
                breakdown.append({
                    'vehicle_id': str(vehicle['vehicle_id']),
                    'vin': vehicle['vin'],
                    'make': vehicle['make'],
                    'model': vehicle['model'],
                    'vehicle_health_score': vehicle_score,
                    'component_count': vehicle['component_count'],
                    'high_risk_components': vehicle['high_risk_count'],
                    'avg_failure_probability': round(float(vehicle['avg_failure_probability']), 4) if vehicle['avg_failure_probability'] else None,
                    'has_critical_risk': bool(vehicle['has_critical'])
                })
            
            return breakdown
            
    except Exception as e:
        logger.error(f"Failed to get vehicle health breakdown for tenant {tenant_id}: {e}")
        return []


def save_fleet_health_score(tenant_id: str, health_data: Dict) -> None:
    """
    Save fleet health score to database for historical tracking
    
    Args:
        tenant_id: Tenant UUID
        health_data: Health data dictionary from calculate_fleet_health_score
    """
    try:
        with get_db_cursor() as cursor:
            # Create table if it doesn't exist
            create_table_query = """
                CREATE TABLE IF NOT EXISTS fleet_health_history (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id UUID NOT NULL,
                    calculation_date DATE NOT NULL,
                    fleet_health_score DECIMAL(5, 2),
                    health_category TEXT,
                    total_components INTEGER,
                    low_risk_count INTEGER,
                    medium_risk_count INTEGER,
                    high_risk_count INTEGER,
                    critical_risk_count INTEGER,
                    avg_failure_probability DECIMAL(5, 4),
                    avg_remaining_useful_life_days INTEGER,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(tenant_id, calculation_date)
                );
                
                CREATE INDEX IF NOT EXISTS idx_fleet_health_tenant_date 
                ON fleet_health_history(tenant_id, calculation_date DESC);
            """
            
            cursor.execute(create_table_query)
            
            # Insert or update today's health score
            insert_query = """
                INSERT INTO fleet_health_history (
                    tenant_id, calculation_date, fleet_health_score, health_category,
                    total_components, low_risk_count, medium_risk_count, 
                    high_risk_count, critical_risk_count, avg_failure_probability,
                    avg_remaining_useful_life_days
                ) VALUES (
                    %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (tenant_id, calculation_date) 
                DO UPDATE SET
                    fleet_health_score = EXCLUDED.fleet_health_score,
                    health_category = EXCLUDED.health_category,
                    total_components = EXCLUDED.total_components,
                    low_risk_count = EXCLUDED.low_risk_count,
                    medium_risk_count = EXCLUDED.medium_risk_count,
                    high_risk_count = EXCLUDED.high_risk_count,
                    critical_risk_count = EXCLUDED.critical_risk_count,
                    avg_failure_probability = EXCLUDED.avg_failure_probability,
                    avg_remaining_useful_life_days = EXCLUDED.avg_remaining_useful_life_days,
                    created_at = NOW()
            """
            
            cursor.execute(insert_query, (
                tenant_id,
                health_data.get('fleet_health_score'),
                health_data.get('health_category'),
                health_data.get('total_components'),
                health_data['risk_breakdown']['low'],
                health_data['risk_breakdown']['medium'],
                health_data['risk_breakdown']['high'],
                health_data['risk_breakdown']['critical'],
                health_data.get('avg_failure_probability'),
                health_data.get('avg_remaining_useful_life_days')
            ))
            
            logger.info(f"Saved fleet health score for tenant {tenant_id}: {health_data.get('fleet_health_score')}")
            
    except Exception as e:
        logger.error(f"Failed to save fleet health score for tenant {tenant_id}: {e}")
        # Don't raise - this is not critical to the prediction workflow
