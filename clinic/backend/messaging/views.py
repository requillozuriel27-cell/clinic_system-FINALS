from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import Message
from .serializers import MessageSerializer, SendMessageSerializer
from notifications.utils import send_ws_message


class InboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        messages = Message.objects.filter(
            receiver=request.user
        ).select_related('sender', 'receiver').order_by('-timestamp')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)


class SentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        messages = Message.objects.filter(
            sender=request.user
        ).select_related('sender', 'receiver').order_by('-timestamp')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)


class ThreadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, other_user_id):
        user = request.user
        messages = Message.objects.filter(
            Q(sender=user, receiver_id=other_user_id) |
            Q(sender_id=other_user_id, receiver=user)
        ).select_related('sender', 'receiver').order_by('timestamp')

        # Mark as read
        messages.filter(receiver=user, is_read=False).update(is_read=True)

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        if serializer.is_valid():
            message = serializer.save(sender=request.user)

            # Real-time delivery via WebSocket
            send_ws_message(
                message.receiver.id,
                {
                    'type': 'new_message',
                    'from': request.user.get_full_name(),
                    'from_id': request.user.id,
                    'subject': message.subject,
                    'body': message.body[:100],
                    'message_id': message.id,
                }
            )

            return Response(
                MessageSerializer(message).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(receiver=request.user, is_read=False).count()
        return Response({'unread_count': count})


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, other_user_id):
        Message.objects.filter(
            sender_id=other_user_id,
            receiver=request.user,
            is_read=False,
        ).update(is_read=True)
        return Response({'message': 'Marked as read.'})


class ConversationListView(APIView):
    """Returns list of unique conversations (one entry per other user)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        messages = Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).select_related('sender', 'receiver').order_by('-timestamp')

        seen = set()
        conversations = []
        for msg in messages:
            other = msg.receiver if msg.sender == user else msg.sender
            if other.id not in seen:
                seen.add(other.id)
                unread = Message.objects.filter(
                    sender=other, receiver=user, is_read=False
                ).count()
                conversations.append({
                    'user_id': other.id,
                    'username': other.username,
                    'full_name': other.get_full_name(),
                    'role': other.role,
                    'last_message': msg.body[:80],
                    'last_timestamp': msg.timestamp,
                    'unread_count': unread,
                })
        return Response(conversations)
