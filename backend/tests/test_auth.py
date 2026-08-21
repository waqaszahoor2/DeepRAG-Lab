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
