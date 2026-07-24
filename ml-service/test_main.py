"""
Unit tests for ML Service API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from uuid import uuid4

from main import app
from models import HealthResponse, PredictResponse, TrainResponse


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
def mock_db():
    """Mock database connection"""
    with patch('main.test_connection') as mock:
        mock.return_value = True
        yield mock


class TestHealthEndpoint:
    """Tests for /health endpoint"""
    
    def test_health_check_success(self, client, mock_db):
        """Test successful health check"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["database_connected"] is True
        assert data["models_loaded"] is True
        assert "version" in data
        assert "timestamp" in data
    
    def test_health_check_db_failure(self, client):
        """Test health check with database failure"""
        with patch('main.test_connection', return_value=False):
            response = client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "unhealthy"
            assert data["database_connected"] is False


class TestPredictEndpoint:
    """Tests for /predict endpoint"""
    
    def test_predict_with_tenant_only(self, client, mock_db):
        """Test prediction with only tenant_id"""
        tenant_id = str(uuid4())
        
        response = client.post(
            "/predict",
            json={"tenant_id": tenant_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "predictions_count" in data
        assert "alerts_generated" in data
        assert "execution_time_seconds" in data
        assert tenant_id in data["message"]
    
    def test_predict_with_vehicle_ids(self, client, mock_db):
        """Test prediction with specific vehicle IDs"""
        tenant_id = str(uuid4())
        vehicle_ids = [str(uuid4()), str(uuid4())]
        
        response = client.post(
            "/predict",
            json={
                "tenant_id": tenant_id,
                "vehicle_ids": vehicle_ids
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
    
    def test_predict_invalid_tenant_id(self, client):
        """Test prediction with invalid tenant_id"""
        response = client.post(
            "/predict",
            json={"tenant_id": "invalid-uuid"}
        )
        
        assert response.status_code == 422  # Validation error


class TestTrainEndpoint:
    """Tests for /train endpoint"""
    
    def test_train_all_categories(self, client, mock_db):
        """Test training all component categories"""
        tenant_id = str(uuid4())
        
        response = client.post(
            "/train",
            json={"tenant_id": tenant_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "models_trained" in data
        assert "execution_time_seconds" in data
        assert "metrics" in data
    
    def test_train_specific_category(self, client, mock_db):
        """Test training specific component category"""
        tenant_id = str(uuid4())
        
        response = client.post(
            "/train",
            json={
                "tenant_id": tenant_id,
                "component_category": "tires"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
    
    def test_train_when_disabled(self, client):
        """Test training when disabled in config"""
        with patch('main.settings.training_enabled', False):
            tenant_id = str(uuid4())
            
            response = client.post(
                "/train",
                json={"tenant_id": tenant_id}
            )
            
            assert response.status_code == 403
            assert "disabled" in response.json()["detail"].lower()


class TestRootEndpoint:
    """Tests for / endpoint"""
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns API info"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "service" in data
        assert "version" in data
        assert "status" in data
        assert data["docs"] == "/docs"
        assert data["health"] == "/health"
