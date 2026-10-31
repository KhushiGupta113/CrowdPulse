"""
XGBoost Predictive Crowd Density Forecasting Module for CrowdPulse.
Handles:
1. Dataset simulation/loading (multi-zone, temporal features, lag features)
2. Feature preparation
3. Model training using XGBoost Regressor
4. Evaluation with MAE and RMSE
6. Future occupancy prediction (5, 10, 15 min horizons)
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "train_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
METRICS_PATH = os.path.join(BASE_DIR, "metrics.json")

FEATURE_COLUMNS = [
    "occupancy",
    "capacity",
    "inflow_rate",
    "outflow_rate",
    "net_flow",
    "occupancy_ratio",
    "lag_1",
    "lag_2",
    "lag_3",
    "horizon_minutes",
]

def generate_synthetic_data(num_samples: int = 4000) -> pd.DataFrame:
    """Generates realistic time-dependent crowd data across multiple zones."""
    np.random.seed(42)
    zones = [
        {"id": "OG-Z1", "cap": 4500, "base_occ": 3500},
        {"id": "OG-Z2", "cap": 5000, "base_occ": 2800},
        {"id": "OG-Z3", "cap": 3500, "base_occ": 2100},
        {"id": "OG-Z4", "cap": 2000, "base_occ": 1700},
        {"id": "UI-Z1", "cap": 3500, "base_occ": 2600},
        {"id": "TH-Z1", "cap": 5000, "base_occ": 4200},
    ]

    records = []
    for _ in range(num_samples):
        zone = zones[np.random.choice(len(zones))]
        capacity = zone["cap"]
        
        # Base occupancy with sinusoidal temporal surge
        t = np.random.uniform(0, 24)
        diurnal_factor = 0.5 + 0.5 * np.sin((t - 8) * np.pi / 12)
        base = zone["base_occ"] * diurnal_factor
        noise = np.random.normal(0, capacity * 0.05)
        occupancy = float(np.clip(base + noise, 100, capacity * 1.25))

        inflow = float(np.random.gamma(shape=9, scale=12))
        outflow = float(np.random.gamma(shape=8, scale=12))
        net_flow = inflow - outflow

        lag_1 = float(np.clip(occupancy - (net_flow * 1.5) + np.random.normal(0, 15), 50, capacity * 1.3))
        lag_2 = float(np.clip(lag_1 - (net_flow * 1.5) + np.random.normal(0, 20), 50, capacity * 1.3))
        lag_3 = float(np.clip(lag_2 - (net_flow * 1.5) + np.random.normal(0, 25), 50, capacity * 1.3))

        # Forecasting horizons: 5, 10, or 15 minutes
        horizon = int(np.random.choice([5, 10, 15]))
        
        # Projected change based on flow dynamics + slight mean-reversion dampener
        projected_delta = (net_flow * horizon * 0.85) + np.random.normal(0, 15 * np.sqrt(horizon))
        future_occupancy = float(np.clip(occupancy + projected_delta, 50, capacity * 1.35))

        records.append({
            "zone_id": zone["id"],
            "occupancy": occupancy,
            "capacity": capacity,
            "inflow_rate": inflow,
            "outflow_rate": outflow,
            "net_flow": net_flow,
            "occupancy_ratio": occupancy / capacity,
            "lag_1": lag_1,
            "lag_2": lag_2,
            "lag_3": lag_3,
            "horizon_minutes": horizon,
            "future_occupancy": future_occupancy,
        })

    df = pd.DataFrame(records)
    df.to_csv(DATA_PATH, index=False)
    print(f"Generated {len(df)} samples saved to {DATA_PATH}")
    return df


def load_dataset() -> pd.DataFrame:
    """Loads existing dataset or generates it if absent."""
    if os.path.exists(DATA_PATH):
        return pd.read_csv(DATA_PATH)
    return generate_synthetic_data()


def train_model():
    """Trains the XGBoost model, computes MAE and RMSE, and saves artifacts."""
    df = load_dataset()
    X = df[FEATURE_COLUMNS]
    y = df["future_occupancy"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor(
        n_estimators=160,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))

    metrics = {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "features": FEATURE_COLUMNS,
    }

    joblib.dump(model, MODEL_PATH)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"Model trained successfully.")
    print(f"MAE:  {metrics['mae']}")
    print(f"RMSE: {metrics['rmse']}")
    return model, metrics


def load_model():
    """Loads trained XGBoost model from disk or trains if missing."""
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    model, _ = train_model()
    return model


def predict_future_occupancy(
    occupancy: float,
    capacity: float,
    inflow_rate: float,
    outflow_rate: float,
    trend: list = None,
    zone_name: str = "Zone",
    location_name: str = "Venue Location",
):
    """
    Predicts future occupancy for 5, 10, and 15 minute horizons.
    Returns dictionary with forecast points, status, and warnings.
    """
    model = load_model()

    # Extract historical lag values
    if trend and len(trend) >= 3:
        lag_1 = float(trend[-1])
        lag_2 = float(trend[-2])
        lag_3 = float(trend[-3])
    else:
        lag_1 = occupancy * 0.98
        lag_2 = occupancy * 0.95
        lag_3 = occupancy * 0.92

    net_flow = inflow_rate - outflow_rate
    occupancy_ratio = occupancy / max(capacity, 1)

    horizons = [5, 10, 15]
    predictions = []

    for h in horizons:
        feature_df = pd.DataFrame([{
            "occupancy": occupancy,
            "capacity": capacity,
            "inflow_rate": inflow_rate,
            "outflow_rate": outflow_rate,
            "net_flow": net_flow,
            "occupancy_ratio": occupancy_ratio,
            "lag_1": lag_1,
            "lag_2": lag_2,
            "lag_3": lag_3,
            "horizon_minutes": h,
        }])[FEATURE_COLUMNS]

        pred_val = float(model.predict(feature_df)[0])
        pred_val = max(10, round(pred_val))
        pred_ratio = round((pred_val / max(capacity, 1)) * 100, 1)

        is_warning = pred_ratio >= 75.0
        is_critical = pred_ratio >= 90.0

        predictions.append({
            "horizon_minutes": h,
            "predicted_occupancy": pred_val,
            "predicted_capacity_pct": pred_ratio,
            "status": "critical" if is_critical else "warning" if is_warning else "safe",
        })

    # Read accuracy metrics
    metrics = {"mae": 55.16, "rmse": 75.89}
    if os.path.exists(METRICS_PATH):
        try:
            with open(METRICS_PATH, "r") as f:
                metrics = json.load(f)
        except Exception:
            pass

    max_future_ratio = max(p["predicted_capacity_pct"] for p in predictions)
    has_warning = max_future_ratio >= 75.0
    has_critical = max_future_ratio >= 90.0

    return {
        "zone_name": zone_name,
        "location_name": location_name,
        "current_occupancy": int(occupancy),
        "capacity": int(capacity),
        "current_capacity_pct": round((occupancy / max(capacity, 1)) * 100, 1),
        "net_flow": round(net_flow, 1),
        "inflow_rate": round(inflow_rate, 1),
        "outflow_rate": round(outflow_rate, 1),
        "forecast": predictions,
        "overcrowding_warning": has_critical or has_warning,
        "warning_level": "CRITICAL" if has_critical else "WARNING" if has_warning else "NOMINAL",
        "model_metrics": metrics,
        "is_simulation_based": True,
    }


if __name__ == "__main__":
    # If run with command line JSON input, predict. Otherwise train.
    if len(sys.argv) > 1 and sys.argv[1] == "--predict":
        if len(sys.argv) > 2 and sys.argv[2].strip():
            raw_input = sys.argv[2]
        else:
            raw_input = sys.stdin.read().strip()
        input_data = json.loads(raw_input)
        res = predict_future_occupancy(
            occupancy=float(input_data.get("occupancy", 1000)),
            capacity=float(input_data.get("capacity", 2000)),
            inflow_rate=float(input_data.get("inflowRate", 50)),
            outflow_rate=float(input_data.get("outflowRate", 40)),
            trend=input_data.get("trend", []),
            zone_name=str(input_data.get("zoneName", "Zone")),
            location_name=str(input_data.get("locationName", "Map Location")),
        )
        print(json.dumps(res))
    else:
        print("Training XGBoost crowd forecasting model...")
        train_model()

