import numpy as np
import pandas as pd
import random
import time
from typing import List, Tuple, Any

def generate_cluster_name(keywords: str) -> str:
    """Derives a clean, human-readable enterprise category title from raw cluster keywords."""
    kw = keywords.lower()
    if any(w in kw for w in ["battery", "power", "drain", "iphone", "overheat", "life"]):
        return "Battery Health & Hardware Performance"
    elif any(w in kw for w in ["update", "ios", "version", "install", "upgrade", "latest", "bug"]):
        return "Software Updates & OS Compatibility"
    elif any(w in kw for w in ["dm", "thanks", "thank", "help", "happy", "great", "glad", "solved"]):
        return "Customer Service Praise & Quick Help"
    elif any(w in kw for w in ["login", "password", "sign in", "account", "auth", "reset"]):
        return "Account Access & Authentication"
    elif any(w in kw for w in ["billing", "refund", "charge", "money", "cost", "invoice", "double"]):
        return "Billing, Invoices & Payment Inquiries"
    elif any(w in kw for w in ["crash", "freez", "stop", "clos", "force"]):
        return "App Crashes & System Stability"
    elif any(w in kw for w in ["keyboard", "typing", "gt", "logging", "screen", "display", "touch"]):
        return "UI Controls & Interaction Glitches"
    elif any(w in kw for w in ["hope", "solution", "sorry", "sure", "assist", "check"]):
        return "Technical Support & Troubleshooting"
    elif any(w in kw for w in ["network", "wifi", "internet", "signal", "5g", "data", "slow", "disconnect"]):
        return "Network Connectivity & Coverage"
    else:
        tokens = [w.strip().capitalize() for w in keywords.split(",") if w.strip()]
        if len(tokens) >= 2:
            return f"{tokens[0]} & {tokens[1]} Inquiries"
        elif len(tokens) == 1:
            return f"{tokens[0]} Inquiries"
        return "General Customer Inquiries"

class TopicClusterer:
    """High-performance schema-agnostic topic clustering engine for millions of text records."""

    def __init__(self, n_topics: int = 5, model_name: str = "all-MiniLM-L6-v2"):
        self.n_topics = n_topics
        self.model_name = model_name

    def fit_predict(self, documents: List[str]) -> Tuple[List[int], List[str]]:
        """Fits topic modeling and returns (topic_ids, keywords) for all documents."""
        if not documents:
            return [], []

        total_docs = len(documents)
        t0 = time.time()
        print(f" [CLUSTERING] Starting topic clustering on {total_docs:,} records...")

        # If small dataset, try BERTopic
        if total_docs <= 2000:
            try:
                from bertopic import BERTopic
                from sentence_transformers import SentenceTransformer
                
                embedding_model = SentenceTransformer(self.model_name)
                embeddings = embedding_model.encode(documents, show_progress_bar=False)
                
                topic_model = BERTopic(min_topic_size=max(2, min(5, total_docs//2)), verbose=False)
                topics, _ = topic_model.fit_transform(documents, embeddings)
                
                keywords = []
                for t_id in topics:
                    if t_id == -1:
                        keywords.append("General, support, inquiry, help")
                    else:
                        words = topic_model.get_topic(t_id)
                        keywords.append(", ".join([w[0] for w in words[:4]]) if words else "General")
                print(f"   -> BERTopic fitted in {time.time()-t0:.2f}s")
                return topics, keywords
            except Exception:
                pass

        # High-Speed Sampled TF-IDF + KMeans for large datasets (> 2000 documents)
        return self._fast_sampled_kmeans(documents)

    def _fast_sampled_kmeans(self, documents: List[str]) -> Tuple[List[int], List[str]]:
        """High-speed TF-IDF + KMeans clustering with vectorized projection across millions of rows."""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.cluster import MiniBatchKMeans
            t0 = time.time()
            
            sample_size = min(15000, len(documents))
            sampled_docs = random.sample(documents, sample_size) if len(documents) > sample_size else documents
            
            n_clusters = min(self.n_topics, len(documents))
            n_clusters = max(1, n_clusters)
            
            vectorizer = TfidfVectorizer(max_features=400, stop_words='english')
            vectorizer.fit(sampled_docs)
            
            X_sample = vectorizer.transform(sampled_docs)
            kmeans = MiniBatchKMeans(n_clusters=n_clusters, random_state=42, batch_size=4096, n_init=3)
            kmeans.fit(X_sample)
            
            feature_names = vectorizer.get_feature_names_out()
            cluster_centers = kmeans.cluster_centers_
            
            keywords_by_cluster = {}
            for i in range(n_clusters):
                top_indices = np.argsort(cluster_centers[i])[::-1][:4]
                keywords_by_cluster[i] = ", ".join([feature_names[idx] for idx in top_indices])

            # Project across dataset in high-speed batches
            topics = []
            keywords = []
            chunk_size = 250000
            for i in range(0, len(documents), chunk_size):
                chunk = documents[i : i + chunk_size]
                X_chunk = vectorizer.transform(chunk)
                chunk_topics = kmeans.predict(X_chunk).tolist()
                topics.extend(chunk_topics)
                keywords.extend([keywords_by_cluster.get(t, "General") for t in chunk_topics])

            elapsed = time.time() - t0
            throughput = int(len(documents) / elapsed) if elapsed > 0 else len(documents)
            print(f"   -> Formed {n_clusters} clusters in {elapsed:.2f}s ({throughput:,} records/sec)")
            return topics, keywords
        except Exception as e:
            print(f"Clustering fallback warning: {e}")
            return [0] * len(documents), ["General"] * len(documents)

