from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token


@database_sync_to_async
def get_user_from_token(key):
    try:
        return Token.objects.get(key=key).user
    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        qs = parse_qs(scope["query_string"].decode())
        key = qs.get("token", [None])[0]
        scope["user"] = await get_user_from_token(key) if key else AnonymousUser()
        return await self.app(scope, receive, send)