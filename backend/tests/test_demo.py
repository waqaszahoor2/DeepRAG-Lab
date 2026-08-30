from types import SimpleNamespace

import pytest

from app.api.v1.endpoints import chat
from app.core.exceptions import RateLimitError


def test_demo_message_limit_is_isolated_by_session():
    chat._demo_sessions.clear()
    first = SimpleNamespace(headers={"X-Demo-Session-ID": "session-a"})
    second = SimpleNamespace(headers={"X-Demo-Session-ID": "session-b"})

    for _ in range(chat._DEMO_MAX_MESSAGES):
        chat._check_demo_limit(first)

    with pytest.raises(RateLimitError):
        chat._check_demo_limit(first)

    chat._check_demo_limit(second)