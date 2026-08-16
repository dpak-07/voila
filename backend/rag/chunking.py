import re
from typing import Any, Dict, List, Optional


class IssueBasedChunker:
    """Problem 13: Issue-Based Chunking Strategy for Multi-Turn Conversations.
    
    Prevents dilution of customer complaints across long multi-turn support threads.
    Extracts distinct issue phases:
    1. Problem Declaration (Customer Opening)
    2. Diagnostic Exchange (Troubleshooting & Symptoms)
    3. Outcome / Resolution (Fix State)
    """

    def __init__(self, max_chunk_tokens: int = 120, overlap_turns: int = 1):
        self.max_chunk_tokens = max_chunk_tokens
        self.overlap_turns = overlap_turns

    def chunk_conversation(self, conversation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Chunks a single or multi-turn conversation into issue-focused chunks."""
        turns = conversation.get("turns") or conversation.get("messages") or []
        
        # 1. Single message / tweet-level format
        if not turns:
            text = conversation.get("text") or conversation.get("clean_text") or ""
            return [{
                "chunk_id": f"{conversation.get('id', 0)}_c0",
                "chunk_type": "single_turn",
                "text": text,
                "author_id": conversation.get("author_id"),
                "inbound": conversation.get("inbound", True),
                "token_estimate": len(text.split())
            }]

        # 2. Multi-turn conversation chunking
        chunks: List[Dict[str, Any]] = []
        
        # Phase 1: Problem Declaration (First Customer Turn)
        customer_turns = [t for t in turns if t.get("inbound") is True or "customer" in str(t.get("role", "")).lower()]
        if customer_turns:
            opening_text = customer_turns[0].get("text", "")
            chunks.append({
                "chunk_id": f"{conversation.get('id', 'conv')}_problem",
                "chunk_type": "problem_declaration",
                "text": f"[Customer Issue Declaration]: {opening_text}",
                "author_id": customer_turns[0].get("author_id"),
                "inbound": True,
                "token_estimate": len(opening_text.split())
            })

        # Phase 2: Sliding Window / Diagnostic Chunks
        for i in range(0, len(turns), max(1, 2 - self.overlap_turns)):
            window = turns[i:i + 3]
            if not window:
                continue
            
            chunk_text = " \n ".join([
                f"[{ 'Customer' if t.get('inbound', True) else 'Agent' }]: {t.get('text', '')}"
                for t in window
            ])
            
            chunks.append({
                "chunk_id": f"{conversation.get('id', 'conv')}_turn_{i}",
                "chunk_type": "diagnostic_dialogue",
                "text": chunk_text,
                "inbound": any(t.get("inbound", True) for t in window),
                "token_estimate": len(chunk_text.split())
            })

        return chunks
