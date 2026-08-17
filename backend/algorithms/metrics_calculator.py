import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from backend.agentic_service.schemas.confidence import DataConfidence


class MetricsCalculator:
    """Calculates dynamic, non-fixed service operations and virality metrics based on input dataset columns."""

    def __init__(self, column_mapping: Dict[str, str] = None):
        self.map = {
            "tweet_id": "tweet_id",
            "author_id": "author_id",
            "inbound": "inbound",
            "created_at": "created_at",
            "text": "text",
            "response_tweet_id": "response_tweet_id",
            "in_response_to_tweet_id": "in_response_to_tweet_id",
            "priority": "priority",
            "sentiment": "sentiment",
        }
        if column_mapping:
            self.map.update(column_mapping)

    def calculate_response_times(self, df: pd.DataFrame) -> pd.Series:
        """Calculates response time in minutes for each inbound message using true vectorized timestamp differences."""
        if df.empty:
            return pd.Series(dtype=float)

        tweet_id = self.map.get("tweet_id", "tweet_id")
        inbound = self.map.get("inbound", "inbound")
        created_at = self.map.get("created_at", "created_at")
        resp_id = self.map.get("response_tweet_id", "response_tweet_id")
        
        if tweet_id not in df.columns or created_at not in df.columns or resp_id not in df.columns:
            return pd.Series(np.nan, index=df.index)

        df_temp = df.copy()
        created_dt = pd.to_datetime(df_temp[created_at], errors="coerce", utc=True)
        
        numeric_ids = pd.to_numeric(df_temp[tweet_id], errors="coerce")
        df_lookup = pd.DataFrame({"dt": created_dt, "id": numeric_ids}).dropna().drop_duplicates(subset=["id"], keep="first")
        time_lookup = df_lookup.set_index("id")["dt"]

        first_resp_id = pd.to_numeric(
            df_temp[resp_id].astype(str).str.split(",").str[0].str.strip(),
            errors="coerce"
        )
        resp_created = first_resp_id.map(time_lookup)
        
        inbound_mask = (df_temp[inbound] == True) if inbound in df_temp.columns else pd.Series(True, index=df.index)
        diff_minutes = (resp_created - created_dt).dt.total_seconds() / 60.0
        
        # Valid response times must be positive / non-negative differences between inbound and response
        response_times = np.where(
            inbound_mask & resp_created.notna() & (diff_minutes >= 0),
            diff_minutes,
            np.nan
        )
        return pd.Series(response_times, index=df.index)

    def calculate_conversation_metrics(self, df: pd.DataFrame, conversation_id_col: str = "conversation_id") -> pd.DataFrame:
        """Aggregates conversation statistics to calculate Resolution, Reopen, and Escalation rates using true grouping."""
        if df.empty:
            return pd.DataFrame(columns=[
                "messages_count", "customer_messages_count", "agent_messages_count",
                "reopened", "resolved", "escalated"
            ])

        inbound = self.map.get("inbound", "inbound")
        priority = self.map.get("priority", "priority")
        sentiment = self.map.get("sentiment", "sentiment")
        created_at = self.map.get("created_at", "created_at")
        tweet_id = self.map.get("tweet_id", "tweet_id")
        
        df_temp = df.copy()
        df_temp["customer_msg"] = (df_temp[inbound] == True) if inbound in df_temp.columns else pd.Series(True, index=df.index)
        df_temp["agent_msg"] = (df_temp[inbound] == False) if inbound in df_temp.columns else pd.Series(False, index=df.index)
        
        prio_col = priority if priority in df_temp.columns else "priority"
        sent_col = sentiment if sentiment in df_temp.columns else "sentiment"
        prio_high = (df_temp[prio_col].astype(str).str.lower().isin(["high", "urgent", "critical"])) if prio_col in df_temp.columns else pd.Series(False, index=df.index)
        sent_neg = (df_temp[sent_col].astype(str).str.lower() == "negative") if sent_col in df_temp.columns else pd.Series(False, index=df.index)
        df_temp["is_escalated"] = df_temp["customer_msg"] & (prio_high | sent_neg)

        group_col = conversation_id_col if conversation_id_col in df_temp.columns else (tweet_id if tweet_id in df_temp.columns else None)
        
        if group_col and group_col in df_temp.columns:
            sort_cols = [group_col]
            if created_at in df_temp.columns:
                sort_cols.append(created_at)
            df_temp = df_temp.sort_values(by=sort_cols)
            
            same_conv_prev = df_temp[group_col] == df_temp[group_col].shift(1)
            prev_agent_msg = df_temp["agent_msg"].shift(1).fillna(0).astype(bool) & same_conv_prev
            df_temp["is_reopened"] = df_temp["customer_msg"] & prev_agent_msg
            
            same_conv_next = df_temp[group_col] == df_temp[group_col].shift(-1)
            df_temp["is_last_in_conv"] = ~same_conv_next
            df_temp["is_resolved"] = df_temp["agent_msg"] & df_temp["is_last_in_conv"]
            
            conv_stats = df_temp.groupby(group_col, sort=False).agg(
                messages_count=(df_temp.columns[0], "count"),
                customer_messages_count=("customer_msg", "sum"),
                agent_messages_count=("agent_msg", "sum"),
                reopened=("is_reopened", "any"),
                resolved=("is_resolved", "any"),
                escalated=("is_escalated", "any")
            ).reset_index()
            return conv_stats

        # When no conversation grouping column exists, aggregate across individual message records
        return pd.DataFrame({
            "messages_count": [len(df_temp)],
            "customer_messages_count": [int(df_temp["customer_msg"].sum())],
            "agent_messages_count": [int(df_temp["agent_msg"].sum())],
            "reopened": [False],
            "resolved": [bool(df_temp["agent_msg"].any())],
            "escalated": [bool(df_temp["is_escalated"].any())]
        })

    def calculate_impression_and_virality_metrics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculates dynamic impression-weighted sentiment and negative sentiment share without fabricated multipliers."""
        if df.empty:
            return {}

        metrics = {}
        impression_cols = [c for c in df.columns if c.lower() in ["impressions", "views", "retweet_count", "followers_count", "likes", "reach"]]
        weight_col = impression_cols[0] if impression_cols else None
        
        if "sentiment_score" in df.columns:
            if weight_col and weight_col in df.columns:
                weights = pd.to_numeric(df[weight_col], errors="coerce").fillna(1.0)
                weighted_sentiment = (df["sentiment_score"] * weights).sum() / weights.sum() if weights.sum() > 0 else df["sentiment_score"].mean()
                metrics["impression_weighted_sentiment"] = float(weighted_sentiment)
                metrics["impression_weight_column_used"] = weight_col
            else:
                metrics["impression_weighted_sentiment"] = float(df["sentiment_score"].mean())

        if "sentiment" in df.columns:
            neg_mask = df["sentiment"].astype(str).str.lower() == "negative"
            total = len(df)
            neg_volume = int(neg_mask.sum())
            metrics["negative_sentiment_percentage"] = float((neg_volume / total) * 100.0) if total > 0 else 0.0
            metrics["negative_sentiment_volume"] = neg_volume

        return metrics

    def calculate_all_dynamic_metrics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Dynamically calculates operational, virality, and category breakdown metrics for any dataset."""
        from backend.agentic_service.schemas.confidence import PROXY_METHODOLOGY

        if df.empty:
            return {
                "status": "no_data_available",
                "data_status": DataConfidence.NO_DATA_AVAILABLE.value,
                "total_records": 0,
                "total_conversations": 0,
                "metric_confidence": {},
                "proxy_methodology": PROXY_METHODOLOGY,
            }

        dynamic_output = {
            "status": "success",
            "data_status": DataConfidence.MEASURED.value,
            "metric_confidence": {},
            "proxy_methodology": PROXY_METHODOLOGY,
        }
        conv_stats = self.calculate_conversation_metrics(df)
        total_conv = len(conv_stats)
        dynamic_output["total_records"] = len(df)
        dynamic_output["total_conversations"] = int(total_conv)

        # Proxies derived from conversational state machine
        dynamic_output["resolution_rate"] = float(conv_stats["resolved"].mean() * 100.0) if total_conv > 0 else 0.0
        dynamic_output["metric_confidence"]["resolution_rate"] = DataConfidence.PROXY.value

        dynamic_output["escalation_rate"] = float(conv_stats["escalated"].mean() * 100.0) if total_conv > 0 else 0.0
        dynamic_output["metric_confidence"]["escalation_rate"] = DataConfidence.PROXY.value

        dynamic_output["reopen_rate"] = float(conv_stats["reopened"].mean() * 100.0) if total_conv > 0 else 0.0
        dynamic_output["metric_confidence"]["reopen_rate"] = DataConfidence.PROXY.value

        # Direct measured response time calculation
        if "response_time_minutes" in df.columns and not df["response_time_minutes"].dropna().empty:
            dynamic_output["avg_response_time_minutes"] = float(df["response_time_minutes"].dropna().mean())
            dynamic_output["metric_confidence"]["avg_response_time_minutes"] = DataConfidence.MEASURED.value
        else:
            calc_resp = self.calculate_response_times(df)
            valid_resp = calc_resp.dropna()
            if not valid_resp.empty:
                dynamic_output["avg_response_time_minutes"] = float(valid_resp.mean())
                dynamic_output["metric_confidence"]["avg_response_time_minutes"] = DataConfidence.MEASURED.value
            else:
                dynamic_output["avg_response_time_minutes"] = None
                dynamic_output["metric_confidence"]["avg_response_time_minutes"] = DataConfidence.NO_DATA_AVAILABLE.value

        # CSAT Proxy based on sentiment distribution
        if "sentiment" in df.columns:
            sents = df["sentiment"].astype(str).str.lower()
            pos = int((sents == "positive").sum())
            neu = int((sents == "neutral").sum())
            total_sents = len(df)
            if total_sents > 0:
                csat_val = ((pos + (0.5 * neu)) / total_sents) * 100.0
                dynamic_output["csat_proxy"] = round(float(csat_val), 1)
                dynamic_output["metric_confidence"]["csat_proxy"] = DataConfidence.PROXY.value
            else:
                dynamic_output["csat_proxy"] = None
                dynamic_output["metric_confidence"]["csat_proxy"] = DataConfidence.NO_DATA_AVAILABLE.value
        else:
            dynamic_output["csat_proxy"] = None
            dynamic_output["metric_confidence"]["csat_proxy"] = DataConfidence.NO_DATA_AVAILABLE.value

        virality = self.calculate_impression_and_virality_metrics(df)
        dynamic_output.update(virality)

        cat_cols = [
            c for c in df.columns 
            if df[c].dtype == "object" or str(df[c].dtype).startswith("category")
        ]
        
        category_breakdowns = {}
        for col in cat_cols:
            if col in ["text", "clean_text", "_id", "ingested_at"]:
                continue
            if df[col].nunique() <= 50:
                top_cats = df[col].value_counts().head(10).to_dict()
                category_breakdowns[col] = top_cats

        dynamic_output["category_breakdowns"] = category_breakdowns

        return dynamic_output

