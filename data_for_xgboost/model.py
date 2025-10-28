import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report
)
from xgboost import XGBClassifier
import joblib

# ===============================
# Step 1: Load the cleaned dataset
# ===============================
print("🔹 Loading cleaned data...")
df = pd.read_csv("round_cleaned.csv")

print(f"✅ Dataset shape: {df.shape}")
print(f"🧾 Columns: {list(df.columns)}")

# Separate features and labels
X = df.drop(columns=["label"])
y = df["label"]

# ===============================
# Step 2: Train-test split
# ===============================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"📊 Training samples: {len(X_train)}, Test samples: {len(X_test)}")

# ===============================
# Step 3: Train XGBoost model
# ===============================
print("🚀 Training XGBoost model...")

model = XGBClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    gamma=0.1,
    reg_lambda=1,
    random_state=42,
    use_label_encoder=False,
    eval_metric='logloss'
)

model.fit(X_train, y_train)

# ===============================
# Step 4: Evaluate model
# ===============================
print("🔹 Evaluating model...")

y_pred = model.predict(X_test)
y_pred_proba = model.predict_proba(X_test)[:, 1]

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred)
rec = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
auc = roc_auc_score(y_test, y_pred_proba)

print("\n📈 Evaluation Metrics:")
print(f"Accuracy:  {acc:.4f}")
print(f"Precision: {prec:.4f}")
print(f"Recall:    {rec:.4f}")
print(f"F1 Score:  {f1:.4f}")
print(f"ROC-AUC:   {auc:.4f}")

print("\n📊 Classification Report:")
print(classification_report(y_test, y_pred, target_names=["Human", "Bot"]))

print("🧩 Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# ===============================
# Step 5: Save the model
# ===============================
joblib.dump(model, "xgboost_human_bot_model.pkl")
print("✅ Model saved as xgboost_human_bot_model.pkl")
