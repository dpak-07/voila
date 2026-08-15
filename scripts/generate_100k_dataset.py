import sys
import os
import random
from pathlib import Path
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import execute_values

# Add root repo directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.config.settings import settings

BRANDS = [
    ("AppleSupport", ["iPhone", "MacBook", "iOS Update", "iCloud Storage", "Apple Music"]),
    ("UberSupport", ["Ride Booking", "Driver Matching", "UberEats Delivery", "Payment Wallet"]),
    ("AmazonHelp", ["Prime Delivery", "Order Tracking", "Refund Processing", "Echo Device"]),
    ("SpotifyCares", ["Audio Streaming", "Premium Plan", "Offline Playlist", "Family Account"]),
    ("Delta", ["Flight Booking", "Baggage Claim", "Seat Selection", "SkyMiles Points"]),
    ("Netflixhelps", ["Video Streaming", "4K Playback", "Subscription Billing", "Profile Security"]),
    ("NikeSupport", ["Shoe Sizing", "Order Shipment", "Return Label", "SNKRS App"])
]

REGIONS = [
    "US-East", "US-West", "EMEA-UK", "EMEA-Germany", "APAC-India", "APAC-Singapore", "LATAM-Brazil"
]

TOPICS = [
    ("Billing, Invoices & Payment Inquiries", "negative", "high", "Unexpected subscription renewal charge and incorrect invoice tax."),
    ("Delivery, Order Tracking & Delays", "negative", "urgent", "Package delivery is delayed past the guaranteed date with no tracking updates."),
    ("Account Access & Password Authentication", "negative", "urgent", "Unable to log in after two-factor authentication failed on mobile device."),
    ("Application Crashes & Technical Malfunction", "negative", "high", "App crashes immediately upon launching after the latest firmware upgrade."),
    ("Refunds, Cancellations & Dispute Resolution", "negative", "urgent", "Requested an order cancellation but was still billed full amount."),
    ("General Inquiries & Product Guidance", "neutral", "normal", "Checking product specifications, compatibility, and user manual."),
    ("Positive Feedback & Service Praise", "positive", "low", "Fast resolution by support team and excellent customer care experience!"),
    ("Feature Requests & Product Enhancements", "neutral", "normal", "Requesting dark mode support and offline download capabilities.")
]

CUSTOMER_TEMPLATES = [
    "Hey @{brand}, my {product} has an issue: {issue}",
    "Need urgent help from @{brand} support regarding {product} in {region}. {issue}",
    "Can someone at @{brand} assist me with {product}? {issue}",
    "Disappointed with @{brand} service today. {issue} Please fix this ASAP.",
    "Quick question for @{brand} team about {product}: {issue}",
    "Thanks @{brand} for resolving my {product} query so quickly! Much appreciated."
]

AGENT_TEMPLATES = [
    "Hi there, thanks for reaching out. We are actively investigating your issue with {product} and will resolve it right away.",
    "Hello! We apologize for the trouble with {product}. We have credited your account and sent a confirmation email.",
    "Thanks for contacting @{brand} support. Your ticket has been prioritized with Tier-2 support team.",
    "We appreciate your patience! The issue regarding {product} has now been resolved. Please let us know if you need anything else."
]

