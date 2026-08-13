# Agentic Service

Agentic and NLP orchestration layer for Social-Media Service Analytics and Voice-of-Customer Insights.

This service intentionally does not implement analytics algorithms, ML models, Snowflake connections, Vector DB connections, FastAPI routes, or database persistence. It provides replaceable interfaces and deterministic mocks so those systems can be connected later.

## Flow

1. Query understanding and validation
2. Data sufficiency check
3. Dynamic tool selection
4. Mock analytics, Snowflake, NLP, and Vector DB tool calls
5. Result validation
6. RAG context construction
7. Bedrock response abstraction

## Common Agentic Flow For Objective 18

Objective 18 is handled with one reusable flow:

1. Ingest a user question such as "show the service dashboard", "why is sentiment down", or "what issues are recurring".
2. Validate whether the current dataset can answer it.
3. Select only the tools required for that question.
4. Pull structured metrics through analytics/Snowflake interfaces.
5. Pull labels and themes through NLP interfaces.
6. Retrieve representative conversations through the Vector DB interface.
7. Validate that outputs are present, relevant, and sufficiently confident.
8. Build a grounded context packet.
9. Ask Bedrock to produce a plain-language executive answer using only validated context.

For the expected project outcome, the common route is:

```text
User asks for dashboard / executive summary
-> QueryValidator
-> DecisionEngine
-> analytics_tool: KPI summary, response time, sentiment trend proxy, issue trends, priorities
-> snowflake_tool: KPI data, sentiment trend, issue volume, issue growth
-> nlp_tool: sentiment, intent, topics, pain points, entities
-> vector_db_tool: representative customer conversations and issue context
-> ResultValidator
-> ContextBuilder
-> BedrockClient
-> grounded facts + recommendations
```

## Current Kaggle Dataset Fit

The current sample at `backend/sample.csv` matches the Kaggle Twitter customer-support shape:

```text
tweet_id, author_id, inbound, created_at, text, response_tweet_id, in_response_to_tweet_id
```

Supported from these columns:

- Conversation mining: `text`
- Sentiment/intent/topic/pain-point extraction: `text`
- Sentiment trend over time: `text` + `created_at`
- Response-time analysis: `created_at` + `response_tweet_id` + `in_response_to_tweet_id`
- Recurring/emerging issue discovery: `text` + `created_at`
- Representative examples: `text` via future Vector DB indexing

Not directly supported unless you add labels or derived fields:

- True resolution rate: needs `resolution_status` or `ticket_status`
- First-contact resolution: needs `first_contact_resolution` or `contact_count`
- Escalation rate: needs `escalation_status`
- Reopen rate: needs `reopen_status` or `status_history`
- CSAT: needs a CSAT field, or must be clearly labeled as a sentiment proxy
- Product/region breakdowns: need product/region fields or trusted entity enrichment

The agent must return `insufficient_data` for unsupported true metrics. It should not fake resolution, escalation, reopen, FCR, or CSAT from tweet text alone.

## Example Tool-Selection Demo

```bash
python -m backend.agentic_service.demo_examples
```

Expected decisions include:

- Average response time: analytics + snowflake
- Customer complaints: NLP + Vector DB
- Negative sentiment increase: analytics + snowflake + NLP + Vector DB
- Emerging customer problems: analytics + snowflake + NLP
- Login complaint examples: NLP + Vector DB

## Tests

```bash
python -m pytest backend/agentic_service/tests
```

## Bedrock

Bedrock is mocked by default through `AGENTIC_USE_BEDROCK_MOCK=true`.

To connect real Bedrock with a Bedrock API key, set:

```bash
AWS_REGION=us-east-1
AWS_BEARER_TOKEN_BEDROCK=your-bedrock-api-key
AGENTIC_USE_BEDROCK_MOCK=false
AGENTIC_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
```

If you use IAM credentials instead of a Bedrock API key, set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` instead. `AWS_SESSION_TOKEN` is only needed for temporary AWS credentials.

All of these values belong in `backend/.env`, using `backend/.env.example` as the template. Do not commit `backend/.env`.
