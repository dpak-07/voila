import os
import re
import sys
import warnings
from pathlib import Path
import numpy as np
import pandas as pd

# Suppress pandas/python deprecation warnings
warnings.filterwarnings("ignore")
pd.set_option("future.no_silent_downcasting", True)

# Fallback/Safely handle display for both Jupyter/Colab notebooks and standard Python environments
try:
    from IPython.display import display
except ImportError:
    def display(df):
        print(df)

# BERTopic and SentenceTransformer imports
try:
    from bertopic import BERTopic
    from sentence_transformers import SentenceTransformer
    HAS_BERTOPIC = True
except ImportError:
    HAS_BERTOPIC = False

_LOCAL_MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "models", "all-MiniLM-L6-v2")
_MODEL_NAME = "all-MiniLM-L6-v2"
_embedding_model_instance = None


def _get_embedding_model():
    global _embedding_model_instance
    if _embedding_model_instance is not None:
        return _embedding_model_instance

    device = "cpu"
    try:
        import torch
        if torch.cuda.is_available():
            device = "cuda"
            print(f"[Embedding] GPU detected: {torch.cuda.get_device_name(0)} — using CUDA", flush=True)
        else:
            print("[Embedding] No CUDA GPU — using CPU", flush=True)
    except ImportError:
        print("[Embedding] No CUDA GPU — using CPU", flush=True)

    local_path = os.path.abspath(_LOCAL_MODEL_DIR)
    if os.path.isdir(local_path):
        print(f"[Embedding] Loading model from local path: {local_path}", flush=True)
        _embedding_model_instance = SentenceTransformer(local_path, device=device)
    else:
        print("[Embedding] Loading model from HuggingFace...", flush=True)
        _embedding_model_instance = SentenceTransformer(_MODEL_NAME, device=device)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        _embedding_model_instance.save(local_path)
        print(f"[Embedding] Model saved locally to: {local_path}", flush=True)

    return _embedding_model_instance


# ============================================================
# 1. DATASET CREATION / LOADING
# ============================================================
def generate_sample_data():
    """Generates a realistic sample customer support dataset for testing."""
    sample_data = [
        {
            "tweet_id": 101, "author_id": "cust_1", "inbound": True,
            "created_at": "2026-08-10T10:00:00Z", "text": "@Support My internet connection is completely down and not working!",
            "response_tweet_id": 102, "in_response_to_tweet_id": None,
            "sentiment": "negative", "confidence": 0.95, "priority": "high"
        },
        {
            "tweet_id": 102, "author_id": "agent_1", "inbound": False,
            "created_at": "2026-08-10T10:05:00Z", "text": "@cust_1 We are sorry to hear that. Please restart your router.",
            "response_tweet_id": None, "in_response_to_tweet_id": 101,
            "sentiment": "neutral", "confidence": 0.88, "priority": "normal"
        },
        {
            "tweet_id": 103, "author_id": "cust_1", "inbound": True,
            "created_at": "2026-08-10T10:15:00Z", "text": "@Support Restarted it, but internet is still slow and disconnected!",
            "response_tweet_id": 104, "in_response_to_tweet_id": 102,
            "sentiment": "negative", "confidence": 0.92, "priority": "high"
        },
        {
            "tweet_id": 104, "author_id": "agent_1", "inbound": False,
            "created_at": "2026-08-10T10:20:00Z", "text": "@cust_1 We have dispatched a network technician to inspect your area.",
            "response_tweet_id": None, "in_response_to_tweet_id": 103,
            "sentiment": "positive", "confidence": 0.90, "priority": "normal"
        },
        {
            "tweet_id": 105, "author_id": "cust_2", "inbound": True,
            "created_at": "2026-08-10T11:00:00Z", "text": "@Support I was double charged on my invoice this month! Charged twice!",
            "response_tweet_id": 106, "in_response_to_tweet_id": None,
            "sentiment": "negative", "confidence": 0.98, "priority": "high"
        },
        {
            "tweet_id": 106, "author_id": "agent_2", "inbound": False,
            "created_at": "2026-08-10T11:10:00Z", "text": "@cust_2 Hello, we have initiated a refund for the duplicate charge.",
            "response_tweet_id": None, "in_response_to_tweet_id": 105,
            "sentiment": "positive", "confidence": 0.95, "priority": "normal"
        },
        {
            "tweet_id": 107, "author_id": "cust_3", "inbound": True,
            "created_at": "2026-08-11T09:00:00Z", "text": "@Support Cannot login to my account, password reset link not working.",
            "response_tweet_id": 108, "in_response_to_tweet_id": None,
            "sentiment": "negative", "confidence": 0.85, "priority": "normal"
        },
        {
            "tweet_id": 108, "author_id": "agent_1", "inbound": False,
            "created_at": "2026-08-11T09:12:00Z", "text": "@cust_3 Please check your email inbox for a fresh password reset token.",
            "response_tweet_id": None, "in_response_to_tweet_id": 107,
            "sentiment": "neutral", "confidence": 0.89, "priority": "normal"
        },
        {
            "tweet_id": 109, "author_id": "cust_4", "inbound": True,
            "created_at": "2026-08-11T14:30:00Z", "text": "@Support Mobile data not working 5g connection dropped again.",
            "response_tweet_id": None, "in_response_to_tweet_id": None,
            "sentiment": "negative", "confidence": 0.91, "priority": "high"
        },
        {
            "tweet_id": 110, "author_id": "cust_4", "inbound": True,
            "created_at": "2026-08-11T15:00:00Z", "text": "@Support Still waiting for support regarding my mobile data!",
            "response_tweet_id": None, "in_response_to_tweet_id": 109,
            "sentiment": "negative", "confidence": 0.96, "priority": "high"
        }
    ]
    df_sample = pd.DataFrame(sample_data)
    df_sample.to_csv("sample.csv", index=False)
    print("Generated sample dataset: 'sample.csv'")
    return "sample.csv"


