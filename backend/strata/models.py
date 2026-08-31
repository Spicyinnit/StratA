from django.db import models
from django.contrib.auth.models import User


def avatar_path(instance, filename):
    return f"avatars/{instance.user_id}/{filename}"

def group_avatar_path(instance, filename):
    return f"groups/{filename}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=50, blank=True)
    bio = models.TextField(max_length=200, blank=True)
    avatar = models.ImageField(upload_to=avatar_path, blank=True, null=True)

    def __str__(self):
        return self.user.username


class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name="conversations")

    # NEW — everything from here to created_at
    is_group = models.BooleanField(default=False)
    name = models.CharField(max_length=80, blank=True)
    avatar = models.ImageField(upload_to=group_avatar_path, blank=True, null=True)
    owner = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_conversations",
    )
    # END NEW

    created_at = models.DateTimeField(auto_now_add=True)

    # NEW
    def __str__(self):
        if self.is_group:
            return self.name or f"Group {self.id}"
        return f"DM {self.id}"

    # NEW — used by consumers.py + send_message instead of chat_{a}_{b}
    @property
    def room_group_name(self):
        return f"convo_{self.id}"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, related_name="messages", on_delete=models.CASCADE)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    image = models.ImageField(upload_to="messages/", null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    # NEW — so you can drop .order_by('timestamp') everywhere later
    class Meta:
        ordering = ["timestamp"]

    # django group model
class GroupManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_group=True)


class GroupChat(Conversation):
    objects = GroupManager()

    class Meta:
        proxy = True
        verbose_name = "Group chat"
        verbose_name_plural = "Group chats"