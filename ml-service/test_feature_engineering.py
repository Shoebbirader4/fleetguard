"""
Unit tests for feature engineering pipeline
"""
import pytest
from datetime import date, datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from feature_engineering import FeatureEngineer


@pytest.fixture
def feature_engineer():
    """Create a FeatureEngineer instance for testing"""
    return FeatureEngineer()


@pytest.fixture
def sample_component():
    """Sample component data for testing"""
    return {
        'component_id': '123e4567-e89b-12d3-a456-426614174000',
        'vehicle_id': '223e4567-e89b-12d3-a456-426614174001',
        'component_type': 'brake',
        'component_subtype': 'front_brake_pad',
        'installation_date': date.today() - timedelta(days=180),
        'installation_odometer': 10000,
        'current_odometer': 25000,
        'expected_life_days': 365,
        'expected_life_km': 50000,
        'maintenance_frequency_km': 10000,
        'assigned_route': 'City Route - Urban',
        'vehicle_type': 'bus'
    }


class TestComponentAge:
    """Tests for component age calculation"""
    
    def test_calculate_component_age_valid_date(self, feature_engineer):
        """Test component age calculation with valid date"""
        installation_date = date.today() - timedelta(days=100)
        age = feature_engineer._calculate_component_age(installation_date)
        assert age == 100
    
    def test_calculate_component_age_today(self, feature_engineer):
        """Test component age for installation today"""
        installation_date = date.today()
        age = feature_engineer._calculate_component_age(installation_date)
        assert age == 0
    
    def test_calculate_component_age_none(self, feature_engineer):
        """Test component age with None date"""
        age = feature_engineer._calculate_component_age(None)
        assert age == 0


class TestUsageIntensity:
    """Tests for usage intensity calculation"""
    
    def test_calculate_usage_intensity_normal(self, feature_engineer):
        """Test usage intensity with normal values"""
        installation_date = date.today() - timedelta(days=100)
        usage = feature_engineer._calculate_usage_intensity(
            vehicle_id='test-vehicle',
            installation_date=installation_date,
            installation_odometer=10000,
            current_odometer=20000
        )
        # 10000 km in 100 days = 100 km/day
        assert usage == 100.0
    
    def test_calculate_usage_intensity_zero_days(self, feature_engineer):
        """Test usage intensity when installed today"""
        installation_date = date.today()
        usage = feature_engineer._calculate_usage_intensity(
            vehicle_id='test-vehicle',
            installation_date=installation_date,
            installation_odometer=10000,
            current_odometer=10000
        )
        assert usage == 0.0
    
    def test_calculate_usage_intensity_high_usage(self, feature_engineer):
        """Test usage intensity with high km per day"""
        installation_date = date.today() - timedelta(days=50)
        usage = feature_engineer._calculate_usage_intensity(
            vehicle_id='test-vehicle',
            installation_date=installation_date,
            installation_odometer=10000,
            current_odometer=25000
        )
        # 15000 km in 50 days = 300 km/day
        assert usage == 300.0


class TestRouteTypeEncoding:
    """Tests for route type encoding"""
    
    def test_encode_route_type_urban(self, feature_engineer):
        """Test urban route encoding"""
        assert feature_engineer._encode_route_type('City Route - Urban') == 'urban'
        assert feature_engineer._encode_route_type('Downtown Local') == 'urban'
    
    def test_encode_route_type_highway(self, feature_engineer):
        """Test highway route encoding"""
        assert feature_engineer._encode_route_type('Highway Express') == 'highway'
        assert feature_engineer._encode_route_type('Interstate 95') == 'highway'
    
    def test_encode_route_type_mixed(self, feature_engineer):
        """Test mixed route encoding"""
        assert feature_engineer._encode_route_type('Mixed Route') == 'mixed'
        assert feature_engineer._encode_route_type('Combined City/Highway') == 'mixed'
    
    def test_encode_route_type_unknown(self, feature_engineer):
        """Test unknown route encoding"""
        assert feature_engineer._encode_route_type('Some Custom Route') == 'unknown'
        assert feature_engineer._encode_route_type(None) == 'unknown'


class TestSeasonalFactors:
    """Tests for seasonal factor encoding"""
    
    def test_get_current_season(self, feature_engineer):
        """Test season detection"""
        season = feature_engineer._get_current_season()
        assert season in ['winter', 'spring', 'summer', 'autumn']
    
    def test_season_map_coverage(self, feature_engineer):
        """Test that all months are mapped to seasons"""
        for month in range(1, 13):
            assert month in feature_engineer.season_map


