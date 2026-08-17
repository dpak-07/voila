# voila
AI-Powered Social Support Analytics &amp; Voice-of-Customer Intelligence Platform  The proposed solution is an AI-powered analytics platform that transforms large volumes of raw social-media customer-support conversations into actionable Voice-of-Customer insights. The system reconstructs customer-support conversations and uses NLP/ML models 

## Getting Started

This repository includes a React + Vite frontend, a FastAPI backend, high-performance PostgreSQL and Snowflake data layers, and automated NLP ingestion pipelines.

### Backend

1. Install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Start the backend server:
   ```bash
   uvicorn backend.app:app --reload --port 8000
   ```
3. The API will be available at `http://127.0.0.1:8000` (API Docs at `http://127.0.0.1:8000/docs`)

### Frontend

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the React development server:
   ```bash
   npm run dev
   ```
3. Open the app in the browser at `http://127.0.0.1:5173`

---

## Database Queries: Record Counting & Inspection

Use these SQL queries to verify, count, and inspect ingested data in both **PostgreSQL (Local SQL Database)** and **Snowflake (Cloud Data Warehouse)**.

### 1. PostgreSQL (SQL Primary Database)

#### A. Quick Global Table Row Counts
```sql
SELECT 'conversations (raw)' AS table_name, COUNT(*) AS row_count FROM conversations
UNION ALL
SELECT 'processed_conversations (indexed)', COUNT(*) FROM processed_conversations
UNION ALL
SELECT 'dataset_runs (batches)', COUNT(*) FROM dataset_runs
UNION ALL
SELECT 'dataset_kpis (summaries)', COUNT(*) FROM dataset_kpis
UNION ALL
SELECT 'pipeline_status', COUNT(*) FROM pipeline_status;
```

#### B. Detailed Record Counts in Processed Conversations
```sql
-- Total ingested customer conversations
SELECT COUNT(*) AS total_processed_conversations FROM processed_conversations;
```

#### C. Ingestion Runs & Upload Batches History
```sql
SELECT 
    run_id, 
    total_records, 
    status, 
    user_id, 
    created_at 
FROM dataset_runs 
ORDER BY created_at DESC;
```

#### D. Breakdown by Company / Support Handle
```sql
SELECT 
    company, 
    COUNT(*) AS total_tickets,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS share_pct,
    ROUND(AVG(response_time_minutes), 1) AS avg_response_min,
    ROUND(100.0 * COUNT(*) FILTER (WHERE sentiment = 'negative') / COUNT(*), 1) AS negative_friction_pct
FROM processed_conversations 
GROUP BY company 
ORDER BY total_tickets DESC;
```

#### E. Breakdown by Geographic Region (including India)
```sql
SELECT 
    region, 
    COUNT(*) AS total_tickets,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS regional_share_pct
FROM processed_conversations 
GROUP BY region 
ORDER BY total_tickets DESC;
```

#### F. Breakdown by Product
```sql
SELECT 
    company,
    product, 
    COUNT(*) AS volume 
FROM processed_conversations 
WHERE product IS NOT NULL AND product != ''
GROUP BY company, product 
ORDER BY volume DESC 
LIMIT 20;
```

#### G. Breakdown by Topic & Failure Cluster
```sql
SELECT 
    topic_keywords, 
    COUNT(*) AS ticket_volume,
    COUNT(*) FILTER (WHERE sentiment = 'negative') AS negative_tickets,
    ROUND(AVG(response_time_minutes), 1) AS avg_sla_min
FROM processed_conversations 
GROUP BY topic_keywords 
ORDER BY ticket_volume DESC;
```

#### H. Full Database Cleanup / Truncate (Reset to 0)
```sql
TRUNCATE TABLE 
    conversations, 
    processed_conversations, 
    dataset_kpis, 
    dataset_runs, 
    pipeline_status, 
    pipeline_history 
CASCADE;
```

---

### 2. Snowflake (Cloud Data Warehouse)

#### A. Total Record Counts in Snowflake
```sql
-- Total raw social media metrics
SELECT COUNT(*) AS total_snowflake_records 
FROM SOCIAL_ANALYTICS.PUBLIC.SOCIAL_MEDIA_METRICS;

-- Total processed records
SELECT COUNT(*) AS total_processed_snowflake_records 
FROM SOCIAL_ANALYTICS.PUBLIC.PROCESSED_SOCIAL_MEDIA_METRICS;
```

#### B. Company & Regional Distribution in Snowflake
```sql
SELECT 
    COMPANY, 
    REGION, 
    COUNT(*) AS TOTAL_CONVERSATIONS,
    ROUND(AVG(RESPONSE_TIME_MINUTES), 1) AS MEAN_RESPONSE_MIN
FROM SOCIAL_ANALYTICS.PUBLIC.SOCIAL_MEDIA_METRICS 
GROUP BY COMPANY, REGION 
ORDER BY TOTAL_CONVERSATIONS DESC;
```

#### C. Snowflake KPI Summaries
```sql
SELECT 
    RUN_ID, 
    TOTAL_RECORDS, 
    CREATED_AT 
FROM SOCIAL_ANALYTICS.PUBLIC.KPI_SUMMARY 
ORDER BY CREATED_AT DESC;
```

#### D. Truncate Snowflake Tables
```sql
TRUNCATE TABLE IF EXISTS SOCIAL_ANALYTICS.PUBLIC.SOCIAL_MEDIA_METRICS;
TRUNCATE TABLE IF EXISTS SOCIAL_ANALYTICS.PUBLIC.PROCESSED_SOCIAL_MEDIA_METRICS;
TRUNCATE TABLE IF EXISTS SOCIAL_ANALYTICS.PUBLIC.KPI_SUMMARY;
TRUNCATE TABLE IF EXISTS SOCIAL_ANALYTICS.PUBLIC.KPI_PAYLOADS;
```

---

### 3. One-Line CLI Inspection Scripts

Run these from the project root in terminal / PowerShell:

- **Check PostgreSQL row counts**:
  ```bash
  python -c "from backend.config.db import execute_query; print(execute_query('SELECT COUNT(*) FROM processed_conversations', fetch_one=True))"
  ```

- **Clean and truncate all tables & caches**:
  ```bash
  python -c "from backend.config.db import execute_query; execute_query('TRUNCATE TABLE conversations, processed_conversations, dataset_kpis, dataset_runs, pipeline_status, pipeline_history CASCADE;', commit=True); print('All SQL tables truncated.')"
  ```

