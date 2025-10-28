import pandas as pd
import numpy as np

def clean_round_data(input_path: str, output_path: str):
    print("🔹 Loading data...")
    df = pd.read_csv(input_path)
    print(f"✅ Loaded {len(df)} rows and {len(df.columns)} columns")

    # Drop columns that don't help model learning
    drop_cols = [
        'schema_version',
        'round_id',
        'player_address_hash',
        'session_id',
        'timestamp',
        'device_info_hash'
    ]
    df.drop(columns=[c for c in drop_cols if c in df.columns], inplace=True, errors='ignore')

    # Drop mouse-specific features (to avoid bias if bots/touch users lack them)
    mouse_features = [
        'mouse_move_count', 'mouse_total_distance', 'mouse_avg_speed',
        'mouse_max_speed', 'mouse_direction_changes', 'mouse_acceleration_changes',
        'mouse_pause_count', 'mouse_idle_time_ratio'
    ]
    df.drop(columns=[c for c in mouse_features if c in df.columns], inplace=True, errors='ignore')

    # Encode categorical variables
    print("🔹 Encoding categorical columns...")
    df['round_type'] = df['round_type'].map({'INFINITE': 0, 'DAILY': 1}).astype('float')
    df['dominant_click_type'] = df['dominant_click_type'].map({'mouse': 0, 'touch': 1}).astype('float')
    df['label'] = df['label'].map({'human': 0, 'bot': 1}).astype('int')

    # Replace inf/-inf with NaN
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    # Fill missing values with column median
    print("🔹 Handling missing values...")
    df.fillna(df.median(numeric_only=True), inplace=True)

    # Optional: Drop any remaining non-numeric columns
    df = df.select_dtypes(include=[np.number])

    # Save cleaned version
    df.to_csv(output_path, index=False)
    print(f"✅ Cleaned data saved to: {output_path}")
    print(f"📊 Final shape: {df.shape[0]} rows, {df.shape[1]} features")


if __name__ == "__main__":
    input_csv = "combined_rounds.csv"             # path to your original CSV
    output_csv = "round_cleaned.csv"    # path to save cleaned version

    clean_round_data(input_csv, output_csv)
