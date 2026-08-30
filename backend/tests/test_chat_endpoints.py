import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_chat_strict_mode_insufficient_evidence(client: AsyncClient):
    # Register & login
    user_payload = {
        "email": "chatuser@example.com",
        "username": "chatuser",
        "password": "Password123!"
    }
    reg_res = await client.post("/api/v1/auth/register", json=user_payload)
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Strict document_qa query with no documents in vector store
    chat_payload = {
        "question": "What is the secret formula described in section 4?",
        "mode": "document_qa",
        "document_ids": ["non_existent_doc_id"],
    }
    with patch("app.rag.pipeline.generate_embedding", new_callable=AsyncMock) as mock_embed:
        mock_embed.return_value = [0.1] * 768
        chat_res = await client.post("/api/v1/chat", json=chat_payload, headers=headers)
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert data["mode"] == "document_qa"
        assert data["route"] == "document_qa"
        assert "Your selected documents do not contain enough evidence to answer this question." in data["answer"]
        assert data["sources"] == []
        assert data["sufficient_context"] is False
        assert data["confidence_score"] == 0.0

@pytest.mark.asyncio
async def test_chat_general_ai_routing_and_confidence(client: AsyncClient):
    user_payload = {
        "email": "genuser@example.com",
        "username": "genuser",
        "password": "Password123!"
    }
    reg_res = await client.post("/api/v1/auth/register", json=user_payload)
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    chat_payload = {
        "question": "Write a hello world program in python.",
        "mode": "general_ai",
    }
    with patch("app.api.v1.endpoints.chat.generate_answer", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = ("print('Hello, World!')", "Gemini 2.5 Flash")
        chat_res = await client.post("/api/v1/chat", json=chat_payload, headers=headers)
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert data["mode"] == "general_ai"
        assert data["route"] == "general_ai"
        assert data["answer"] == "print('Hello, World!')"
        assert data["provider"] == "Gemini 2.5 Flash"
        assert data["confidence_score"] is None
        assert data["sufficient_context"] is True

@pytest.mark.asyncio
async def test_chat_conversation_persistence(client: AsyncClient):
    user_payload = {
        "email": "persistuser@example.com",
        "username": "persistuser",
        "password": "Password123!"
    }
    reg_res = await client.post("/api/v1/auth/register", json=user_payload)
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create conversation
    conv_res = await client.post("/api/v1/conversations", json={"title": "Persist Test"}, headers=headers)
    conv_id = conv_res.json()["id"]

    # Send chat message attached to this conversation
    chat_payload = {
        "question": "What is Python?",
        "mode": "general_ai",
        "conversation_id": conv_id,
    }
    with patch("app.api.v1.endpoints.chat.generate_answer", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = ("Python is a high-level programming language.", "Gemini 2.5 Flash")
        chat_res = await client.post("/api/v1/chat", json=chat_payload, headers=headers)
        assert chat_res.status_code == 200
        assert chat_res.json()["conversation_id"] == conv_id

    # Verify conversation now contains both user and ai messages
    detail_res = await client.get(f"/api/v1/conversations/{conv_id}", headers=headers)
    assert detail_res.status_code == 200
    messages = detail_res.json()["messages"]
    assert len(messages) == 2
    assert messages[0]["sender"] == "user"
    assert messages[0]["text"] == "What is Python?"
    assert messages[1]["sender"] == "ai"
    assert messages[1]["text"] == "Python is a high-level programming language."
