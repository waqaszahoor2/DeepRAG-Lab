import pytest

@pytest.mark.asyncio
async def test_register_and_login_flow(client):
    # 1. Register User
    reg_payload = {
        "email": "testuser@example.com",
        "username": "testuser",
        "password": "SecurePassword123!"
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    tokens = reg_res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # 2. Login User
    login_payload = {
        "email": "testuser@example.com",
        "password": "SecurePassword123!"
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_tokens = login_res.json()
    assert "access_token" in login_tokens

    # 3. Access Protected Route /me
    headers = {"Authorization": f"Bearer {login_tokens['access_token']}"}
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == "testuser@example.com"
    assert user_data["username"] == "testuser"


@pytest.mark.asyncio
async def test_unauthenticated_and_cross_user_access_blocked(client):
    # 1. Unauthenticated request to protected route -> 401
    unauth_res = await client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401

    unauth_docs = await client.get("/api/v1/documents")
    assert unauth_docs.status_code == 401

    unauth_convs = await client.get("/api/v1/conversations")
    assert unauth_convs.status_code == 401

    # 2. Register User 1
    u1_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "owner@example.com", "username": "owner", "password": "Password123!"},
    )
    t1 = u1_res.json()["access_token"]
    h1 = {"Authorization": f"Bearer {t1}"}

    # 3. Register User 2
    u2_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "attacker@example.com", "username": "attacker", "password": "Password123!"},
    )
    t2 = u2_res.json()["access_token"]
    h2 = {"Authorization": f"Bearer {t2}"}

    # 4. User 1 creates a conversation
    conv_res = await client.post("/api/v1/conversations", json={"title": "Private Notes"}, headers=h1)
    conv_id = conv_res.json()["id"]

    # 5. User 2 attempts to fetch User 1's conversation -> 404
    cross_res = await client.get(f"/api/v1/conversations/{conv_id}", headers=h2)
    assert cross_res.status_code == 404

    # 6. User 2 attempts to delete User 1's conversation -> 404
    cross_del = await client.delete(f"/api/v1/conversations/{conv_id}", headers=h2)
    assert cross_del.status_code == 404

