from django.urls import re_path
from .consumers import NotificationConsumer, MessagingConsumer

websocket_urlpatterns = [
    re_path(r'ws/notifications/(?P<user_id>\d+)/$', NotificationConsumer.as_asgi()),
    re_path(r'ws/messaging/(?P<user_id>\d+)/$', MessagingConsumer.as_asgi()),
]
