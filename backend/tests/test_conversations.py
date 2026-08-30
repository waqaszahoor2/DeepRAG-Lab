import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_conversation_lifecycle_and_user_isolation(client: AsyncClient):
    # 1. Register User A
    user_a = {
        "email": "usera@example.com",
        "username": "usera",
        "password": "Password123!"
    }
    res_a = await client.post("/api/v1/auth/register", json=user_a)
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register User B
    user_b = {
        "email": "userb@example.com",
        "username": "userb",
        "password": "Password123!"
    }
    res_b = await client.post("/api/v1/auth/register", json=user_b)
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User A creates a conversation
    create_res = await client.post(
        "/api/v1/conversations",
        json={"title": "Project Alpha Research"},
        headers=headers_a,
    )
    assert create_res.status_code == 201
    conv_data = create_res.json()
    conv_id = conv_data["id"]
    assert conv_data["title"] == "Project Alpha Research"

    # 4. User A lists conversations
    list_res = await client.get("/api/v1/conversations", headers=headers_a)
    assert list_res.status_code == 200
    convs = list_res.json()
    assert len(convs) == 1
    assert convs[0]["id"] == conv_id

    # 5. User B lists conversations -> should be empty (isolation)
    list_b_res = await client.get("/api/v1/conversations", headers=headers_b)
    assert list_b_res.status_code == 200
    assert len(list_b_res.json()) == 0

    # 6. User B attempts to access User A's conversation -> 404
    get_b_res = await client.get(f"/api/v1/conversations/{conv_id}", headers=headers_b)
    assert get_b_res.status_code == 404

    # 7. User A appends a message
    msg_payload = {
        "sender": "user",
        "text": "Can you summarize Section 2?",
        "mode": "document_qa",
    }
    msg_res = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json=msg_payload,
        headers=headers_a,
    )
    assert msg_res.status_code == 201
    msg_data = msg_res.json()
    assert msg_data["text"] == "Can you summarize Section 2?"
    assert msg_data["sender"] == "user"

    # 8. User A gets conversation detail
    detail_res = await client.get(f"/api/v1/conversations/{conv_id}", headers=headers_a)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["messages"]) == 1
    assert detail["messages"][0]["text"] == "Can you summarize Section 2?"

    # 9. User A updates title
    patch_res = await client.patch(
        f"/api/v1/conversations/{conv_id}",
        json={"title": "Updated Alpha Research"},
        headers=headers_a,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Updated Alpha Research"

    # 10. User A deletes conversation
    del_res = await client.delete(f"/api/v1/conversations/{conv_id}", headers=headers_a)
    assert del_res.status_code == 204

    # Verify deleted
    get_deleted = await client.get(f"/api/v1/conversations/{conv_id}", headers=headers_a)
    assert get_deleted.status_code == 404
