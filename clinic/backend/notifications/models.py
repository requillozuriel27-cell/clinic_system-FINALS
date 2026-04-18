from django.db import models
from accounts.models import CustomUser


class Notification(models.Model):
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='notifications'
    )
    message = models.TextField()
    notif_type = models.CharField(max_length=50, default='general')
    is_read = models.BooleanField(default=False)
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message[:60]}"
