import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def send_notification(user, message, notif_type='general', extra=None):
    """
    Saves a Notification to DB and pushes it via WebSocket to user_<id>.
    Import is deferred to avoid circular imports at module load time.
    """
    from notifications.models import Notification

    notif = Notification.objects.create(
        user=user,
        message=message,
        notif_type=notif_type,
        extra_data=extra or {},
    )

    channel_layer = get_channel_layer()
    group_name = f'user_{user.id}'
    payload = {
        'type': 'send_notification',
        'notification': {
            'id': notif.id,
            'message': message,
            'notif_type': notif_type,
            'extra_data': extra or {},
            'is_read': False,
            'created_at': str(notif.created_at),
        }
    }
    try:
        async_to_sync(channel_layer.group_send)(group_name, payload)
    except Exception:
        pass  # WebSocket push is best-effort; DB record is authoritative

    return notif


def send_ws_message(user_id, data):
    """Push a real-time message event to messaging_<user_id> channel group."""
    channel_layer = get_channel_layer()
    group_name = f'messaging_{user_id}'
    try:
        async_to_sync(channel_layer.group_send)(group_name, {
            'type': 'send_message_event',
            'data': data,
        })
    except Exception:
        pass
