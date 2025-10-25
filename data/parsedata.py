import json
import csv

# Input JSON file (one JSON object per line)
input_file = "raw_rounds.jsonl"

# Output CSV files
clicks_csv = "clicks.csv"
mouse_moves_csv = "mouse_moves.csv"

clicks_fields = [
    "roundId", "playerAddressHash", "timestamp",
    "index", "clientTs", "clickType", "xPx", "yPx",
    "expectedTileIndex", "actualTileIndex", "isCorrect",
    "reactionTime", "xNorm", "yNorm",
    "prePathLength", "preAvgSpeed", "prePeakSpeed",
    "overshootCount", "distanceToTargetPx"
]

mouse_fields = [
    "roundId", "playerAddressHash", "timestamp",
    "x", "y", "ts"
]

clicks_rows = []
mouse_rows = []

# Read and parse each JSON object line by line
with open(input_file, "r", encoding="utf-8") as f:
    for line in f:
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            telemetry = data.get("telemetry", {})

            # Extract clicks
            for click in telemetry.get("clicks", []):
                row = {
                    "roundId": data.get("roundId"),
                    "playerAddressHash": data.get("playerAddressHash"),
                    "timestamp": data.get("timestamp"),
                }
                for key in clicks_fields[3:]:
                    row[key] = click.get(key)
                clicks_rows.append(row)

            # Extract mouse moves
            for move in telemetry.get("mouseMoves", []):
                row = {
                    "roundId": data.get("roundId"),
                    "playerAddressHash": data.get("playerAddressHash"),
                    "timestamp": data.get("timestamp"),
                    "x": move.get("x"),
                    "y": move.get("y"),
                    "ts": move.get("ts")
                }
                mouse_rows.append(row)

        except json.JSONDecodeError as e:
            print(f"Skipping invalid JSON line: {e}")

# Write clicks CSV
with open(clicks_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=clicks_fields)
    writer.writeheader()
    writer.writerows(clicks_rows)

# Write mouse movements CSV
with open(mouse_moves_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=mouse_fields)
    writer.writeheader()
    writer.writerows(mouse_rows)

print(f"✅ Extracted {len(clicks_rows)} clicks and {len(mouse_rows)} mouse movements.")
print(f"📄 Saved to {clicks_csv} and {mouse_moves_csv}")
