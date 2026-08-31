from django.contrib import admin
from .models import Conversation, Message, UserProfile, GroupChat

# info for djangodb's user info 
admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(UserProfile)
admin.site.register(GroupChat)