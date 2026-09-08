from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Conversation, ConversationState, Message, UserProfile, Contact


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username',]

class MessageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True, required=False)
    media = serializers.SerializerMethodField()
    sender_avatar = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_avatar', 'sender_name', 'text', 'image', 'media', 'timestamp', 'is_read']

    def get_media(self, obj):
        f = obj.image or obj.file
        if not f:
            return None
        request = self.context.get('request')
        url = f.url
        return request.build_absolute_uri(url) if request else url
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

    def get_sender_name(self, obj):
        try:
            profile = obj.sender.profile
        except UserProfile.DoesNotExist:
            return obj.sender.username
        return profile.display_name or obj.sender.username


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'messages']


class UserProfileSerializer(serializers.ModelSerializer):
    tag = serializers.CharField(source="user.username", read_only=True)
    nickname = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ["id", "tag", "display_name", "bio", "avatar", "nickname"]

    def get_nickname(self, obj):
        """The nickname the REQUESTING user saved for this person. Nobody else sees it."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return ""
        if request.user.id == obj.user_id:
            return ""  # you dont nickname yourself
        contact = Contact.objects.filter(owner=request.user, target=obj.user_id).first()
        return contact.nickname if contact else ""


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "password", "password2"]

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password2": "Passwords don't match."})
        return data

    def create(self, validated_data):
        validated_data.pop("password2")
        return User.objects.create_user(**validated_data)

# groups

class ConversationListSerializer(serializers.ModelSerializer):
    """One flat shape for DMs and groups so the sidebar has a single code path."""
    info = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    pinned = serializers.SerializerMethodField()
    archived = serializers.SerializerMethodField()
    muted = serializers.SerializerMethodField()

    class Meta:
        model = Conversation  # model that im serializing
        fields = ['id', 'is_group', 'info', 'last_message', 'unread_count',
                  'pinned', 'muted', 'archived']  # fields that go in the json

    def get_info(self, obj):
        me = self.context['request'].user
        req = self.context.get('request')
        abs_url = lambda f: (req.build_absolute_uri(f.url) if req else f.url) if f else None

        if obj.is_group:
            return {
                'display_name': obj.name or f"Group {obj.id}",
                'tag': None,
                'avatar': abs_url(obj.avatar),
                'user_id': None,
                'member_count': obj.participants.count(),
                'nickname': '',
            }

        other = obj.participants.exclude(id=me.id).first()
        profile = getattr(other, 'profile', None) if other else None

        # nicknames dict is prefetched once in the view — avoids one query per row
        nicknames = self.context.get('nicknames', {})
        nickname = nicknames.get(other.id, '') if other else ''

        return {
            'display_name': (profile.display_name if profile else '') or (other.username if other else 'Deleted user'),
            'tag': other.username if other else None,
            'avatar': abs_url(profile.avatar) if profile else None,
            'user_id': other.id if other else None,
            'member_count': 2,
            'nickname': nickname,
        }

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-timestamp').first()
        if not msg:
            return None
        return {'id': msg.id, 'preview': (msg.text or '')[:60] or 'Image',
                'timestamp': msg.timestamp, 'sender_id': msg.sender_id}

    def get_unread_count(self, obj):
        me = self.context['request'].user
        return obj.messages.filter(is_read=False).exclude(sender=me).count()

    # states dict is prefetched once in the view, same trick as nicknames
    def get_pinned(self, obj):
        return self.context.get('states', {}).get(obj.id, {}).get('pinned', False)

    def get_muted(self, obj):
        return self.context.get('states', {}).get(obj.id, {}).get('muted', False)

    def get_archived(self, obj):
        return self.context.get('states', {}).get(obj.id, {}).get('archived', False)


class GroupDetailSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        url = obj.avatar.url
        return request.build_absolute_uri(url) if request else url

    def get_members(self, obj):
        return obj.participants.values('id', 'username', 'profile__display_name')

    class Meta:
        model = Conversation
        fields = ['id', 'is_group', 'name', 'avatar_url', 'owner', 'members', 'created_at']