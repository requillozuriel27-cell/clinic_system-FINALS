from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, DoctorProfile
from .serializers import RegisterSerializer, UserSerializer


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['username'] = user.username
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Registration successful. Please log in.'},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user.role == 'admin':
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Always generate fresh tokens
        tokens = get_tokens_for_user(user)
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'role': user.role,
            'user_id': user.id,
            'username': user.username,
            'full_name': user.get_full_name(),
        })


class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        special_code = request.data.get('special_code', '').strip()

        if not username or not password or not special_code:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if special_code != settings.ADMIN_SPECIAL_CODE:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(username=username, password=password)

        if user is None or not user.is_active or user.role != 'admin':
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tokens = get_tokens_for_user(user)
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'role': user.role,
            'user_id': user.id,
            'username': user.username,
            'full_name': user.get_full_name(),
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({'message': 'Logged out successfully.'})


class UserListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        role = self.request.query_params.get('role', None)
        search = self.request.query_params.get('search', None)

        if user.role == 'admin':
            qs = CustomUser.objects.all().order_by('role', 'username')
        elif user.role == 'patient':
            qs = CustomUser.objects.filter(role='doctor', is_active=True)
        elif user.role == 'doctor':
            from appointments.models import Appointment
            patient_ids = Appointment.objects.filter(
                doctor=user
            ).values_list('patient_id', flat=True).distinct()
            qs = CustomUser.objects.filter(id__in=patient_ids)
        else:
            qs = CustomUser.objects.none()

        if role:
            qs = qs.filter(role=role)
        if search:
            qs = (
                qs.filter(username__icontains=search) |
                qs.filter(first_name__icontains=search) |
                qs.filter(last_name__icontains=search) |
                qs.filter(email__icontains=search)
            )
        return qs


class UserDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    queryset = CustomUser.objects.all()


class SoftDeleteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            user = CustomUser.objects.get(pk=pk)
            user.is_active = False
            user.save()
            return Response({'message': f'User {user.username} deactivated.'})
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class RestoreUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            user = CustomUser.objects.get(pk=pk)
            user.is_active = True
            user.save()
            return Response({'message': f'User {user.username} restored.'})
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class ResetPasswordView(APIView):
    """Admin resets any user password."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can reset passwords.'},
                status=403,
            )

        new_password = request.data.get('new_password', '').strip()
        if not new_password or len(new_password) < 6:
            return Response(
                {'error': 'Password must be at least 6 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = CustomUser.objects.get(pk=pk)
            user.set_password(new_password)
            user.save()
            return Response({
                'message': f'Password for {user.username} reset successfully.'
            })
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)