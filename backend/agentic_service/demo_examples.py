from backend.agentic_service.agent.agent import AgenticService
from backend.agentic_service.schemas.query import QueryRequest


EXAMPLES = [
    "What is the average response time?",
    "What are customers complaining about?",
    "Why did negative sentiment increase this week?",
    "What are the emerging customer problems?",
    "Show me examples of customers complaining about login problems.",
]


def main() -> None:
    service = AgenticService()
    for question in EXAMPLES:
        decision = service.preview_decision(QueryRequest(question=question))
        print(f"Query: {question}")
        print(f"Type: {decision.query_type}")
        print(f"Tools: {', '.join(decision.required_tools)}")
        print(f"Actions: {decision.required_actions}")
        print()


if __name__ == "__main__":
    main()