def generate_100k_records(total_records=100000, run_id="benchmark_100k_run"):
    print(f"=== GENERATING {total_records:,} REALISTIC RECORDS FOR RUN: {run_id} ===", flush=True)

    start_date = datetime(2017, 1, 1, 0, 0, 0)
    end_date = datetime(2024, 12, 31, 23, 59, 59)
    total_seconds = int((end_date - start_date).total_seconds())

    conn = psycopg2.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        dbname=settings.postgres_db,
        connect_timeout=10
    )

    batch_size = 10000
    rows = []
    
    # 1. Register Dataset Run Catalog
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO dataset_runs (run_id, user_id, uploaded_at, total_records, source_name, status)
            VALUES (%s, %s, CURRENT_TIMESTAMP, %s, %s, %s)
            ON CONFLICT (run_id) DO UPDATE SET total_records = EXCLUDED.total_records, status = 'ready';
        """, (run_id, "deepak", total_records, "Multi-Year 100K Benchmark Dataset", "ready"))
        conn.commit()

    print("  [1/3] Dataset run metadata registered.", flush=True)

    inserted_count = 0
    conv_seq = 1000000

    for i in range(1, total_records + 1):
        brand_info = random.choice(BRANDS)
        brand = brand_info[0]
        product = random.choice(brand_info[1])
        region = random.choice(REGIONS)
        topic_info = random.choices(
            TOPICS,
            weights=[25, 22, 18, 15, 12, 5, 2, 1], # Heavy realistic negative friction distribution
            k=1
        )[0]
        
        topic_name, sentiment, priority, issue_desc = topic_info
        
        # Random timestamp between 2017 and 2024
        random_sec = random.randint(0, total_seconds)
        msg_date = start_date + timedelta(seconds=random_sec)
        
        is_inbound = random.random() < 0.70 # 70% customer inbound, 30% agent outbound replies
        author_id = f"user_{random.randint(1000, 99999)}" if is_inbound else f"{brand}_agent"
        
        if is_inbound:
            text = random.choice(CUSTOMER_TEMPLATES).format(brand=brand, product=product, region=region, issue=issue_desc)
            resp_time = round(random.lognormvariate(3.2, 0.8), 1) # Mean ~35-65 mins with realistic tail
            resp_time = min(resp_time, 1440.0) # Cap at 24 hours
        else:
            text = random.choice(AGENT_TEMPLATES).format(brand=brand, product=product)
            resp_time = round(random.uniform(5.0, 45.0), 1)
            sentiment = "positive" if random.random() < 0.6 else "neutral"

        clean_text = text.replace("@", "").replace("#", "").strip()
        confidence = round(random.uniform(0.85, 0.99), 2)
        score = -0.75 if sentiment == "negative" else (0.75 if sentiment == "positive" else 0.0)
        
        is_resolved = (sentiment == "positive") or (random.random() < 0.25)
        is_reopened = is_inbound and (random.random() < 0.42)
        is_escalated = (priority == "urgent") and (random.random() < 0.35)

        conv_id = f"CONV_{conv_seq + (i // 2)}"

        rows.append((
            i, # tweet_id
            run_id,
            "deepak",
            author_id,
            is_inbound,
            msg_date,
            msg_date.date(),
            text,
            clean_text,
            sentiment,
            score,
            confidence,
            priority,
            conv_id,
            1, # topic_id
            topic_name,
            resp_time > 120.0, # spike_detected
            resp_time,
            brand,
            brand,
            product,
            region,
            "Customer Support",
            issue_desc,
            topic_name,
            "resolved" if is_resolved else "in_progress",
            not is_reopened,
            is_escalated,
            is_reopened,
            is_resolved
        ))

        if len(rows) >= batch_size:
            with conn.cursor() as cur:
                execute_values(cur, """
                    INSERT INTO conversations (
                        tweet_id, dataset_run_id, user_id, author_id, inbound,
                        created_at, date, text, clean_text, sentiment, sentiment_score,
                        confidence, priority, conversation_id, topic_id, topic_keywords,
                        spike_detected, response_time_minutes, brand, company, product,
                        region, intent, pain_point, issue_type, resolution_status,
                        fcr, escalated, reopened, resolution_flag
                    ) VALUES %s;
                """, rows)
                conn.commit()
            inserted_count += len(rows)
            print(f"  [2/3] Inserted batch: {inserted_count:,} / {total_records:,} records...", flush=True)
            rows = []

    if rows:
        with conn.cursor() as cur:
            execute_values(cur, """
                INSERT INTO conversations (
                    tweet_id, dataset_run_id, user_id, author_id, inbound,
                    created_at, date, text, clean_text, sentiment, sentiment_score,
                    confidence, priority, conversation_id, topic_id, topic_keywords,
                    spike_detected, response_time_minutes, brand, company, product,
                    region, intent, pain_point, issue_type, resolution_status,
                    fcr, escalated, reopened, resolution_flag
                ) VALUES %s;
            """, rows)
            conn.commit()
        inserted_count += len(rows)

    conn.close()
    print(f"  [3/3] Successfully inserted {inserted_count:,} records into PostgreSQL!", flush=True)
    print("=== 100K DATASET BENCHMARK SEED COMPLETE ===", flush=True)

if __name__ == "__main__":
    generate_100k_records(100000)
