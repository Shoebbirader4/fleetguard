"""
Unit tests for ML models module
"""
import pytest
import numpy as np
import pandas as pd
from ml_models import MLModelManager


class TestMLModelManager:
    """Test suite for MLModelManager"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.model_manager = MLModelManager(model_path="./test_models")
    
    def test_initialization(self):
        """Test MLModelManager initialization"""
        assert self.model_manager is not None
        assert len(self.model_manager.component_categories) == 5
        assert 'tire' in self.model_manager.component_categories
        assert 'brake' in self.model_manager.component_categories
    
    def test_category_mapping(self):
        """Test component type to category mapping"""
        # Test tire mapping
        assert self.model_manager._get_category_from_type('tire_front_left') == 'tire'
        assert self.model_manager._get_category_from_type('TIRE') == 'tire'
        
        # Test brake mapping
        assert self.model_manager._get_category_from_type('brake_pad_rear') == 'brake'
        assert self.model_manager._get_category_from_type('BRAKE') == 'brake'
        
        # Test filter mapping
        assert self.model_manager._get_category_from_type('oil_filter') == 'filter'
        assert self.model_manager._get_category_from_type('air_filter') == 'filter'
        
        # Test battery mapping
        assert self.model_manager._get_category_from_type('battery_12v') == 'battery'
        
        # Test oil mapping
        assert self.model_manager._get_category_from_type('engine_oil') == 'oil'
    
    def test_risk_score_calculation(self):
        """Test risk score calculation"""
        # Critical risk - high probability
        assert self.model_manager._calculate_risk_score(0.8, 100) == 'critical'
        
        # Critical risk - low RUL
        assert self.model_manager._calculate_risk_score(0.4, 5) == 'critical'
        
        # High risk
        assert self.model_manager._calculate_risk_score(0.6, 50) == 'high'
        
        # Medium risk
        assert self.model_manager._calculate_risk_score(0.4, 100) == 'medium'
        
        # Low risk
        assert self.model_manager._calculate_risk_score(0.2, 200) == 'low'
    
    def test_recommended_action(self):
        """Test recommended action generation"""
        # Critical
        action = self.model_manager._get_recommended_action('critical', 5)
        assert 'URGENT' in action or 'immediate' in action.lower()
        
        # High
        action = self.model_manager._get_recommended_action('high', 20)
        assert 'Schedule' in action or 'schedule' in action.lower()
        
        # Medium
        action = self.model_manager._get_recommended_action('medium', 60)
        assert 'Monitor' in action or 'monitor' in action.lower()
        
        # Low
        action = self.model_manager._get_recommended_action('low', 180)
        assert 'Continue' in action or 'continue' in action.lower() or 'routine' in action.lower()
    
    def test_default_prediction(self):
        """Test default prediction when models not available"""
        prediction = self.model_manager._default_prediction()
        
        assert prediction['failure_probability'] == 0.5
        assert prediction['risk_score'] == 'medium'
        assert prediction['remaining_useful_life_days'] is None
        assert prediction['remaining_useful_life_km'] is None
    
    def test_train_with_insufficient_data(self):
        """Test training with insufficient data"""
        # Create minimal dataset (less than 30 samples)
        feature_matrix = [[1.0, 2.0, 3.0, 4.0, 0, 0, 0.5, 0.5] for _ in range(20)]
        labels = [0] * 15 + [1] * 5
        component_types = ['tire'] * 20
        component_ages = [100] * 20
        odometer_usages = [5000] * 20
        
        results = self.model_manager.train_all_models(
            tenant_id='test-tenant',
            feature_matrix=feature_matrix,
            labels=labels,
            component_types=component_types,
            component_ages=component_ages,
            odometer_usages=odometer_usages
        )
        
        # Should skip training due to insufficient data
        assert results['categories']['tire']['status'] == 'skipped'
        assert results['categories']['tire']['reason'] == 'insufficient_data'
    
    def test_train_with_sufficient_data(self):
        """Test training with sufficient data"""
        # Create dataset with 50 samples
        np.random.seed(42)
        feature_matrix = []
        for _ in range(50):
            features = [
                np.random.randint(1, 1000),  # component_age_days
                np.random.uniform(10, 200),  # usage_intensity
                np.random.randint(0, 10),    # historical_failure_count
                np.random.uniform(50, 100),  # maintenance_compliance_rate
                np.random.randint(0, 3),     # route_type
                np.random.randint(0, 3),     # season
                np.random.uniform(0, 1.5),   # odometer_usage_ratio
                np.random.uniform(0, 1.5)    # time_usage_ratio
            ]
            feature_matrix.append(features)
        
        # Create labels with some failures
        labels = [0] * 35 + [1] * 15
        component_types = ['brake_pad'] * 50
        component_ages = [int(f[0]) for f in feature_matrix]
        odometer_usages = [int(f[1] * f[0]) for f in feature_matrix]
        
        results = self.model_manager.train_all_models(
            tenant_id='test-tenant',
            feature_matrix=feature_matrix,
            labels=labels,
            component_types=component_types,
            component_ages=component_ages,
            odometer_usages=odometer_usages
        )
        
        # Should successfully train
        assert results['total_samples'] == 50
        assert results['failure_rate'] == 0.3
        assert 'brake' in results['categories']
        assert results['categories']['brake']['status'] == 'success'
        assert 'random_forest' in results['categories']['brake']
        assert 'weibull' in results['categories']['brake']
        assert 'gradient_boosting' in results['categories']['brake']
    
    def test_predict_without_trained_models(self):
        """Test prediction without trained models"""
        features = [100, 50.0, 2, 85.0, 1, 2, 0.5, 0.4]
        
        prediction = self.model_manager.predict(
            component_type='tire',
            features=features,
            component_age_days=100,
            odometer_usage_km=5000
        )
        
        # Should return default prediction
        assert prediction['failure_probability'] == 0.5
        assert prediction['risk_score'] == 'medium'
        assert 'not trained' in prediction['recommended_action'].lower()
    
    def test_predict_with_trained_models(self):
        """Test prediction with trained models"""
        # First train models
        np.random.seed(42)
        feature_matrix = []
        for _ in range(50):
            features = [
                np.random.randint(1, 1000),
                np.random.uniform(10, 200),
                np.random.randint(0, 10),
                np.random.uniform(50, 100),
                np.random.randint(0, 3),
                np.random.randint(0, 3),
                np.random.uniform(0, 1.5),
                np.random.uniform(0, 1.5)
            ]
            feature_matrix.append(features)
        
        labels = [0] * 35 + [1] * 15
        component_types = ['tire_front'] * 50
        component_ages = [int(f[0]) for f in feature_matrix]
        odometer_usages = [int(f[1] * f[0]) for f in feature_matrix]
        
        self.model_manager.train_all_models(
            tenant_id='test-tenant',
            feature_matrix=feature_matrix,
            labels=labels,
            component_types=component_types,
            component_ages=component_ages,
            odometer_usages=odometer_usages
        )
        
        # Now predict
        features = [500, 100.0, 3, 75.0, 1, 2, 0.8, 0.7]
        
        prediction = self.model_manager.predict(
            component_type='tire_front',
            features=features,
            component_age_days=500,
            odometer_usage_km=50000
        )
        
        # Verify prediction structure
        assert 'failure_probability' in prediction
        assert 'risk_score' in prediction
        assert 'remaining_useful_life_days' in prediction
        assert 'remaining_useful_life_km' in prediction
        assert 'recommended_action' in prediction
        
        # Verify ranges
        assert 0 <= prediction['failure_probability'] <= 1
        assert prediction['risk_score'] in ['low', 'medium', 'high', 'critical']
        
        # RUL should be present or None
        if prediction['remaining_useful_life_days'] is not None:
            assert prediction['remaining_useful_life_days'] >= 0
        
        if prediction['remaining_useful_life_km'] is not None:
            assert prediction['remaining_useful_life_km'] >= 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
