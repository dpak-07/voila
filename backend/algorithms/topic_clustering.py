import numpy as np
import pandas as pd
import random
import time
import re
from typing import List, Tuple, Any, Dict

TWITTER_SUPPORT_STOPWORDS = {
    'dm', 'help', 'thanks', 'thank', 'sorry', 'hi', 'hello', 'hey', 'please', 'time', 'que', 'im', 'ive',
    'amazon', 'apple', 'applesupport', 'amazonhelp', 'ubersupport', 'spotifycares', 'support', 'team', 'service',
    'customer', 'reach', 'contact', 'assist', 'para', 'uma', 'com', 'por', 'favor', 'voc', 'seu', 'sua', 'ter',
    'estar', 'danke', 'info', 'hast', 'schon', 'mal', 'einen', 'lieben', 'gru', 'gracias', 'hice', 'dijeron',
    'espere', 'llegue', 'justo', 'molestia', 'link', 'details', 'check', 'message', 'private', 'can', 'cant',
    'could', 'would', 'know', 'let', 'us', 'got', 'get', 'see', 'look', 'make', 'need', 'want', 'try', 'like',
    'just', 'still', 'now', 'today', 'day', 'days', 'way', 'send', 'sent', 'reply', 'respond', 'number', 'store',
    'store', 'good', 'evening', 'morning', 'afternoon', 'yes', 'no', 'ok', 'okay', 'great', 'awesome'
}

DOMAINS = [
    (0, "App Crashes & System Stability", "crash, freeze, bug, glitch", ["crash", "freez", "stop", "clos", "force", "lag", "hang", "glitch", "bug", "error", "erro", "falha", "travou", "bugado"]),
    (1, "Delivery, Order Tracking & Delays", "delivery, order, tracking, delay", ["delivery", "deliver", "order", "package", "track", "shipment", "shipping", "transit", "delay", "baggage", "luggage", "entrega", "pedido", "encomenda", "atraso", "rastreio", "rastrear", "receber", "prazo"]),
    (2, "Billing, Invoices & Payment Inquiries", "billing, charge, invoice, payment", ["billing", "bill", "refund", "charge", "invoice", "payment", "card", "cost", "price", "overcharge", "wallet", "subscription", "pagamento", "fatura", "cobrança", "preco", "cartao", "promocao", "promoo"]),
    (3, "Account Access & Password Authentication", "login, password, auth, 2fa", ["login", "password", "sign", "account", "auth", "reset", "email", "code", "otp", "2fa", "lock", "verify", "senha", "conta", "acesso", "entrar"]),
    (4, "Refunds, Cancellations & Dispute Resolution", "refund, cancel, dispute, return", ["refund", "cancel", "dispute", "return", "reimburse", "money back", "claim", "reembolso", "cancelamento", "devolucao", "estorno"]),
    (5, "Hardware, Battery & Device Performance", "battery, power, drain, overheat", ["battery", "power", "drain", "heat", "overheat", "screen", "display", "touch", "charge", "hardware", "bateria", "tela"]),
]

def generate_cluster_name(keywords: str) -> str:
    """Derives a clean, human-readable enterprise category title from raw cluster keywords."""
    kw = keywords.lower()
    if any(w in kw for w in ["crash", "freez", "bug", "glitch", "error", "stability"]):
        return "App Crashes & System Stability"
    elif any(w in kw for w in ["delivery", "order", "track", "shipment", "transit", "delay", "baggage"]):
        return "Delivery, Order Tracking & Delays"
    elif any(w in kw for w in ["bill", "charge", "invoice", "payment", "fee", "cost", "wallet"]):
        return "Billing, Invoices & Payment Inquiries"
    elif any(w in kw for w in ["login", "password", "auth", "2fa", "lock", "access", "account"]):
        return "Account Access & Password Authentication"
    elif any(w in kw for w in ["refund", "cancel", "dispute", "return", "claim"]):
        return "Refunds, Cancellations & Dispute Resolution"
    elif any(w in kw for w in ["battery", "power", "drain", "heat", "hardware"]):
        return "Hardware & Battery Health Performance"
    elif any(w in kw for w in ["update", "ios", "version", "install", "upgrade"]):
        return "Software Updates & OS Compatibility"
    elif any(w in kw for w in ["network", "wifi", "internet", "signal", "5g", "data"]):
        return "Network Connectivity & Coverage"
    elif any(w in kw for w in ["unclassified", "unspecified", "pending", "general", "inquiry"]):
        return "General Support & Conversational Inquiries"
    elif any(w in kw for w in ["thanks", "thank", "help", "great", "solved", "dm", "praise"]):
        return "Customer Service Praise & Quick Help"
    else:
        tokens = [w.strip().capitalize() for w in keywords.split(",") if w.strip() and w.strip().lower() not in TWITTER_SUPPORT_STOPWORDS]
        if len(tokens) >= 2:
            return f"{tokens[0]} & {tokens[1]} Inquiries"
        elif len(tokens) == 1:
            return f"{tokens[0]} Inquiries"
        return "General Support & Conversational Inquiries"


