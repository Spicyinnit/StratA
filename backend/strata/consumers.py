import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.me = self.scope["user"]
        if not self.me.is_authenticated:
            await self.close(code=4001)
            return

        # NEW — conversation id straight from the URL, no more pair math
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.conversation = await self.get_conversation()

        # NEW — you can't listen in on a conversation you're not in
        if self.conversation is None:
            await self.close(code=4003)
            return

        self.group_name = f"convo_{self.conversation_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        data = json.loads(text_data)
        if data.get("type") != "message.send":
            return
        text = (data.get("text") or "").strip()
        if not text:
            return

        payload = await self.save_message(text)
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.message", "message": payload},
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message.new",
            "message": event["message"],
        }))

    # NEW — fired by mark_read in views.py via group_send({"type": "read.receipt", ...})
    async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            "type": "read_receipt",
            "reader_id": event["reader_id"],
            "conversation_id": event["conversation_id"],
        }))

    # NEW — fetch instead of create; the REST endpoints own creation now
    @database_sync_to_async
    def get_conversation(self):
        return (Conversation.objects
                .filter(id=self.conversation_id, participants=self.me)
                .first())

    @database_sync_to_async
    def save_message(self, text):
        m = Message.objects.create(
            conversation=self.conversation,
            sender=self.me,
            text=text,
        )
        profile = getattr(self.me, "profile", None)
        return {
            "id": m.id,
            "text": m.text,
            "sender": self.me.id,
            "sender_name": (profile.display_name if profile else "") or self.me.username,
            "timestamp": m.timestamp.isoformat(),
            "image": None,
        }