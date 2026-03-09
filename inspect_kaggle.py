import kagglehub
import pandas as pd
import os

# Download latest version
path = kagglehub.dataset_download("rovnez/fc-26-fifa-26-player-data")
print("Path:", path)

# Find the csv file in the path
csv_files = [f for f in os.listdir(path) if f.endswith('.csv')]
for csv_file in csv_files:
    print("Found CSV:", csv_file)
    df = pd.read_csv(os.path.join(path, csv_file))
    print("League names:", df['league_name'].dropna().unique()[:30])
    break
