from django.db import models
from accounts.models import CustomUser


class Message(models.Model):
    sender = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='sent_messages'
    )
    receiver = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='received_messages'
    )
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"From {self.sender.username} to {self.receiver.username}: {self.subject[:40]}"
