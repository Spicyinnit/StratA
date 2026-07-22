from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Conversation, Message, UserProfile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class MessageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True, required=False)
    class Meta:
        model = Message
        fields = ['id', 'sender', 'text', 'image', 'timestamp']

class UserProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(use_url=True, required=False)
    class Meta:
        model = UserProfile
        fields = ['avatar', 'handle', 'bio']  

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'messages']