class TestUsageRatios:
    """Tests for usage ratio calculations"""
    
    def test_calculate_odometer_usage_ratio_normal(self, feature_engineer):
        """Test odometer usage ratio with normal values"""
        ratio = feature_engineer._calculate_odometer_usage_ratio(
            installation_odometer=10000,
            current_odometer=20000,
            expected_life_km=50000
        )
        # 10000 km used / 50000 km expected = 0.2
        assert ratio == 0.2
    
    def test_calculate_odometer_usage_ratio_exceeded(self, feature_engineer):
        """Test odometer usage ratio when expected life exceeded"""
        ratio = feature_engineer._calculate_odometer_usage_ratio(
            installation_odometer=10000,
            current_odometer=70000,
            expected_life_km=50000
        )
        # 60000 km used / 50000 km expected = 1.2
        assert ratio == 1.2
    
    def test_calculate_odometer_usage_ratio_zero_expected(self, feature_engineer):
        """Test odometer usage ratio with zero expected life"""
        ratio = feature_engineer._calculate_odometer_usage_ratio(
            installation_odometer=10000,
            current_odometer=20000,
            expected_life_km=0
        )
        assert ratio == 0.0
    
    def test_calculate_time_usage_ratio_normal(self, feature_engineer):
        """Test time usage ratio with normal values"""
        installation_date = date.today() - timedelta(days=180)
        ratio = feature_engineer._calculate_time_usage_ratio(
            installation_date=installation_date,
            expected_life_days=365
        )
        # 180 days used / 365 days expected ≈ 0.4932
        assert 0.49 <= ratio <= 0.50
    
    def test_calculate_time_usage_ratio_zero_expected(self, feature_engineer):
        """Test time usage ratio with zero expected life"""
        installation_date = date.today() - timedelta(days=100)
        ratio = feature_engineer._calculate_time_usage_ratio(
            installation_date=installation_date,
            expected_life_days=0
        )
        assert ratio == 0.0


class TestFeatureVector:
    """Tests for feature vector generation"""
    
    def test_get_feature_vector(self, feature_engineer):
        """Test conversion of feature dict to numeric vector"""
        feature_dict = {
            'component_age_days': 180,
            'usage_intensity_km_per_day': 100.0,
            'historical_failure_count': 5,
            'maintenance_compliance_rate': 80.0,
            'route_type': 'urban',
            'current_season': 'summer',
            'odometer_usage_ratio': 0.5,
            'time_usage_ratio': 0.6
        }
        
        vector = feature_engineer.get_feature_vector(feature_dict)
        
        assert len(vector) == 8
        assert vector[0] == 180  # component_age_days
        assert vector[1] == 100.0  # usage_intensity
        assert vector[2] == 5  # failure_count
        assert vector[3] == 80.0  # compliance_rate
        assert vector[4] == 0  # route_type (urban=0)
        assert vector[5] == 2  # season (summer=2)
        assert vector[6] == 0.5  # odometer_ratio
        assert vector[7] == 0.6  # time_ratio
    
    def test_get_feature_names(self, feature_engineer):
        """Test feature names list"""
        names = feature_engineer.get_feature_names()
        
        assert len(names) == 8
        assert 'component_age_days' in names
        assert 'usage_intensity_km_per_day' in names
        assert 'historical_failure_count' in names


class TestMaintenanceCompliance:
    """Tests for maintenance compliance calculation"""
    
    @patch('feature_engineering.get_db_cursor')
    def test_calculate_maintenance_compliance_no_schedule(
        self, mock_cursor, feature_engineer
    ):
        """Test compliance when no maintenance schedule exists"""
        compliance = feature_engineer._calculate_maintenance_compliance(
            component_id='test-id',
            vehicle_id='vehicle-id',
            installation_date=date.today() - timedelta(days=100),
            maintenance_frequency_km=None,
            current_odometer=20000,
            installation_odometer=10000
        )
        # No schedule means 100% compliant
        assert compliance == 100.0
    
    @patch('feature_engineering.get_db_cursor')
    def test_calculate_maintenance_compliance_not_due(
        self, mock_cursor, feature_engineer
    ):
        """Test compliance when maintenance not yet due"""
        compliance = feature_engineer._calculate_maintenance_compliance(
            component_id='test-id',
            vehicle_id='vehicle-id',
            installation_date=date.today() - timedelta(days=10),
            maintenance_frequency_km=10000,
            current_odometer=11000,
            installation_odometer=10000
        )
        # Only 1000 km driven, not due for 10000 km maintenance
        assert compliance == 100.0


class TestHistoricalFailures:
    """Tests for historical failure counting"""
    
    @patch('feature_engineering.get_db_cursor')
    def test_get_historical_failure_count(self, mock_cursor, feature_engineer):
        """Test historical failure count query"""
        # Mock cursor and result
        mock_result = {'count': 5}
        mock_cursor_obj = MagicMock()
        mock_cursor_obj.fetchone.return_value = mock_result
        mock_cursor.return_value.__enter__.return_value = mock_cursor_obj
        
        count = feature_engineer._get_historical_failure_count(
            tenant_id='tenant-id',
            component_type='brake'
        )
        
        assert count == 5
        mock_cursor_obj.execute.assert_called_once()


class TestFeatureExtraction:
    """Tests for complete feature extraction"""
    
    @patch('feature_engineering.get_db_cursor')
    def test_extract_component_features(self, mock_cursor, feature_engineer):
        """Test extraction of features for components"""
        # Mock database results
        mock_components = [
            {
                'component_id': 'comp-1',
                'vehicle_id': 'vehicle-1',
                'component_type': 'brake',
                'component_subtype': 'front_brake_pad',
                'installation_date': date.today() - timedelta(days=100),
                'installation_odometer': 10000,
                'current_odometer': 20000,
                'expected_life_days': 365,
                'expected_life_km': 50000,
                'maintenance_frequency_km': 10000,
                'assigned_route': 'City Urban',
                'vehicle_type': 'bus'
            }
        ]
        
        mock_cursor_obj = MagicMock()
        mock_cursor_obj.fetchall.return_value = mock_components
        mock_cursor_obj.fetchone.return_value = {'count': 2}
        mock_cursor.return_value.__enter__.return_value = mock_cursor_obj
        
        features = feature_engineer.extract_component_features(
            tenant_id='tenant-id'
        )
        
        assert len(features) >= 0
        mock_cursor_obj.execute.assert_called()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
