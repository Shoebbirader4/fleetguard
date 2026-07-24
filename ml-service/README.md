# ML Service - Predictive Maintenance Engine

Python-based machine learning service for predictive maintenance and failure prediction in FleetGuard AI.

## Features

- **Failure Prediction**: Random Forest Classifier for component failure probability
- **Remaining Useful Life (RUL)**: Weibull survival analysis for RUL estimation
- **Risk Scoring**: Gradient Boosting for risk score calculation
- **Feature Engineering**: Automated feature extraction from vehicle and component data
- **Model Training**: Weekly retraining with new maintenance data
- **Batch Predictions**: Daily predictions for all active components

## Technology Stack

- **Framework**: FastAPI for REST API
- **ML Libraries**: scikit-learn, TensorFlow, lifelines (survival analysis)
- **Database**: PostgreSQL via psycopg2
- **Deployment**: Docker container on AWS ECS or Google Cloud Run

## Setup

### 1. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
The `.env` file is already configured with Supabase credentials. Key variables:
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
MODEL_PATH=./models
LOG_LEVEL=INFO
```

### 4. Run Development Server

**Option A: Using the startup script (recommended)**
```bash
python run_local.py
```
This will test database connectivity before starting the server.

**Option B: Direct uvicorn**
```bash
uvicorn main:app --reload
```

API will be available at: http://localhost:8000
Interactive API docs: http://localhost:8000/docs

## API Endpoints

### Health Check
```
GET /health
```

### Run Predictions
```
POST /predict
{
  "tenant_id": "uuid",
  "vehicle_ids": ["uuid1", "uuid2"]  // Optional, defaults to all vehicles
}
```

### Train Models
```
POST /train
{
  "tenant_id": "uuid",
  "component_category": "tires"  // Optional, defaults to all categories
}
```

### Get Model Info
```
GET /models/info
```

## ML Pipeline

### Feature Engineering
- Component age (days since installation)
- Usage intensity (km per day average)
- Historical failure count for component type
- Maintenance frequency compliance rate
- Vehicle route type (urban vs highway)
- Seasonal factors

### Models
1. **Random Forest Classifier** - Failure probability (0-1)
2. **Weibull Survival Model** - Remaining useful life estimation
3. **Gradient Boosting Regressor** - Risk score (0-100)

Models are trained separately for each component category:
- Tires
- Brakes
- Filters
- Batteries
- Other components

### Prediction Workflow
1. Extract features for all active components
2. Load trained models
3. Predict failure probability
4. Calculate remaining useful life
5. Assign risk score (low/medium/high/critical)
6. Save predictions to database
7. Generate alerts for high/critical risk components

## Scheduled Jobs

### Daily Predictions (2:00 AM)
```bash
python -m jobs.run_predictions
```

### Weekly Training (Sunday 3:00 AM)
```bash
python -m jobs.train_models
```

## Docker Deployment

### Build Image
```bash
docker build -t fleetguard-ml-service .
```

### Run Container
```bash
docker run -p 8000:8000 --env-file .env fleetguard-ml-service
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```

## Model Performance Metrics

Track the following metrics for model quality:
- Precision, Recall, F1-Score for failure classification
- Mean Absolute Error (MAE) for RUL estimation
- R² score for risk scoring
- Calibration curves for probability predictions

## Monitoring

- Sentry integration for error tracking
- Structured logging (JSON format)
- Model prediction latency tracking
- Database query performance monitoring

## Future Enhancements

- Online learning for continuous model improvement
- AutoML for hyperparameter tuning
- Explainable AI (SHAP values) for prediction interpretability
- Federated learning for multi-tenant privacy
