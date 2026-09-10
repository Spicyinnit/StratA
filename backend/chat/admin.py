from django.contrib import admin
from .models import Conversation, Message, GroupChat

admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(GroupChat)