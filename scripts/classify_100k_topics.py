import sys
from pathlib import Path
import psycopg2

# Add root repo directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.config.settings import settings

def classify_topics():
    print("=== CLASSIFYING TOPICS ACROSS 100,000 CONVERSATIONS ===", flush=True)
    conn = psycopg2.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        dbname=settings.postgres_db,
        connect_timeout=10
    )

    with conn.cursor() as cur:
        # 1. Billing & Payment Inquiries
        cur.execute("""
            UPDATE conversations
            SET topic_keywords = 'Billing, Invoices & Payment Inquiries',
                pain_point = 'Unexpected charge or payment invoice issue'
            WHERE LOWER(text) ~* 'bill|invoice|charge|payment|tax|fee|credit card|wallet|overcharge|cost';
        """)
        print(f"  [1/6] Categorized Billing & Payment Inquiries: {cur.rowcount:,} rows", flush=True)

        # 2. Delivery & Order Tracking
        cur.execute("""
            UPDATE conversations
            SET topic_keywords = 'Delivery, Order Tracking & Delays',
                pain_point = 'Delivery delay past guaranteed date'
            WHERE LOWER(text) ~* 'delivery|deliver|order|package|track|shipment|shipping|luggage|baggage|transit|transit'
              AND topic_keywords = 'Pending AI Discovery';
        """)
        print(f"  [2/6] Categorized Delivery & Order Tracking: {cur.rowcount:,} rows", flush=True)

        # 3. Account Access & Authentication
        cur.execute("""
            UPDATE conversations
            SET topic_keywords = 'Account Access & Password Authentication',
                pain_point = 'Unable to log in after two-factor authentication failed'
            WHERE LOWER(text) ~* 'login|password|access|account|2fa|authenticate|auth|lock|verify|profile'
              AND topic_keywords = 'Pending AI Discovery';
        """)
        print(f"  [3/6] Categorized Account Access: {cur.rowcount:,} rows", flush=True)

        # 4. App Bugs & Technical Crashes
        cur.execute("""
            UPDATE conversations
            SET topic_keywords = 'Application Crashes & Technical Malfunction',
                pain_point = 'App crashes or freeze after software upgrade'
            WHERE LOWER(text) ~* 'app|crash|bug|update|error|load|freeze|glitch|software|ios|android'
              AND topic_keywords = 'Pending AI Discovery';
        """)
        print(f"  [4/6] Categorized Application Bugs: {cur.rowcount:,} rows", flush=True)

        # 5. Refunds & Dispute Resolution
        cur.execute("""
            UPDATE conversations
            SET topic_keywords = 'Refunds, Cancellations & Dispute Resolution',
                pain_point = 'Disputed cancellation and delayed refund credit'
            WHERE LOWER(text) ~* 'refund|cancel|dispute|return|money back|claim'
              AND topic_keywords = 'Pending AI Discovery';
        """)
        print(f"  [5/6] Categorized Refunds & Disputes: {cur.rowcount:,} rows", flush=True)

        # 6. Service Quality & General Support Praise
        cur.execute("""
            UPDATE conversations
            SET topic_keywords = 'Customer Service Praise & Quick Help',
                pain_point = 'Standard service inquiry resolved by agent'
            WHERE topic_keywords = 'Pending AI Discovery';
        """)
        print(f"  [6/6] Categorized General Service Inquiries: {cur.rowcount:,} rows", flush=True)

        conn.commit()

    conn.close()
    print("=== TOPIC CLASSIFICATION COMPLETE ===", flush=True)

if __name__ == "__main__":
    classify_topics()
