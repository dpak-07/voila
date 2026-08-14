import numpy as np
import pandas as pd

class SpikeDetector:
    """Detects category volume spikes in time-series data using a rolling Z-Score."""

    def __init__(self, window_size: int = 3, z_threshold: float = 2.0):
        self.window_size = window_size
        self.z_threshold = z_threshold

    def detect_spikes(
        self, 
        df: pd.DataFrame, 
        date_col: str, 
        category_col: str, 
        volume_col: str = "daily_volume"
    ) -> pd.DataFrame:
        """
        Calculates rolling Z-scores and flags spikes on a dataframe.
        Returns a dataframe with added columns: 'rolling_mean', 'rolling_std', 'spike_score', 'spike_detected'
        """
        if df.empty:
            return df

        # Group and sort by category and date
        df_sorted = df.sort_values([category_col, date_col]).copy()
        
        # Calculate rolling metrics grouped by category
        grouped = df_sorted.groupby(category_col)[volume_col]
        
        # Shifted rolling mean and std to ensure we evaluate today's spike against historical data
        df_sorted["rolling_mean"] = grouped.transform(
            lambda x: x.shift(1).rolling(self.window_size, min_periods=1).mean()
        )
        df_sorted["rolling_std"] = grouped.transform(
            lambda x: x.shift(1).rolling(self.window_size, min_periods=1).std()
        )
        
        # If std dev is 0 (flat baseline), treat it as 1.0 to prevent division by zero
        df_sorted["rolling_std"] = df_sorted["rolling_std"].replace(0, 1.0)
        
        # Calculate Z-score
        df_sorted["spike_score"] = (df_sorted[volume_col] - df_sorted["rolling_mean"]) / df_sorted["rolling_std"]
        df_sorted["spike_detected"] = df_sorted["spike_score"] >= self.z_threshold
        
        # Fill missing values
        df_sorted["rolling_mean"] = df_sorted["rolling_mean"].fillna(0.0)
        df_sorted["rolling_std"] = df_sorted["rolling_std"].fillna(1.0)
        df_sorted["spike_score"] = df_sorted["spike_score"].fillna(0.0)
        df_sorted["spike_detected"] = df_sorted["spike_detected"].fillna(False)

        return df_sorted
