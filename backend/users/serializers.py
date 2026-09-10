from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Contact


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
