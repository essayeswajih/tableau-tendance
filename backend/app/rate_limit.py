from collections import defaultdict, deque
from time import monotonic
from typing import Deque

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._requests: dict[str, Deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = monotonic()
        window_start = now - window_seconds
        timestamps = self._requests[key]

        while timestamps and timestamps[0] <= window_start:
            timestamps.popleft()

        if len(timestamps) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )

        timestamps.append(now)


rate_limiter = InMemoryRateLimiter()


def client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def rate_limit(limit: int, window_seconds: int, scope: str):
    def dependency(request: Request) -> None:
        rate_limiter.check(f"{scope}:{client_ip(request)}", limit, window_seconds)

    return dependency
