from django.urls import path
from .views import (
    InboxView, SentView, ThreadView, SendMessageView,
    UnreadCountView, MarkReadView, ConversationListView,
)

urlpatterns = [
    path('messages/', InboxView.as_view(), name='inbox'),
    path('messages/sent/', SentView.as_view(), name='sent'),
    path('messages/send/', SendMessageView.as_view(), name='send-message'),
    path('messages/conversations/', ConversationListView.as_view(), name='conversations'),
    path('messages/unread/', UnreadCountView.as_view(), name='unread-count'),
    path('messages/thread/<int:other_user_id>/', ThreadView.as_view(), name='thread'),
    path('messages/mark-read/<int:other_user_id>/', MarkReadView.as_view(), name='mark-read'),
]
