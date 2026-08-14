import numpy as np
import pandas as pd

class SpikeDetector:
    """Detects category volume spikes in time-series data using a high-performance rolling Z-Score."""

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
        Calculates rolling Z-scores and flags spikes on a dataframe using fast vectorized operations.
        Returns a dataframe with added columns: 'rolling_mean', 'rolling_std', 'spike_score', 'spike_detected'
        """
        if df.empty:
            return df

        # Sort by category and date
        df_sorted = df.sort_values([category_col, date_col]).copy()
        
        # Native vectorized rolling grouped by category
        rolled = (
            df_sorted.groupby(category_col)[volume_col]
            .rolling(self.window_size, min_periods=1)
        )
        
        # Calculate shifted rolling mean & std dev to avoid lookahead bias
        df_sorted["rolling_mean"] = (
            df_sorted.groupby(category_col)[volume_col]
            .shift(1)
            .fillna(0.0)
        )
        
        # Fast rolling mean and std
        rolling_mean_series = rolled.mean().shift(1).reset_index(level=0, drop=True)
        rolling_std_series = rolled.std().shift(1).reset_index(level=0, drop=True)

        df_sorted["rolling_mean"] = rolling_mean_series.fillna(0.0)
        df_sorted["rolling_std"] = rolling_std_series.fillna(1.0).replace(0, 1.0)
        
        # Vectorized Z-score
        df_sorted["spike_score"] = (df_sorted[volume_col] - df_sorted["rolling_mean"]) / df_sorted["rolling_std"]
        df_sorted["spike_detected"] = (df_sorted["spike_score"] >= self.z_threshold) & (df_sorted[volume_col] >= 3)
        
        df_sorted["spike_score"] = df_sorted["spike_score"].fillna(0.0)
        df_sorted["spike_detected"] = df_sorted["spike_detected"].fillna(False)

        return df_sorted

