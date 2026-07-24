"""
Main FastAPI application for ML Predictive Maintenance Service
"""
import logging
import time
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from database import init_db_pool, close_db_pool, test_connection
from models import (
    PredictRequest, PredictResponse,
    TrainRequest, TrainResponse,
    HealthResponse, FleetHealthResponse
)
from feature_engineering import feature_engineer
from ml_models import ml_model_manager
from fleet_health import calculate_fleet_health_score, save_fleet_health_score

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for startup and shutdown events
    """
    # Startup
    logger.info("Starting ML Predictive Maintenance Service...")
    try:
        init_db_pool(min_conn=2, max_conn=10)
        logger.info("Database connection pool initialized")
        
        # Test database connection
        if not test_connection():
            logger.warning("Database connection test failed at startup")
        
        # Load trained models if available
        logger.info("Loading trained models...")
        if ml_model_manager.load_models():
            logger.info("Models loaded successfully")
        else:
            logger.warning("No trained models found or failed to load")
        
        logger.info("ML Service startup complete")
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down ML Service...")
    close_db_pool()
    logger.info("Shutdown complete")


# Initialize FastAPI app
app = FastAPI(
    title="FleetGuard AI - ML Predictive Maintenance Service",
    description="Machine Learning service for predictive maintenance and failure prediction",
    version=settings.model_version,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check endpoint",
    description="Check service health status including database connectivity"
)
async def health_check() -> HealthResponse:
    """
    Health check endpoint
    
    Returns service status, database connectivity, and model availability
    """
    try:
        # Test database connection
        db_connected = test_connection()
        
        # Check if models are loaded
        models_loaded = len(ml_model_manager.models) > 0
        
        overall_status = "healthy" if db_connected else "unhealthy"
        
        return HealthResponse(
            status=overall_status,
            timestamp=datetime.utcnow(),
            database_connected=db_connected,
            models_loaded=models_loaded,
            version=settings.model_version,
            details={
                "model_path": settings.model_path,
                "training_enabled": settings.training_enabled,
                "batch_size": settings.prediction_batch_size
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.utcnow(),
            database_connected=False,
            models_loaded=False,
            version=settings.model_version,
            details={"error": str(e)}
        )


@app.post(
    "/predict",
    response_model=PredictResponse,
    tags=["Predictions"],
    summary="Run failure predictions",
    description="Execute ML models to predict component failures for specified vehicles"
)
async def predict_failures(request: PredictRequest) -> PredictResponse:
    """
    Run failure predictions for vehicles
    
    Args:
        request: PredictRequest containing tenant_id and optional vehicle_ids
        
    Returns:
        PredictResponse with prediction results and execution metrics
        
    Raises:
        HTTPException: If prediction process fails
    """
    start_time = time.time()
    
    try:
        logger.info(f"Starting predictions for tenant {request.tenant_id}")
        
        # Step 1: Extract features from database
        logger.info("Extracting component features...")
        features = feature_engineer.extract_component_features(
            tenant_id=str(request.tenant_id),
            vehicle_ids=[str(vid) for vid in request.vehicle_ids] if request.vehicle_ids else None
        )
        
        logger.info(f"Extracted features for {len(features)} components")
        
        if len(features) == 0:
            return PredictResponse(
                success=True,
                predictions_count=0,
                alerts_generated=0,
                execution_time_seconds=round(time.time() - start_time, 2),
                message="No active components found for prediction"
            )
        
        # Step 2: Generate predictions for each component
        logger.info("Generating predictions...")
        predictions = []
        
        for feature_dict in features:
            # Get feature vector
            feature_vector = feature_engineer.get_feature_vector(feature_dict)
            
            # Generate prediction
            prediction = ml_model_manager.predict(
                component_type=feature_dict['component_type'],
                features=feature_vector,
                component_age_days=feature_dict['component_age_days'],
                odometer_usage_km=feature_dict['current_odometer'] - feature_dict['installation_odometer']
            )
            
            # Combine with component info
            predictions.append({
                'component_id': feature_dict['component_id'],
                'vehicle_id': feature_dict['vehicle_id'],
                'component_type': feature_dict['component_type'],
                'failure_probability': prediction['failure_probability'],
                'risk_score': prediction['risk_score'],
                'remaining_useful_life_days': prediction['remaining_useful_life_days'],
                'remaining_useful_life_km': prediction['remaining_useful_life_km'],
                'recommended_action': prediction['recommended_action'],
                'model_version': settings.model_version
            })
        
        logger.info(f"Generated {len(predictions)} predictions")
        
        # Step 3: Save predictions to database
        logger.info("Saving predictions to database...")
        from database import get_db_cursor
        
        with get_db_cursor() as cursor:
            for pred in predictions:
                query = """
                    INSERT INTO predictions (
                        tenant_id, vehicle_id, component_id, prediction_date,
                        failure_probability, risk_score, remaining_useful_life_days,
                        remaining_useful_life_km, recommended_action, model_version
                    ) VALUES (
                        %s, %s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s
                    )
                """
                cursor.execute(query, (
                    str(request.tenant_id),
                    pred['vehicle_id'],
                    pred['component_id'],
                    pred['failure_probability'],
                    pred['risk_score'],
                    pred['remaining_useful_life_days'],
                    pred['remaining_useful_life_km'],
                    pred['recommended_action'],
                    pred['model_version']
                ))
        
        logger.info("Predictions saved to database")
        
        # Step 4: Generate alerts for high/critical risk components
        logger.info("Generating alerts for high-risk components...")
        alerts_generated = 0
        
        high_risk_predictions = [p for p in predictions if p['risk_score'] in ['high', 'critical']]
        
        with get_db_cursor() as cursor:
            for pred in high_risk_predictions:
                # Check if alert already exists for this component
                check_query = """
                    SELECT id FROM alerts
                    WHERE component_id = %s
                      AND alert_type = 'critical_failure_risk'
                      AND status = 'active'
                """
                cursor.execute(check_query, (pred['component_id'],))
                existing_alert = cursor.fetchone()
                
                if existing_alert:
                    logger.debug(f"Alert already exists for component {pred['component_id']}")
                    continue
                
                # Create alert
                severity = pred['risk_score']
                title = f"{pred['risk_score'].upper()} Risk: {pred['component_type']} failure predicted"
                description = f"Failure probability: {pred['failure_probability']*100:.1f}%. {pred['recommended_action']}"
                
                if pred['remaining_useful_life_days']:
                    description += f" RUL: {pred['remaining_useful_life_days']} days"
                if pred['remaining_useful_life_km']:
                    description += f", {pred['remaining_useful_life_km']} km"
                
                insert_query = """
                    INSERT INTO alerts (
                        tenant_id, vehicle_id, component_id, alert_type,
                        severity, title, description, status
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """
                cursor.execute(insert_query, (
                    str(request.tenant_id),
                    pred['vehicle_id'],
                    pred['component_id'],
                    'critical_failure_risk',
                    severity,
                    title,
                    description,
                    'active'
                ))
                alerts_generated += 1
        
        logger.info(f"Generated {alerts_generated} new alerts")
        
        # Step 5: Calculate and save fleet health score
        logger.info("Calculating fleet health score...")
        try:
            health_data = calculate_fleet_health_score(str(request.tenant_id))
            save_fleet_health_score(str(request.tenant_id), health_data)
            logger.info(f"Fleet health score: {health_data.get('fleet_health_score')} ({health_data.get('health_category')})")
        except Exception as e:
            logger.warning(f"Failed to calculate fleet health score: {e}")
            # Don't fail the entire prediction workflow if health calculation fails
        
        execution_time = time.time() - start_time
        
        return PredictResponse(
            success=True,
            predictions_count=len(predictions),
            alerts_generated=alerts_generated,
            execution_time_seconds=round(execution_time, 2),
            message=f"Successfully generated {len(predictions)} predictions and {alerts_generated} alerts"
        )
        
    except Exception as e:
        logger.error(f"Prediction failed for tenant {request.tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@app.get(
    "/fleet-health/{tenant_id}",
    response_model=FleetHealthResponse,
    tags=["Predictions"],
    summary="Get fleet health score",
    description="Calculate and return current fleet health score for a tenant"
)
async def get_fleet_health(tenant_id: str) -> FleetHealthResponse:
    """
    Get fleet health score for a tenant
    
    Args:
        tenant_id: Tenant UUID
        
    Returns:
        FleetHealthResponse with health score and breakdown
        
    Raises:
        HTTPException: If calculation fails
    """
    try:
        logger.info(f"Calculating fleet health score for tenant {tenant_id}")
        
        health_data = calculate_fleet_health_score(tenant_id)
        
        return FleetHealthResponse(**health_data)
        
    except Exception as e:
        logger.error(f"Failed to get fleet health for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate fleet health: {str(e)}"
        )


@app.post(
    "/predict-all-tenants",
    tags=["Predictions"],
    summary="Run predictions for all tenants",
    description="Execute predictions workflow for all active tenants (batch processing)"
)
async def predict_all_tenants() -> Dict[str, Any]:
    """
    Run predictions for all tenants
    
    This endpoint is designed for scheduled batch processing (e.g., daily cron job).
    It will process all active tenants and generate predictions.
    
    Returns:
        Summary of prediction execution across all tenants
        
    Raises:
        HTTPException: If batch processing fails
    """
    start_time = time.time()
    
    try:
        logger.info("Starting batch prediction for all tenants")
        
        # Get all active tenants
        from database import get_db_cursor
        
        with get_db_cursor() as cursor:
            query = """
                SELECT id, name, vehicle_limit
                FROM tenants
                WHERE subscription_status = 'active'
                ORDER BY created_at
            """
            cursor.execute(query)
            tenants = cursor.fetchall()
        
        logger.info(f"Found {len(tenants)} active tenants")
        
        results = {
            'total_tenants': len(tenants),
            'successful': 0,
            'failed': 0,
            'tenant_results': [],
            'execution_time_seconds': 0
        }
        
        # Process each tenant
        for tenant in tenants:
            tenant_id = str(tenant['id'])
            tenant_name = tenant['name']
            
            try:
                logger.info(f"Processing tenant: {tenant_name} ({tenant_id})")
                
                # Run predictions for this tenant
                request = PredictRequest(tenant_id=tenant_id)
                response = await predict_failures(request)
                
                results['successful'] += 1
                results['tenant_results'].append({
                    'tenant_id': tenant_id,
                    'tenant_name': tenant_name,
                    'status': 'success',
                    'predictions_count': response.predictions_count,
                    'alerts_generated': response.alerts_generated
                })
                
                logger.info(f"Tenant {tenant_name}: {response.predictions_count} predictions, {response.alerts_generated} alerts")
                
            except Exception as e:
                logger.error(f"Failed to process tenant {tenant_name} ({tenant_id}): {e}")
                results['failed'] += 1
                results['tenant_results'].append({
                    'tenant_id': tenant_id,
                    'tenant_name': tenant_name,
                    'status': 'failed',
                    'error': str(e)
                })
        
        execution_time = time.time() - start_time
        results['execution_time_seconds'] = round(execution_time, 2)
        
        logger.info(f"Batch prediction complete: {results['successful']} successful, {results['failed']} failed in {execution_time:.2f}s")
        
        return results
        
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction failed: {str(e)}"
        )


@app.post(
    "/train",
    response_model=TrainResponse,
    tags=["Training"],
    summary="Train ML models",
    description="Train or retrain ML models using latest maintenance data"
)
async def train_models(request: TrainRequest) -> TrainResponse:
    """
    Train ML models
    
    Args:
        request: TrainRequest containing tenant_id and optional component_category
        
    Returns:
        TrainResponse with training results and metrics
        
    Raises:
        HTTPException: If training is disabled or fails
    """
    if not settings.training_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Model training is disabled in configuration"
        )
    
    start_time = time.time()
    
    try:
        logger.info(f"Starting model training for tenant {request.tenant_id}")
        
        # Step 1: Extract training data from database
        logger.info("Extracting training data with labels...")
        feature_matrix, labels = feature_engineer.extract_training_data(
            tenant_id=str(request.tenant_id),
            component_type=request.component_category
        )
        
        logger.info(f"Extracted {len(feature_matrix)} training samples with {sum(labels)} failures")
        
        if len(feature_matrix) < 30:
            return TrainResponse(
                success=False,
                models_trained=[],
                execution_time_seconds=round(time.time() - start_time, 2),
                metrics={'training_samples': len(feature_matrix)},
                message="Insufficient training data. Minimum 30 samples required."
            )
        
        # Step 2: Extract additional data for training
        logger.info("Extracting component metadata for training...")
        from database import get_db_cursor
        
        component_types = []
        component_ages = []
        odometer_usages = []
        
        with get_db_cursor() as cursor:
            # Get all components for this tenant
            type_filter = ""
            params = [str(request.tenant_id)]
            
            if request.component_category:
                type_filter = "AND c.component_type ILIKE %s"
                params.append(f"%{request.component_category}%")
            
            query = f"""
                SELECT 
                    c.component_type,
                    EXTRACT(DAY FROM (CURRENT_DATE - c.installation_date)) as age_days,
                    COALESCE(v.current_odometer - c.installation_odometer, 0) as odometer_usage
                FROM components c
                INNER JOIN vehicles v ON c.vehicle_id = v.id
                WHERE c.tenant_id = %s
                  {type_filter}
                ORDER BY c.created_at DESC
                LIMIT 10000
            """
            
            cursor.execute(query, params)
            components = cursor.fetchall()
            
            for comp in components[:len(feature_matrix)]:
                component_types.append(comp['component_type'])
                component_ages.append(int(comp['age_days']))
                odometer_usages.append(int(comp['odometer_usage']))
        
        # Step 3: Train models
        logger.info("Training ML models...")
        training_results = ml_model_manager.train_all_models(
            tenant_id=str(request.tenant_id),
            feature_matrix=feature_matrix,
            labels=labels,
            component_types=component_types,
            component_ages=component_ages,
            odometer_usages=odometer_usages
        )
        
        # Collect trained model names
        models_trained = []
        total_accuracy = 0
        accuracy_count = 0
        
        for category, results in training_results.get('categories', {}).items():
            if results.get('status') == 'success':
                models_trained.append(f"{category}_random_forest")
                models_trained.append(f"{category}_weibull")
                models_trained.append(f"{category}_gradient_boosting")
                
                # Track accuracy
                if 'random_forest' in results and results['random_forest'].get('accuracy'):
                    total_accuracy += results['random_forest']['accuracy']
                    accuracy_count += 1
        
        avg_accuracy = total_accuracy / accuracy_count if accuracy_count > 0 else 0
        
        # Step 4: Prepare metrics
        metrics = {
            'training_samples': training_results.get('total_samples', 0),
            'failure_count': sum(labels),
            'failure_rate': training_results.get('failure_rate', 0),
            'categories_trained': len([c for c in training_results.get('categories', {}).values() if c.get('status') == 'success']),
            'average_accuracy': round(avg_accuracy, 4)
        }
        
        execution_time = time.time() - start_time
        
        logger.info(f"Training completed in {execution_time:.2f}s. Trained {len(models_trained)} models")
        
        return TrainResponse(
            success=True,
            models_trained=models_trained,
            execution_time_seconds=round(execution_time, 2),
            metrics=metrics,
            message=f"Successfully trained {len(models_trained)} models across {metrics['categories_trained']} component categories"
        )
        
    except Exception as e:
        logger.error(f"Training failed for tenant {request.tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}"
        )


@app.get(
    "/",
    tags=["Root"],
    summary="Root endpoint",
    description="API information and links"
)
async def root() -> Dict[str, Any]:
    """Root endpoint providing API information"""
    return {
        "service": "FleetGuard AI - ML Predictive Maintenance Service",
        "version": settings.model_version,
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.log_level == "DEBUG" else "An error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.log_level.lower()
    )
