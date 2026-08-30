"""
DeepRAG Lab — GraphRAG Knowledge Graph Extraction Engine.

Extracts semantic entities and directional relationships from document chunks
to construct an in-memory knowledge graph for multi-hop entity queries.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class GraphEntity:
    name: str
    entity_type: str
    chunk_id: str


@dataclass
class GraphRelation:
    source: str
    relation: str
    target: str
    chunk_id: str


@dataclass
class KnowledgeGraph:
    entities: dict[str, GraphEntity] = field(default_factory=dict)
    relations: list[GraphRelation] = field(default_factory=list)


def extract_entities_and_relations(text: str, chunk_id: str) -> KnowledgeGraph:
    """Extract entities and relationship triples from raw text chunk."""
    kg = KnowledgeGraph()

    # Match proper nouns and capitalized technical terms
    capitalized_terms = re.findall(r"\b[A-Z][a-zA-Z0-9\-_]{2,}(?:\s+[A-Z][a-zA-Z0-9\-_]+)*\b", text)
    for term in set(capitalized_terms):
        if term not in kg.entities:
            kg.entities[term] = GraphEntity(name=term, entity_type="Concept", chunk_id=chunk_id)

    # Basic relationship extraction patterns (e.g. "X includes Y", "X uses Y", "X achieves Y")
    relation_patterns = [
        r"([A-Z][a-zA-Z0-9\-_]+)\s+(is|uses|includes|improves|achieves|requires|extends)\s+([A-Z][a-zA-Z0-9\-_]+)",
    ]

    for pattern in relation_patterns:
        for match in re.finditer(pattern, text):
            src, rel, tgt = match.group(1), match.group(2), match.group(3)
            kg.relations.append(
                GraphRelation(source=src, relation=rel, target=tgt, chunk_id=chunk_id)
            )

    logger.debug("GraphRAG: Extracted %d entities, %d relations for %s", len(kg.entities), len(kg.relations), chunk_id)
    return kg