def load_dataset(file_path=None):
    if file_path is None or not os.path.exists(file_path):
        # Look for default paths
        default_paths = [
            "sample.csv",
            r"D:\Downloads(d)\archive (18)\sample.csv",
            "social_media_sample.csv"
        ]
        found_path = None
        for p in default_paths:
            if os.path.exists(p):
                found_path = p
                break
        
        if found_path:
            file_path = found_path
        else:
            print("No input dataset found at specified path. Generating sample dataset...")
            file_path = generate_sample_data()

    path = Path(file_path)

    if path.suffix.lower() == ".csv":
        df = pd.read_csv(file_path)
    elif path.suffix.lower() in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path)
    else:
        raise ValueError("Only CSV and Excel files are supported.")

    print("==========================================")
    print(f"DATASET LOADED FROM: {file_path}")
    print("==========================================")
    print("Shape:", df.shape)
    print("\nColumns:", df.columns.tolist())
    return df


# ============================================================
# 2. MAIN PIPELINE
# ============================================================
def main():
    # Detect file path argument if provided
    file_path = sys.argv[1] if len(sys.argv) > 1 else None
    df = load_dataset(file_path)

    required_columns = [
        "tweet_id", "author_id", "inbound", "created_at", "text",
        "response_tweet_id", "in_response_to_tweet_id", "sentiment",
        "confidence", "priority"
    ]

    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns in dataset: {missing_columns}")

    print("\nAll required columns are present.")

    # Data Type Conversions & Cleaning
    df["tweet_id"] = pd.to_numeric(df["tweet_id"], errors="coerce")
    df["author_id"] = df["author_id"].astype(str)
    
    # Handle inbound boolean mapping
    df["inbound"] = (
        df["inbound"]
        .astype(str)
        .str.lower()
        .map({"true": True, "false": False, "1": True, "0": False})
        .fillna(False)
    )

    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce", utc=True)
    df["text"] = df["text"].fillna("").astype(str)
    df["sentiment"] = df["sentiment"].fillna("unknown").astype(str).str.lower()
    df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce")
    df["priority"] = df["priority"].fillna("unknown").astype(str).str.lower()

    def clean_text(text):
        text = str(text)
        text = re.sub(r"http\S+|www\S+", "", text)
        text = re.sub(r"@\w+", "", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    df["clean_text"] = df["text"].apply(clean_text)
    df = df[df["clean_text"].str.len() > 0].copy()
    df.sort_values("created_at", inplace=True)
    df.reset_index(drop=True, inplace=True)

    print("Rows after cleaning:", len(df))

    # ============================================================
    # 3. CONVERSATION ID MAPPING
    # ============================================================
    df["conversation_id"] = np.nan
    
    # Root customer messages
    for idx, row in df.iterrows():
        parent_id = row["in_response_to_tweet_id"]
        if pd.isna(parent_id) or str(parent_id).strip() == "":
            df.loc[idx, "conversation_id"] = row["tweet_id"]

    conversation_map = {}
    for idx, row in df.iterrows():
        tweet_id = row["tweet_id"]
        parent_id = row["in_response_to_tweet_id"]
        if pd.notna(parent_id) and str(parent_id).strip() != "":
            try:
                parent_id = float(parent_id)
                if parent_id in conversation_map:
                    conversation_map[tweet_id] = conversation_map[parent_id]
                else:
                    conversation_map[tweet_id] = parent_id
            except ValueError:
                pass

    for idx, row in df.iterrows():
        tweet_id = row["tweet_id"]
        if tweet_id in conversation_map:
            df.loc[idx, "conversation_id"] = conversation_map[tweet_id]

    df["conversation_id"] = df["conversation_id"].fillna(df["tweet_id"]).astype(str)

    sentiment_map = {"positive": 1, "neutral": 0, "negative": -1}
    df["sentiment_score"] = df["sentiment"].map(sentiment_map).fillna(0)

    # ============================================================
    # 4. BERTOPIC EMBEDDINGS & CLUSTERING
    # ============================================================
    if HAS_BERTOPIC and len(df) >= 2:
        print("\n==========================================")
        print("RUNNING BERTOPIC & SENTENCE TRANSFORMER")
        print("==========================================")
        try:
            embedding_model = _get_embedding_model()
            embeddings = embedding_model.encode(df["clean_text"].tolist(), show_progress_bar=False)
            topic_model = BERTopic(min_topic_size=max(2, min(5, len(df)//2)), verbose=False)
            topics, probabilities = topic_model.fit_transform(df["clean_text"].tolist(), embeddings)
            df["topic_id"] = topics

            def get_topic_keywords(topic_id, model, n_words=6):
                if topic_id == -1:
                    return "Unclassified"
                words = model.get_topic(topic_id)
                if not words:
                    return "Unknown"
                return ", ".join([word for word, score in words[:n_words]])

            df["topic_keywords"] = df["topic_id"].apply(lambda x: get_topic_keywords(x, topic_model))

            if probabilities is not None:
                df["topic_probability"] = [float(np.max(p)) if hasattr(p, '__iter__') else float(p) for p in probabilities]
            else:
                df["topic_probability"] = np.nan
        except Exception as e:
            print(f"BERTopic execution warning: {e}. Falling back to default topics.")
            df["topic_id"] = -1
            df["topic_keywords"] = "General"
            df["topic_probability"] = np.nan
    else:
        df["topic_id"] = -1
        df["topic_keywords"] = "General"
        df["topic_probability"] = np.nan

    # ============================================================
    # 5. ISSUE CATEGORY & SUBCATEGORY CLASSIFIER
    # ============================================================
    CATEGORY_KEYWORDS = {
        "Network": ["network", "internet", "connection", "connectivity", "signal", "wifi", "disconnect", "disconnected", "outage", "slow"],
        "Billing": ["bill", "billing", "charged", "charge", "invoice", "overcharged", "double charged", "charged twice"],
        "Payment": ["payment", "pay", "paid", "refund", "transaction", "card"],
        "Account": ["account", "profile", "account access"],
        "Login": ["login", "log in", "sign in", "password", "forgot password", "reset password"],
        "Mobile Data": ["mobile data", "data not working", "data connection", "4g", "5g", "data usage"],
        "Calls": ["call", "calling", "phone call", "dropped call", "call drop"],
        "SMS": ["sms", "text message", "messages not sending"],
        "App / Technical": ["app", "application", "crash", "crashing", "error", "bug", "technical", "notification"],
        "Device": ["phone", "mobile", "device", "iphone", "android", "handset"],
        "Plan / Subscription": ["plan", "subscription", "recharge", "package", "upgrade", "downgrade", "renewal"],
        "Customer Service": ["support", "customer service", "agent", "representative", "help", "complaint"]
    }

    def classify_issue(text):
        text = str(text).lower()
        scores = {}
        for category, keywords in CATEGORY_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                if keyword in text:
                    score += 2 if " " in keyword else 1
            scores[category] = score
        best_category = max(scores, key=scores.get)
        return best_category if scores[best_category] > 0 else "Other"

    df["issue_category"] = df["clean_text"].apply(classify_issue)

    SUBCATEGORY_KEYWORDS = {
        "Network": {
            "No Internet": ["not working", "no internet", "internet is down", "stopped working"],
            "Slow Internet": ["slow", "extremely slow"],
            "Connection Drop": ["disconnect", "disconnecting", "dropped"],
            "Network Outage": ["outage", "network down"]
        },
        "Billing": {
            "Duplicate Charge": ["charged twice", "charged two times", "double charged"],
            "Incorrect Bill": ["incorrect bill", "wrong bill", "billing error"],
            "Overcharge": ["overcharged", "extra charge"]
        },
        "Login": {
            "Password Problem": ["password", "reset password"],
            "Login Failure": ["cannot login", "can't login", "unable to login", "cannot access"]
        },
        "Mobile Data": {
            "Data Not Working": ["data not working", "mobile data not working"],
            "Data Speed": ["slow data"]
        }
    }

    def classify_subcategory(text, category):
        text = str(text).lower()
        if category not in SUBCATEGORY_KEYWORDS:
            return "General"
        scores = {}
        for subcategory, keywords in SUBCATEGORY_KEYWORDS[category].items():
            score = sum(1 for kw in keywords if kw in text)
            scores[subcategory] = score
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "General"

    df["issue_subcategory"] = df.apply(lambda r: classify_subcategory(r["clean_text"], r["issue_category"]), axis=1)
    df["customer_pain_point"] = df["issue_category"] + " - " + df["issue_subcategory"]

    # ============================================================
    # 6. ISSUE METRICS & TIME-SERIES ANALYSIS
    # ============================================================
    issue_volume = df.groupby("issue_category").size().rename("issue_volume")
    df = df.merge(issue_volume, on="issue_category", how="left")

    category_sentiment = df.groupby("issue_category")["sentiment_score"].mean().rename("category_sentiment_score")
    df = df.merge(category_sentiment, on="issue_category", how="left")

    df["date"] = df["created_at"].dt.date
    df["hour"] = df["created_at"].dt.hour

    daily_issue = df.groupby(["date", "issue_category"]).size().reset_index(name="daily_volume")
    daily_issue.sort_values(["issue_category", "date"], inplace=True)
    daily_issue["previous_volume"] = daily_issue.groupby("issue_category")["daily_volume"].shift(1)

    daily_issue["issue_growth_rate"] = np.where(
        daily_issue["previous_volume"] > 0,
        ((daily_issue["daily_volume"] - daily_issue["previous_volume"]) / daily_issue["previous_volume"]) * 100,
        np.nan
    )

    daily_issue["rolling_mean"] = daily_issue.groupby("issue_category")["daily_volume"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).mean()
    )
    daily_issue["rolling_std"] = daily_issue.groupby("issue_category")["daily_volume"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).std()
    )

    daily_issue["spike_score"] = (daily_issue["daily_volume"] - daily_issue["rolling_mean"]) / daily_issue["rolling_std"].replace(0, np.nan)
    daily_issue["spike_detected"] = daily_issue["spike_score"] >= 2

    df = df.merge(
        daily_issue[["date", "issue_category", "issue_growth_rate", "spike_score", "spike_detected"]],
        on=["date", "issue_category"], how="left"
    )
    df["spike_detected"] = df["spike_detected"].fillna(False)

    first_issue_date = df.groupby("issue_category")["date"].transform("min")
    df["new_issue"] = df["date"] == first_issue_date
    df["emerging_issue"] = (df["issue_growth_rate"] >= 50) & (df["issue_volume"] >= 2)

    # ============================================================
    # 7. RESPONSE & CONVERSATION METRICS
    # ============================================================
    tweet_time = df.set_index("tweet_id")["created_at"]
    df["response_created_at"] = pd.to_numeric(df["response_tweet_id"], errors="coerce").map(tweet_time)

    df["response_time_minutes"] = np.where(
        (df["inbound"] == True) & df["response_created_at"].notna(),
        (df["response_created_at"] - df["created_at"]).dt.total_seconds() / 60,
        np.nan
    )

    df["response_exists"] = (df["inbound"] == True) & df["response_tweet_id"].notna()
    df["customer_message"] = df["inbound"] == True
    df["agent_message"] = df["inbound"] == False

    # Conversation Aggregations
    conversation_stats = df.groupby("conversation_id").agg(
        conversation_message_count=("tweet_id", "count"),
        customer_message_count=("customer_message", "sum"),
        agent_message_count=("agent_message", "sum"),
        avg_sentiment=("sentiment_score", "mean"),
        negative_message_count=("sentiment", lambda x: (x == "negative").sum()),
        response_count=("response_exists", "sum"),
        avg_response_time_minutes=("response_time_minutes", "mean"),
        high_priority_count=("priority", lambda x: (x == "high").sum())
    ).reset_index()

    conversation_stats["response_rate"] = np.where(
        conversation_stats["customer_message_count"] > 0,
        (conversation_stats["response_count"] / conversation_stats["customer_message_count"]) * 100,
        np.nan
    )

    # Merge conversation stats back into main dataframe
    df = df.merge(conversation_stats, on="conversation_id", how="left")

    customer_issue_count = df[df["customer_message"]].groupby(["author_id", "issue_category"]).size().rename("customer_issue_count")
    df = df.merge(customer_issue_count, on=["author_id", "issue_category"], how="left")
    df["recurring_issue"] = df["customer_issue_count"] > 1

    df["previous_agent_message"] = df.groupby("conversation_id")["agent_message"].transform(lambda x: x.shift(1).fillna(False)).astype(bool)
    df["reopened_proxy"] = df["customer_message"] & df["previous_agent_message"]
    df["recurring_after_solution"] = df["reopened_proxy"] & df["recurring_issue"]

    df["escalation_proxy"] = df["customer_message"] & (df["priority"] == "high") & (df["sentiment"] == "negative") & (df["customer_issue_count"] > 1)

    last_message = df.groupby("conversation_id")["created_at"].transform("max")
    df["is_last_message"] = df["created_at"] == last_message
    df["resolution_proxy"] = df["agent_message"] & df["is_last_message"]

    resolution_by_conv = df.groupby("conversation_id")["resolution_proxy"].any().rename("resolved_proxy")
    escalation_by_conv = df.groupby("conversation_id")["escalation_proxy"].any().rename("escalated_proxy")
    reopen_by_conv = df.groupby("conversation_id")["reopened_proxy"].any().rename("reopened_proxy_conversation")

    df = df.merge(resolution_by_conv, on="conversation_id", how="left")
    df = df.merge(escalation_by_conv, on="conversation_id", how="left")
    df = df.merge(reopen_by_conv, on="conversation_id", how="left")

    # ============================================================
    # 8. GLOBAL KPIS & SUMMARIES
    # ============================================================
    customer_messages = df[df["customer_message"]].copy()
    total_customer_messages = len(customer_messages)
    total_conversations = df["conversation_id"].nunique()
    responded_customers = customer_messages[customer_messages["response_exists"]]
    
    response_rate = (len(responded_customers) / total_customer_messages * 100) if total_customer_messages > 0 else 0
    avg_response_time = customer_messages["response_time_minutes"].dropna().mean()
    if pd.isna(avg_response_time):
        avg_response_time = 0.0

    conv_level = df[["conversation_id", "resolved_proxy", "escalated_proxy", "reopened_proxy_conversation"]].drop_duplicates("conversation_id")
    resolution_rate = conv_level["resolved_proxy"].mean() * 100 if len(conv_level) > 0 else 0
    escalation_rate = conv_level["escalated_proxy"].mean() * 100 if len(conv_level) > 0 else 0
    reopen_rate = conv_level["reopened_proxy_conversation"].mean() * 100 if len(conv_level) > 0 else 0
    avg_sentiment = df["sentiment_score"].mean()

    kpi_df = pd.DataFrame({
        "total_customer_messages": [total_customer_messages],
        "total_conversations": [total_conversations],
        "response_rate": [response_rate],
        "avg_response_time_minutes": [avg_response_time],
        "resolution_rate_proxy": [resolution_rate],
        "escalation_rate_proxy": [escalation_rate],
        "reopen_rate_proxy": [reopen_rate],
        "average_sentiment": [avg_sentiment]
    })

    issue_summary = df[df["customer_message"]].groupby(["issue_category", "issue_subcategory"]).agg(
        issue_volume=("tweet_id", "count"),
        avg_sentiment=("sentiment_score", "mean"),
        avg_confidence=("confidence", "mean"),
        high_priority_volume=("priority", lambda x: (x == "high").sum()),
        new_issue_count=("new_issue", "sum"),
        recurring_issue_count=("recurring_issue", "sum"),
        emerging_issue_count=("emerging_issue", "sum"),
        spike_count=("spike_detected", "sum"),
        avg_response_time=("response_time_minutes", "mean")
    ).reset_index()

    issue_summary["pain_point_rank"] = issue_summary["issue_volume"].rank(ascending=False, method="dense")
    issue_summary["sentiment_impact"] = issue_summary["issue_volume"] * issue_summary["avg_sentiment"]

    # ============================================================
    # 9. OUTPUT GENERATION
    # ============================================================
    final_columns = [
        "tweet_id", "author_id", "inbound", "created_at", "text", "response_tweet_id", "in_response_to_tweet_id",
        "sentiment", "confidence", "priority", "sentiment_score", "conversation_id",
        "topic_id", "topic_keywords", "topic_probability", "issue_category", "issue_subcategory", "customer_pain_point",
        "issue_volume", "issue_growth_rate", "new_issue", "recurring_issue", "recurring_after_solution", "emerging_issue",
        "spike_detected", "spike_score", "response_exists", "response_time_minutes",
        "conversation_message_count", "customer_message_count", "agent_message_count", "avg_sentiment",
        "negative_message_count", "response_count", "response_rate", "avg_response_time_minutes",
        "resolved_proxy", "escalation_proxy", "reopened_proxy", "category_sentiment_score"
    ]

    available_cols = [c for c in final_columns if c in df.columns]
    final_df = df[available_cols].copy()

    # Append Global KPI values directly to every row
    final_df["total_customer_messages"] = total_customer_messages
    final_df["total_conversations"] = total_conversations
    final_df["overall_response_rate"] = response_rate
    final_df["overall_avg_response_time_minutes"] = avg_response_time
    final_df["overall_resolution_rate_proxy"] = resolution_rate
    final_df["overall_escalation_rate_proxy"] = escalation_rate
    final_df["overall_reopen_rate_proxy"] = reopen_rate
    final_df["overall_average_sentiment"] = avg_sentiment

    # Save single consolidated output CSV file
    output_file = "social_media_analytics_output.csv"
    final_df.to_csv(output_file, index=False)

    print("\n==========================================")
    print("PIPELINE COMPLETED SUCCESSFULLY")
    print("==========================================")
    print("Final Dataset Shape:", final_df.shape)
    print("\nGlobal KPIs:")
    for col in kpi_df.columns:
        print(f"  {col}: {kpi_df.iloc[0][col]}")

    print("\nIssue Summary:")
    display(issue_summary.sort_values("issue_volume", ascending=False))

    print("\nSingle Consolidated CSV File Created:")
    print(f"-> {output_file}")


if __name__ == "__main__":
    main()
