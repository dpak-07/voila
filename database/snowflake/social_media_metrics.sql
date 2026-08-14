-- DDL Schema definition for Snowflake structured metrics table.
-- Table: SOCIAL_MEDIA_METRICS

CREATE OR REPLACE TABLE SOCIAL_MEDIA_METRICS (
    TWEET_ID NUMBER(38,0) NOT NULL COMMENT 'Unique identifier of the social media post',
    DATASET_RUN_ID VARCHAR(255) NOT NULL COMMENT 'Unique identifier for the uploaded dataset version/run',
    USER_ID VARCHAR(255) DEFAULT 'deepak' COMMENT 'User who uploaded the dataset',
    AUTHOR_ID VARCHAR(16777216) COMMENT 'Identifier of the customer or support agent',
    INBOUND BOOLEAN COMMENT 'True if post was inbound from customer, False if sent by agent',
    CREATED_AT TIMESTAMP_TZ(9) COMMENT 'Timestamp of post creation',
    TEXT VARCHAR(16777216) COMMENT 'Raw uncleaned text of the tweet',
    CLEAN_TEXT VARCHAR(16777216) COMMENT 'Cleaned text containing alphanumeric characters and basic punctuation',
    SENTIMENT VARCHAR(100) COMMENT 'Classified sentiment (positive, neutral, negative)',
    SENTIMENT_SCORE NUMBER(38,0) COMMENT 'Numeric representation of sentiment (Positive=1, Neutral=0, Negative=-1)',
    CONFIDENCE FLOAT COMMENT 'BERT model classification confidence score (0.0 to 1.0)',
    PRIORITY VARCHAR(100) COMMENT 'Operational priority (low, normal, high, critical)',
    CONVERSATION_ID VARCHAR(16777216) COMMENT 'Thread identifier grouping customer-agent interaction',
    TOPIC_ID NUMBER(38,0) COMMENT 'Topic cluster ID assigned by BERTopic',
    TOPIC_KEYWORDS VARCHAR(16777216) COMMENT 'Keywords defining the topic cluster',
    SPIKE_DETECTED BOOLEAN COMMENT 'Flag indicating a volume spike on this date for the topic',
    RESPONSE_TIME_MINUTES FLOAT COMMENT 'Minutes elapsed before support responded to this message',
    
    -- Ingestion run audit metadata
    INGESTED_AT TIMESTAMP_NTZ(9) DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (TWEET_ID, DATASET_RUN_ID)
);

