"""
Integration tests for the prediction workflow endpoint
Tests the complete workflow including predictions, alerts, and fleet health scores
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Test client for FastAPI app"""
    return TestClient(app)


@pytest.fixture
def mock_feature_engineer():
    """Mock feature engineer"""
    with patch('main.feature_engineer') as mock_fe:
        yield mock_fe


@pytest.fixture
def mock_ml_model_manager():
    """Mock ML model manager"""
    with patch('main.ml_model_manager') as mock_mm:
        yield mock_mm


@pytest.fixture
def mock_db_cursor():
    """Mock database cursor"""
    with patch('main.get_db_cursor') as mock_cursor:
        cursor_instance = MagicMock()
        mock_cursor.return_value.__enter__.return_value = cursor_instance
        yield cursor_instance


@pytest.fixture
def mock_fleet_health():
    """Mock fleet health calculation"""
    with patch('main.calculate_fleet_health_score') as mock_calc, \
         patch('main.save_fleet_health_score') as mock_save:
        mock_calc.return_value = {
            'fleet_health_score': 85.5,
            'health_category': 'good',
            'total_components': 100,
            'risk_breakdown': {
                'low': 70,
                'medium': 20,
                'high': 8,
                'critical': 2
            },
            'avg_failure_probability': 0.25,
            'avg_remaining_useful_life_days': 90,
            'vehicle_breakdown': [],
            'message': 'Fleet health is good with 10 components needing attention'
        }
        yield mock_calc, mock_save


def test_predict_endpoint_success(
    client,
    mock_feature_engineer,
    mock_ml_model_manager,
    mock_db_cursor,
    mock_fleet_health
):
    """Test successful prediction workflow"""
    # Mock feature extraction
    mock_feature_engineer.extract_component_features.return_value = [
        {
            'component_id': 'comp-1',
            'vehicle_id': 'vehicle-1',
            'component_type': 'tire',
            'component_age_days': 180,
            'usage_intensity_km_per_day': 150.0,
            'historical_failure_count': 5,
            'maintenance_compliance_rate': 80.0,
            'route_type': 'highway',
            'current_season': 'summer',
            'odometer_usage_ratio': 0.6,
            'time_usage_ratio': 0.5,
            'current_odometer': 50000,
            'installation_odometer': 20000,
        }
    ]
    
    mock_feature_engineer.get_feature_vector.return_value = [
        180, 150.0, 5, 80.0, 1, 2, 0.6, 0.5
    ]
    
    # Mock ML predictions
    mock_ml_model_manager.predict.return_value = {
        'failure_probability': 0.65,
        'risk_score': 'high',
        'remaining_useful_life_days': 45,
        'remaining_useful_life_km': 6750,
        'recommended_action': 'Schedule replacement within 30 days'
    }
    
    # Make request
    response = client.post(
        "/predict",
        json={
            "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
        }
    )
    
    # Assertions
    assert response.status_code == 200
    data = response.json()
    
    assert data['success'] is True
    assert data['predictions_count'] == 1
    assert data['alerts_generated'] >= 0
    assert data['execution_time_seconds'] > 0
    assert 'Successfully generated' in data['message']
    
    # Verify feature extraction was called
    mock_feature_engineer.extract_component_features.assert_called_once()
    
    # Verify ML prediction was called
    mock_ml_model_manager.predict.assert_called_once()
    
    # Verify fleet health calculation was called
    mock_calc, mock_save = mock_fleet_health
    mock_calc.assert_called_once()
    mock_save.assert_called_once()


