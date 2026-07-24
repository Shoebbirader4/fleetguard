"""
Unit tests for fleet health score calculation
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fleet_health import (
    calculate_fleet_health_score,
    get_vehicle_health_breakdown,
    save_fleet_health_score
)


@pytest.fixture
def mock_db_cursor():
    """Mock database cursor"""
    with patch('fleet_health.get_db_cursor') as mock_cursor:
        cursor_instance = MagicMock()
        mock_cursor.return_value.__enter__.return_value = cursor_instance
        yield cursor_instance


@pytest.fixture
def mock_vehicle_breakdown():
    """Mock get_vehicle_health_breakdown to avoid extra DB calls"""
    with patch('fleet_health.get_vehicle_health_breakdown') as mock_func:
        mock_func.return_value = []
        yield mock_func


def test_calculate_fleet_health_score_excellent(mock_db_cursor, mock_vehicle_breakdown):
    """Test fleet health calculation with excellent health (mostly low risk)"""
    # Mock database response with mostly low-risk components
    mock_db_cursor.fetchone.return_value = {
        'total_components': 100,
        'low_risk': 90,
        'medium_risk': 8,
        'high_risk': 2,
        'critical_risk': 0,
        'avg_failure_probability': 0.1,
        'avg_rul_days': 180
    }
    
    result = calculate_fleet_health_score('test-tenant-id')
    
    # Expected score: (90*100 + 8*75 + 2*50 + 0*25) / 100 = 97.0
    assert result['fleet_health_score'] == 97.0
    assert result['health_category'] == 'excellent'
    assert result['total_components'] == 100
    assert result['risk_breakdown']['low'] == 90
    assert result['risk_breakdown']['critical'] == 0


def test_calculate_fleet_health_score_good(mock_db_cursor, mock_vehicle_breakdown):
    """Test fleet health calculation with good health"""
    mock_db_cursor.fetchone.return_value = {
        'total_components': 100,
        'low_risk': 70,
        'medium_risk': 20,
        'high_risk': 8,
        'critical_risk': 2,
        'avg_failure_probability': 0.25,
        'avg_rul_days': 90
    }
    
    result = calculate_fleet_health_score('test-tenant-id')
    
    # Expected score: (70*100 + 20*75 + 8*50 + 2*25) / 100 = 89.5
    assert result['fleet_health_score'] == 89.5
    assert result['health_category'] == 'good'
    assert result['risk_breakdown']['critical'] == 2


def test_calculate_fleet_health_score_poor(mock_db_cursor, mock_vehicle_breakdown):
    """Test fleet health calculation with poor health"""
    mock_db_cursor.fetchone.return_value = {
        'total_components': 100,
        'low_risk': 20,
        'medium_risk': 30,
        'high_risk': 35,
        'critical_risk': 15,
        'avg_failure_probability': 0.55,
        'avg_rul_days': 20
    }
    
    result = calculate_fleet_health_score('test-tenant-id')
    
    # Expected score: (20*100 + 30*75 + 35*50 + 15*25) / 100 = 63.75
    assert result['fleet_health_score'] == 63.75
    assert result['health_category'] == 'fair'
    assert 'needing attention' in result['message']


def test_calculate_fleet_health_score_critical(mock_db_cursor, mock_vehicle_breakdown):
    """Test fleet health calculation with critical health"""
    mock_db_cursor.fetchone.return_value = {
        'total_components': 50,
        'low_risk': 5,
        'medium_risk': 10,
        'high_risk': 15,
        'critical_risk': 20,
        'avg_failure_probability': 0.75,
        'avg_rul_days': 5
    }
    
    result = calculate_fleet_health_score('test-tenant-id')
    
    # Expected score: (5*100 + 10*75 + 15*50 + 20*25) / 50 = 50.0
    assert result['fleet_health_score'] == 50.0
    assert result['health_category'] == 'poor'


def test_calculate_fleet_health_score_no_predictions(mock_db_cursor, mock_vehicle_breakdown):
    """Test fleet health when no predictions exist"""
    mock_db_cursor.fetchone.return_value = {
        'total_components': 0,
        'low_risk': 0,
        'medium_risk': 0,
        'high_risk': 0,
        'critical_risk': 0,
        'avg_failure_probability': None,
        'avg_rul_days': None
    }
    
    result = calculate_fleet_health_score('test-tenant-id')
    
    assert result['fleet_health_score'] is None
    assert result['health_category'] == 'unknown'
    assert result['total_components'] == 0
    assert 'No predictions available' in result['message']


def test_calculate_fleet_health_score_fair(mock_db_cursor, mock_vehicle_breakdown):
    """Test fleet health calculation with fair health"""
    mock_db_cursor.fetchone.return_value = {
        'total_components': 80,
        'low_risk': 40,
        'medium_risk': 25,
        'high_risk': 10,
        'critical_risk': 5,
        'avg_failure_probability': 0.35,
        'avg_rul_days': 60
    }
    
    result = calculate_fleet_health_score('test-tenant-id')
    
    # Expected score: (40*100 + 25*75 + 10*50 + 5*25) / 80 = 81.25
    assert result['fleet_health_score'] == 81.25
    assert result['health_category'] == 'good'


def test_get_vehicle_health_breakdown(mock_db_cursor):
    """Test vehicle-level health breakdown"""
    mock_db_cursor.fetchall.return_value = [
        {
            'vehicle_id': 'vehicle-1',
            'vin': 'VIN123',
            'make': 'Volvo',
            'model': 'B9R',
            'component_count': 10,
            'high_risk_count': 3,
            'avg_failure_probability': 0.45,
            'has_critical': 1
        },
        {
            'vehicle_id': 'vehicle-2',
            'vin': 'VIN456',
            'make': 'Tata',
            'model': 'Starbus',
            'component_count': 12,
            'high_risk_count': 0,
            'avg_failure_probability': 0.15,
            'has_critical': 0
        }
    ]
    
    result = get_vehicle_health_breakdown('test-tenant-id')
    
    assert len(result) == 2
    
    # Vehicle 1 has high risk
    assert result[0]['vin'] == 'VIN123'
    assert result[0]['high_risk_components'] == 3
    assert result[0]['has_critical_risk'] is True
    assert result[0]['vehicle_health_score'] == 70  # 100 - (3 * 10)
    
    # Vehicle 2 is healthy
    assert result[1]['vin'] == 'VIN456'
    assert result[1]['high_risk_components'] == 0
    assert result[1]['has_critical_risk'] is False
    assert result[1]['vehicle_health_score'] == 100


def test_save_fleet_health_score(mock_db_cursor):
    """Test saving fleet health score to database"""
    health_data = {
        'fleet_health_score': 85.5,
        'health_category': 'good',
        'total_components': 100,
        'risk_breakdown': {
            'low': 75,
            'medium': 20,
            'high': 4,
            'critical': 1
        },
        'avg_failure_probability': 0.22,
        'avg_remaining_useful_life_days': 120
    }
    
    # Should not raise exception
    save_fleet_health_score('test-tenant-id', health_data)
    
    # Verify database calls
    assert mock_db_cursor.execute.call_count == 2  # CREATE TABLE + INSERT


def test_save_fleet_health_score_handles_none_values(mock_db_cursor):
    """Test saving health score with None values"""
    health_data = {
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
        'avg_remaining_useful_life_days': None
    }
    
    # Should not raise exception
    save_fleet_health_score('test-tenant-id', health_data)
    
    # Verify database was called
    assert mock_db_cursor.execute.called


def test_calculate_fleet_health_score_handles_database_error(mock_db_cursor):
    """Test error handling when database query fails"""
    mock_db_cursor.execute.side_effect = Exception("Database connection failed")
    
    with pytest.raises(Exception) as exc_info:
        calculate_fleet_health_score('test-tenant-id')
    
    assert "Database connection failed" in str(exc_info.value)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