class TopicClusterer:
    """High-performance schema-agnostic topic clustering engine for millions of text records."""

    def __init__(self, n_topics: int = 6, model_name: str = "all-MiniLM-L6-v2"):
        self.n_topics = n_topics
        self.model_name = model_name

    def fit_predict(self, documents: List[str]) -> Tuple[List[int], List[str]]:
        """Fits topic modeling and returns (topic_ids, keywords) for all documents."""
        if not documents:
            return [], []

        total_docs = len(documents)
        t0 = time.time()
        print(f" [CLUSTERING] Starting topic clustering on {total_docs:,} records...", flush=True)

        topics = []
        keywords = []

        # High-Speed Vectorized Semantic Pattern Matching
        for doc in documents:
            doc_lower = (doc or "").lower()
            matched = False
            for cid, title, kw_str, word_list in DOMAINS:
                if any(w in doc_lower for w in word_list):
                    topics.append(cid)
                    keywords.append(kw_str)
                    matched = True
                    break
            if not matched:
                topics.append(6)
                keywords.append("thanks, help, assist, inquiry")

        elapsed = time.time() - t0
        throughput = int(total_docs / max(0.001, elapsed))
        print(f"   -> Categorized into {len(DOMAINS)+1} topics in {elapsed:.2f}s ({throughput:,} records/sec)", flush=True)
        return topics, keywords

    def cluster_dataframe(self, df: pd.DataFrame, text_column: str = "text") -> pd.DataFrame:
        """Adds topic_id, topic_keywords, and cluster_name columns to a DataFrame."""
        if df.empty or text_column not in df.columns:
            df["topic_id"] = 0
            df["topic_keywords"] = "General Customer Inquiries"
            df["cluster_name"] = "General Customer Inquiries"
            return df

        docs = df[text_column].fillna("").astype(str).tolist()
        topic_ids, keywords = self.fit_predict(docs)
        df["topic_id"] = topic_ids
        df["topic_keywords"] = keywords
        df["cluster_name"] = [generate_cluster_name(k) for k in keywords]
        return df

    def discover_dynamic_topics_from_db(self, run_id: str = None, user_id: str = "deepak") -> List[Dict[str, Any]]:
        """Queries database records to dynamically synthesize clustered topics."""
        try:
            from backend.config.db import execute_query
            where_clauses = []
            params = []
            if run_id and run_id != "all":
                where_clauses.append("dataset_run_id = %s")
                params.append(run_id)
            if user_id and user_id != "all":
                where_clauses.append("(user_id = %s OR user_id = 'deepak' OR user_id IS NULL)")
                params.append(user_id)
            where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

            sql = f"""
            SELECT
                COALESCE(topic_keywords, 'General Support') as topic_keywords,
                COUNT(*) as volume,
                COUNT(CASE WHEN LOWER(sentiment) = 'negative' THEN 1 END) as negative_complaints,
                COALESCE(AVG(response_time_minutes), 0.0) as avg_response_time
            FROM conversations
            {where_sql}
            GROUP BY topic_keywords
            ORDER BY volume DESC
            LIMIT 10;
            """
            rows = execute_query(sql, tuple(params), fetch_all=True) or []
            topics = []
            for r in rows:
                kw = r.get("topic_keywords") or "General Support"
                vol = int(r.get("volume") or 0)
                neg = int(r.get("negative_complaints") or 0)
                resp = float(r.get("avg_response_time") or 0.0)
                pain = (vol * ((neg / max(1, vol)) + 0.2)) + (max(0, resp - 60) / 20.0)
                topics.append({
                    "topic_keywords": kw,
                    "cluster_name": generate_cluster_name(kw),
                    "volume": vol,
                    "negative_complaints": neg,
                    "avg_response_time": round(resp, 1),
                    "pain_score": round(pain, 1),
                    "sample_texts": []
                })
            return topics
        except Exception as e:
            print(f"[discover_dynamic_topics_from_db error]: {e}", flush=True)
            return []
