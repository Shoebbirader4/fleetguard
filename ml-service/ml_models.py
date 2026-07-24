"""
ML Models for Predictive Maintenance

This module implements three ML models for failure prediction:
1. Random Forest Classifier - Predicts failure probability (0-100%)
2. Weibull Survival Model - Estimates remaining useful life (RUL)
3. Gradient Boosting Model - Calculates risk scores (low/medium/high/critical)

Models are trained separately per component category (tires, brakes, filters, batteries)
"""
import logging
import os
import pickle
import json
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, date

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
from sklearn.preprocessing import StandardScaler
from lifelines import WeibullAFTFitter
from lifelines.utils import concordance_index

from config import settings

logger = logging.getLogger(__name__)


class MLModelManager:
    """
    Manager for all ML models used in predictive maintenance
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize ML model manager
        
        Args:
            model_path: Path to save/load trained models
        """
        self.model_path = model_path or settings.model_path
        self.models: Dict[str, Dict[str, Any]] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        
        # Component categories to train separate models
        self.component_categories = ['tire', 'brake', 'filter', 'battery', 'oil']
        
        # Create model directory if it doesn't exist
        os.makedirs(self.model_path, exist_ok=True)
        
        logger.info(f"ML Model Manager initialized with model path: {self.model_path}")
    
    def train_all_models(
        self,
        tenant_id: str,
        feature_matrix: List[List[float]],
        labels: List[int],
        component_types: List[str],
        component_ages: List[int],
        odometer_usages: List[int]
    ) -> Dict[str, Any]:
        """
        Train all ML models for each component category
        
        Args:
            tenant_id: Tenant UUID
            feature_matrix: List of feature vectors
            labels: List of failure labels (0 or 1)
            component_types: List of component types
            component_ages: List of component ages in days
            odometer_usages: List of odometer usage in km
            
        Returns:
            Dictionary with training metrics
        """
        logger.info(f"Training models for tenant {tenant_id}")
        
        # Convert to pandas DataFrame for easier manipulation
        df = pd.DataFrame(feature_matrix, columns=[
            'component_age_days',
            'usage_intensity_km_per_day',
            'historical_failure_count',
            'maintenance_compliance_rate',
            'route_type_encoded',
            'season_encoded',
            'odometer_usage_ratio',
            'time_usage_ratio'
        ])
        df['label'] = labels
        df['component_type'] = component_types
        df['component_age_days_original'] = component_ages
        df['odometer_usage'] = odometer_usages
        
        # Track training results
        training_results = {
            'timestamp': datetime.utcnow().isoformat(),
            'tenant_id': tenant_id,
            'total_samples': len(df),
            'failure_rate': df['label'].mean(),
            'categories': {}
        }
        
        # Train models per component category
        for category in self.component_categories:
            category_df = df[df['component_type'].str.contains(category, case=False, na=False)]
            
            if len(category_df) < 30:  # Minimum samples required
                logger.warning(f"Insufficient data for {category}: {len(category_df)} samples")
                training_results['categories'][category] = {
                    'status': 'skipped',
                    'reason': 'insufficient_data',
                    'samples': len(category_df)
                }
                continue
            
            logger.info(f"Training models for category '{category}' with {len(category_df)} samples")
            
            try:
                # Train models for this category
                category_results = self._train_category_models(category, category_df)
                training_results['categories'][category] = category_results
                
            except Exception as e:
                logger.error(f"Failed to train models for {category}: {e}")
                training_results['categories'][category] = {
                    'status': 'failed',
                    'error': str(e)
                }
        
        # Save training results metadata
        self._save_training_metadata(tenant_id, training_results)
        
        return training_results
    
    def _train_category_models(
        self,
        category: str,
        data: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Train all three models for a specific component category
        
        Args:
            category: Component category name
            data: DataFrame with features and labels
            
        Returns:
            Dictionary with training metrics
        """
        # Prepare features
        feature_cols = [
            'component_age_days',
            'usage_intensity_km_per_day',
            'historical_failure_count',
            'maintenance_compliance_rate',
            'route_type_encoded',
            'season_encoded',
            'odometer_usage_ratio',
            'time_usage_ratio'
        ]
        
        X = data[feature_cols].values
        y = data['label'].values
        
        # Split data for validation
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        results = {
            'status': 'success',
            'samples': len(data),
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'failure_rate': float(y.mean())
        }
        
        # 1. Train Random Forest Classifier for failure probability
        rf_results = self._train_random_forest(
            category, X_train_scaled, X_test_scaled, y_train, y_test
        )
        results['random_forest'] = rf_results
        
        # 2. Train Weibull Survival Model for RUL estimation
        weibull_results = self._train_weibull_model(
            category, data, feature_cols
        )
        results['weibull'] = weibull_results
        
        # 3. Train Gradient Boosting for risk score
        gb_results = self._train_gradient_boosting(
            category, X_train_scaled, X_test_scaled, y_train, y_test
        )
        results['gradient_boosting'] = gb_results
        
        # Save scaler
        self.scalers[category] = scaler
        self._save_scaler(category, scaler)
        
        return results
    
    def _train_random_forest(
        self,
        category: str,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, Any]:
        """
        Train Random Forest Classifier for failure probability
        
        Args:
            category: Component category
            X_train: Training features
            X_test: Test features
            y_train: Training labels
            y_test: Test labels
            
        Returns:
            Training metrics
        """
        logger.info(f"Training Random Forest for {category}")
        
        # Train model
        rf_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced',  # Handle imbalanced data
            n_jobs=-1
        )
        
        rf_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = rf_model.predict(X_test)
        y_pred_proba = rf_model.predict_proba(X_test)
        
        accuracy = accuracy_score(y_test, y_pred)
        
        # Calculate AUC if we have both classes
        if len(np.unique(y_test)) > 1:
            auc = roc_auc_score(y_test, y_pred_proba[:, 1])
        else:
            auc = None
        
        # Save model
        model_name = f"{category}_random_forest"
        self.models[model_name] = rf_model
        self._save_model(model_name, rf_model)
        
        logger.info(f"Random Forest for {category} - Accuracy: {accuracy:.4f}, AUC: {auc}")
        
        return {
            'accuracy': float(accuracy),
            'auc': float(auc) if auc is not None else None,
            'n_estimators': 100,
            'feature_importance': rf_model.feature_importances_.tolist()
        }
    
    def _train_weibull_model(
        self,
        category: str,
        data: pd.DataFrame,
        feature_cols: List[str]
    ) -> Dict[str, Any]:
        """
        Train Weibull Survival Model for RUL estimation
        
        Args:
            category: Component category
            data: DataFrame with features and survival information
            feature_cols: List of feature column names
            
        Returns:
            Training metrics
        """
        logger.info(f"Training Weibull model for {category}")
        
        try:
            # Prepare survival data
            # Duration = component age, Event = failure (1) or censored (0)
            survival_df = data[feature_cols].copy()
            survival_df['duration'] = data['component_age_days_original']
            survival_df['event'] = data['label']
            
            # Weibull AFT (Accelerated Failure Time) model
            weibull_model = WeibullAFTFitter()
            
            # Fit model
            weibull_model.fit(
                survival_df,
                duration_col='duration',
                event_col='event'
            )
            
            # Calculate concordance index (measure of model quality)
            c_index = concordance_index(
                survival_df['duration'],
                -weibull_model.predict_expectation(survival_df[feature_cols]),
                survival_df['event']
            )
            
            # Save model
            model_name = f"{category}_weibull"
            self.models[model_name] = weibull_model
            self._save_model(model_name, weibull_model)
            
            logger.info(f"Weibull model for {category} - C-index: {c_index:.4f}")
            
            return {
                'c_index': float(c_index),
                'lambda_': float(weibull_model.lambda_),
                'rho_': float(weibull_model.rho_)
            }
            
        except Exception as e:
            logger.error(f"Failed to train Weibull model for {category}: {e}")
            return {
                'error': str(e),
                'c_index': None
            }
    
    def _train_gradient_boosting(
        self,
        category: str,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, Any]:
        """
        Train Gradient Boosting model for risk score calculation
        
        Args:
            category: Component category
            X_train: Training features
            X_test: Test features
            y_train: Training labels
            y_test: Test labels
            
        Returns:
            Training metrics
        """
        logger.info(f"Training Gradient Boosting for {category}")
        
        # Train model
        gb_model = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        gb_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = gb_model.predict(X_test)
        y_pred_proba = gb_model.predict_proba(X_test)
        
        accuracy = accuracy_score(y_test, y_pred)
        
        # Calculate AUC if we have both classes
        if len(np.unique(y_test)) > 1:
            auc = roc_auc_score(y_test, y_pred_proba[:, 1])
        else:
            auc = None
        
        # Save model
        model_name = f"{category}_gradient_boosting"
        self.models[model_name] = gb_model
        self._save_model(model_name, gb_model)
        
        logger.info(f"Gradient Boosting for {category} - Accuracy: {accuracy:.4f}, AUC: {auc}")
        
        return {
            'accuracy': float(accuracy),
            'auc': float(auc) if auc is not None else None,
            'n_estimators': 100,
            'feature_importance': gb_model.feature_importances_.tolist()
        }
    
    def predict(
        self,
        component_type: str,
        features: List[float],
        component_age_days: int,
        odometer_usage_km: int
    ) -> Dict[str, Any]:
        """
        Generate predictions for a component
        
        Args:
            component_type: Type of component
            features: Feature vector
            component_age_days: Component age in days
            odometer_usage_km: Kilometers driven
            
        Returns:
            Dictionary with failure probability, RUL, and risk score
        """
        # Find matching category
        category = self._get_category_from_type(component_type)
        
        if category not in self.scalers:
            logger.warning(f"No trained models found for category {category}")
            return self._default_prediction()
        
        # Scale features
        scaler = self.scalers[category]
        features_scaled = scaler.transform([features])
        
        # 1. Predict failure probability using Random Forest
        rf_model_name = f"{category}_random_forest"
        rf_model = self.models.get(rf_model_name)
        
        if rf_model:
            failure_prob = rf_model.predict_proba(features_scaled)[0][1]
        else:
            failure_prob = 0.5  # Default
        
        # 2. Estimate RUL using Weibull model
        weibull_model_name = f"{category}_weibull"
        weibull_model = self.models.get(weibull_model_name)
        
        if weibull_model:
            # Prepare features for Weibull
            feature_names = [
                'component_age_days',
                'usage_intensity_km_per_day',
                'historical_failure_count',
                'maintenance_compliance_rate',
                'route_type_encoded',
                'season_encoded',
                'odometer_usage_ratio',
                'time_usage_ratio'
            ]
            features_df = pd.DataFrame([features], columns=feature_names)
            
            # Predict expected remaining life
            expected_life = weibull_model.predict_expectation(features_df).values[0]
            rul_days = max(0, int(expected_life - component_age_days))
            
            # Estimate RUL in km based on usage intensity
            usage_intensity = features[1]  # km per day
            rul_km = int(rul_days * usage_intensity) if usage_intensity > 0 else None
        else:
            rul_days = None
            rul_km = None
        
        # 3. Calculate risk score using Gradient Boosting
        gb_model_name = f"{category}_gradient_boosting"
        gb_model = self.models.get(gb_model_name)
        
        if gb_model:
            gb_failure_prob = gb_model.predict_proba(features_scaled)[0][1]
        else:
            gb_failure_prob = failure_prob
        
        # Combine RF and GB predictions for risk score
        combined_prob = (failure_prob + gb_failure_prob) / 2
        risk_score = self._calculate_risk_score(combined_prob, rul_days)
        
        return {
            'failure_probability': float(combined_prob),
            'risk_score': risk_score,
            'remaining_useful_life_days': rul_days,
            'remaining_useful_life_km': rul_km,
            'recommended_action': self._get_recommended_action(risk_score, rul_days)
        }
    
    def _calculate_risk_score(
        self,
        failure_probability: float,
        rul_days: Optional[int]
    ) -> str:
        """
        Calculate risk score based on failure probability and RUL
        
        Args:
            failure_probability: Probability of failure (0-1)
            rul_days: Remaining useful life in days
            
        Returns:
            Risk score: 'low', 'medium', 'high', 'critical'
        """
        # Risk score based on failure probability
        if failure_probability >= 0.7:
            prob_risk = 'critical'
        elif failure_probability >= 0.5:
            prob_risk = 'high'
        elif failure_probability >= 0.3:
            prob_risk = 'medium'
        else:
            prob_risk = 'low'
        
        # Adjust based on RUL if available
        if rul_days is not None:
            if rul_days <= 7:
                rul_risk = 'critical'
            elif rul_days <= 30:
                rul_risk = 'high'
            elif rul_days <= 90:
                rul_risk = 'medium'
            else:
                rul_risk = 'low'
            
            # Take the higher risk
            risk_levels = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}
            final_risk_level = max(risk_levels[prob_risk], risk_levels[rul_risk])
            
            for risk, level in risk_levels.items():
                if level == final_risk_level:
                    return risk
        
        return prob_risk
    
    def _get_recommended_action(
        self,
        risk_score: str,
        rul_days: Optional[int]
    ) -> str:
        """
        Generate recommended action based on risk score
        
        Args:
            risk_score: Risk level
            rul_days: Remaining useful life in days
            
        Returns:
            Recommended action text
        """
        if risk_score == 'critical':
            return "URGENT: Schedule immediate inspection and replacement"
        elif risk_score == 'high':
            if rul_days and rul_days <= 30:
                return "Schedule replacement within 30 days"
            else:
                return "Schedule inspection and plan replacement soon"
        elif risk_score == 'medium':
            return "Monitor component and schedule preventive maintenance"
        else:
            return "Continue normal operation and routine checks"
    
    def _get_category_from_type(self, component_type: str) -> str:
        """
        Map component type to category
        
        Args:
            component_type: Component type string
            
        Returns:
            Category name
        """
        component_type_lower = component_type.lower()
        
        for category in self.component_categories:
            if category in component_type_lower:
                return category
        
        # Default to first category if no match
        return self.component_categories[0]
    
    def _default_prediction(self) -> Dict[str, Any]:
        """
        Return default prediction when models are not available
        
        Returns:
            Default prediction dictionary
        """
        return {
            'failure_probability': 0.5,
            'risk_score': 'medium',
            'remaining_useful_life_days': None,
            'remaining_useful_life_km': None,
            'recommended_action': 'Models not trained yet. Unable to predict.'
        }
    
    def load_models(self, category: Optional[str] = None) -> bool:
        """
        Load trained models from disk
        
        Args:
            category: Optional category to load, or None to load all
            
        Returns:
            True if models loaded successfully
        """
        try:
            categories_to_load = [category] if category else self.component_categories
            
            for cat in categories_to_load:
                # Load Random Forest
                rf_path = os.path.join(self.model_path, f"{cat}_random_forest.pkl")
                if os.path.exists(rf_path):
                    with open(rf_path, 'rb') as f:
                        self.models[f"{cat}_random_forest"] = pickle.load(f)
                    logger.info(f"Loaded Random Forest model for {cat}")
                
                # Load Weibull
                weibull_path = os.path.join(self.model_path, f"{cat}_weibull.pkl")
                if os.path.exists(weibull_path):
                    with open(weibull_path, 'rb') as f:
                        self.models[f"{cat}_weibull"] = pickle.load(f)
                    logger.info(f"Loaded Weibull model for {cat}")
                
                # Load Gradient Boosting
                gb_path = os.path.join(self.model_path, f"{cat}_gradient_boosting.pkl")
                if os.path.exists(gb_path):
                    with open(gb_path, 'rb') as f:
                        self.models[f"{cat}_gradient_boosting"] = pickle.load(f)
                    logger.info(f"Loaded Gradient Boosting model for {cat}")
                
                # Load Scaler
                scaler_path = os.path.join(self.model_path, f"{cat}_scaler.pkl")
                if os.path.exists(scaler_path):
                    with open(scaler_path, 'rb') as f:
                        self.scalers[cat] = pickle.load(f)
                    logger.info(f"Loaded scaler for {cat}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            return False
    
    def _save_model(self, model_name: str, model: Any) -> None:
        """
        Save model to disk
        
        Args:
            model_name: Name of the model
            model: Model object
        """
        try:
            model_path = os.path.join(self.model_path, f"{model_name}.pkl")
            with open(model_path, 'wb') as f:
                pickle.dump(model, f)
            logger.info(f"Saved model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to save model {model_name}: {e}")
    
    def _save_scaler(self, category: str, scaler: StandardScaler) -> None:
        """
        Save scaler to disk
        
        Args:
            category: Component category
            scaler: StandardScaler object
        """
        try:
            scaler_path = os.path.join(self.model_path, f"{category}_scaler.pkl")
            with open(scaler_path, 'wb') as f:
                pickle.dump(scaler, f)
            logger.info(f"Saved scaler for {category}")
        except Exception as e:
            logger.error(f"Failed to save scaler for {category}: {e}")
    
    def _save_training_metadata(self, tenant_id: str, results: Dict[str, Any]) -> None:
        """
        Save training metadata to disk
        
        Args:
            tenant_id: Tenant UUID
            results: Training results dictionary
        """
        try:
            metadata_path = os.path.join(self.model_path, f"training_metadata_{tenant_id}.json")
            with open(metadata_path, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Saved training metadata for tenant {tenant_id}")
        except Exception as e:
            logger.error(f"Failed to save training metadata: {e}")


# Global instance
ml_model_manager = MLModelManager()