def test_predict_endpoint_with_vehicle_filter(
    client,
    mock_feature_engineer,
    mock_ml_model_manager,
    mock_db_cursor,
    mock_fleet_health
):
    """Test prediction workflow with vehicle ID filter"""
    mock_feature_engineer.extract_component_features.return_value = []
    
    response = client.post(
        "/predict",
        json={
            "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
            "vehicle_ids": [
                "550e8400-e29b-41d4-a716-446655440001",
                "550e8400-e29b-41d4-a716-446655440002"
            ]
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data['success'] is True
    assert data['predictions_count'] == 0
    
    # Verify vehicle IDs were passed
    call_args = mock_feature_engineer.extract_component_features.call_args
    assert call_args[1]['vehicle_ids'] is not None
    assert len(call_args[1]['vehicle_ids']) == 2


def test_predict_endpoint_no_components(
    client,
    mock_feature_engineer,
    mock_ml_model_manager,
    mock_db_cursor,
    mock_fleet_health
):
    """Test prediction workflow when no components found"""
    mock_feature_engineer.extract_component_features.return_value = []
    
    response = client.post(
        "/predict",
        json={
            "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data['success'] is True
    assert data['predictions_count'] == 0
    assert data['alerts_generated'] == 0
    assert 'No active components' in data['message']


def test_predict_endpoint_creates_high_risk_alerts(
    client,
    mock_feature_engineer,
    mock_ml_model_manager,
    mock_db_cursor,
    mock_fleet_health
):
    """Test that high/critical risk predictions generate alerts"""
    # Mock two components - one high risk, one critical
    mock_feature_engineer.extract_component_features.return_value = [
        {
            'component_id': 'comp-1',
            'vehicle_id': 'vehicle-1',
            'component_type': 'tire',
            'component_age_days': 180,
            'current_odometer': 50000,
            'installation_odometer': 20000,
        },
        {
            'component_id': 'comp-2',
            'vehicle_id': 'vehicle-1',
            'component_type': 'brake',
            'component_age_days': 200,
            'current_odometer': 50000,
            'installation_odometer': 20000,
        }
    ]
    
    mock_feature_engineer.get_feature_vector.return_value = [
        180, 150.0, 5, 80.0, 1, 2, 0.6, 0.5
    ]
    
    # Mock predictions - one high, one critical
    mock_ml_model_manager.predict.side_effect = [
        {
            'failure_probability': 0.65,
            'risk_score': 'high',
            'remaining_useful_life_days': 30,
            'remaining_useful_life_km': 4500,
            'recommended_action': 'Schedule replacement within 30 days'
        },
        {
            'failure_probability': 0.85,
            'risk_score': 'critical',
            'remaining_useful_life_days': 5,
            'remaining_useful_life_km': 750,
            'recommended_action': 'URGENT: Schedule immediate inspection'
        }
    ]
    
    # Mock database to return no existing alerts
    mock_db_cursor.fetchone.return_value = None
    
    response = client.post(
        "/predict",
        json={
            "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data['success'] is True
    assert data['predictions_count'] == 2
    # Both predictions should generate alerts (high and critical)
    assert data['alerts_generated'] == 2


def test_predict_endpoint_skips_duplicate_alerts(
    client,
    mock_feature_engineer,
    mock_ml_model_manager,
    mock_db_cursor,
    mock_fleet_health
):
    """Test that duplicate alerts are not created"""
    mock_feature_engineer.extract_component_features.return_value = [
        {
            'component_id': 'comp-1',
            'vehicle_id': 'vehicle-1',
            'component_type': 'tire',
            'component_age_days': 180,
            'current_odometer': 50000,
            'installation_odometer': 20000,
        }
    ]
    
    mock_feature_engineer.get_feature_vector.return_value = [
        180, 150.0, 5, 80.0, 1, 2, 0.6, 0.5
    ]
    
    mock_ml_model_manager.predict.return_value = {
        'failure_probability': 0.75,
        'risk_score': 'critical',
        'remaining_useful_life_days': 10,
        'remaining_useful_life_km': 1500,
        'recommended_action': 'URGENT: Schedule immediate inspection'
    }
    
    # Mock database to return existing alert for this component
    mock_db_cursor.fetchone.return_value = {'id': 'alert-1'}
    
    response = client.post(
        "/predict",
        json={
            "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data['success'] is True
    assert data['predictions_count'] == 1
    # Alert should not be created since one already exists
    assert data['alerts_generated'] == 0


def test_fleet_health_endpoint(client):
    """Test fleet health score endpoint"""
    with patch('main.calculate_fleet_health_score') as mock_calc:
        mock_calc.return_value = {
            'fleet_health_score': 92.5,
            'health_category': 'excellent',
            'total_components': 150,
            'risk_breakdown': {
                'low': 135,
                'medium': 12,
                'high': 3,
                'critical': 0
            },
            'avg_failure_probability': 0.15,
            'avg_remaining_useful_life_days': 180,
            'vehicle_breakdown': [],
            'message': 'Fleet health is excellent with 3 components needing attention'
        }
        
        response = client.get("/fleet-health/550e8400-e29b-41d4-a716-446655440000")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['fleet_health_score'] == 92.5
        assert data['health_category'] == 'excellent'
        assert data['total_components'] == 150
        assert data['risk_breakdown']['low'] == 135
        assert 'excellent' in data['message']


def test_predict_all_tenants_endpoint(client, mock_db_cursor):
    """Test batch prediction for all tenants"""
    # Mock tenants query
    mock_db_cursor.fetchall.return_value = [
        {
            'id': '550e8400-e29b-41d4-a716-446655440001',
            'name': 'Fleet Company A',
            'vehicle_limit': 100
        },
        {
            'id': '550e8400-e29b-41d4-a716-446655440002',
            'name': 'Fleet Company B',
            'vehicle_limit': 50
        }
    ]
    
    # Mock the predict_failures function
    with patch('main.predict_failures') as mock_predict:
        from models import PredictResponse
        mock_predict.return_value = PredictResponse(
            success=True,
            predictions_count=25,
            alerts_generated=5,
            execution_time_seconds=2.5,
            message="Success"
        )
        
        response = client.post("/predict-all-tenants")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['total_tenants'] == 2
        assert data['successful'] == 2
        assert data['failed'] == 0
        assert len(data['tenant_results']) == 2
        assert data['execution_time_seconds'] > 0
        
        # Verify predict was called for each tenant
        assert mock_predict.call_count == 2


def test_predict_endpoint_handles_errors(
    client,
    mock_feature_engineer,
    mock_ml_model_manager
):
    """Test error handling in prediction workflow"""
    # Mock feature extraction to raise error
    mock_feature_engineer.extract_component_features.side_effect = Exception("Database connection failed")
    
    response = client.post(
        "/predict",
        json={
            "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
        }
    )
    
    assert response.status_code == 500
    assert 'Prediction failed' in response.json()['detail']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
