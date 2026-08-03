from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Conversation, Message, UserProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username',]


class MessageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True, required=False)
    sender_avatar = serializers.SerializerMethodField()
    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_avatar', 'text', 'image', 'timestamp']

    def get_sender_avatar(self, obj):
        try:
            profile = obj.sender.profile
        except UserProfile.DoesNotExist:
            return None
        if not profile.avatar:
            return None
        request = self.context.get('request')
        url = profile.avatar.url
        return request.build_absolute_uri(url) if request else url


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'messages']


class UserProfileSerializer(serializers.ModelSerializer):     #That will be used to display user information
    username = serializers.CharField(source="user.username", read_only=True)
    class Meta:
        model = UserProfile
        fields = ["id", "username", "display_name", "handle", "bio", "avatar"]

    def validate_handle(self, value):
        return None if value == "" else value