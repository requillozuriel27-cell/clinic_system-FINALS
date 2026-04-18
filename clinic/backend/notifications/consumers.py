import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'user_{self.user_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send unread notifications on connect
        notifications = await self.get_unread_notifications()
        await self.send(text_data=json.dumps({
            'type': 'initial_notifications',
            'notifications': notifications,
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        if action == 'mark_read':
            notif_id = data.get('notification_id')
            if notif_id:
                await self.mark_notification_read(notif_id)

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event['notification']))

    @database_sync_to_async
    def get_unread_notifications(self):
        from notifications.models import Notification
        notifs = Notification.objects.filter(
            user_id=self.user_id, is_read=False
        ).order_by('-created_at')[:20]
        return [
            {
                'id': n.id,
                'message': n.message,
                'notif_type': n.notif_type,
                'extra_data': n.extra_data,
                'is_read': n.is_read,
                'created_at': str(n.created_at),
            }
            for n in notifs
        ]

    @database_sync_to_async
    def mark_notification_read(self, notif_id):
        from notifications.models import Notification
        Notification.objects.filter(
            id=notif_id, user_id=self.user_id
        ).update(is_read=True)


class MessagingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'messaging_{self.user_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass  # Incoming WS messages not used; REST handles sending

    async def send_message_event(self, event):
        await self.send(text_data=json.dumps(event['data']))
