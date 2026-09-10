from django.db import models
from django.contrib.auth.models import User

def avatar_path(instance, filename):
    return f"avatars/{instance.user_id}/{filename}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=50, blank=True)
    bio = models.TextField(max_length=200, blank=True)
    avatar = models.ImageField(upload_to=avatar_path, blank=True, null=True)

    def __str__(self):
        return self.user.username

class Contact(models.Model):
    """Per-user private info about another user. Owner sees it, target never does."""
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="contacts")
    target = models.ForeignKey(User, on_delete=models.CASCADE, related_name="known_by")
    nickname = models.CharField(max_length=50, blank=True)

    class Meta:
        unique_together = ("owner", "target")

    def __str__(self):
        return f"{self.owner.username} → {self.target.username} ({self.nickname or '-'})"