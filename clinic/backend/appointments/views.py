from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Appointment
from .serializers import AppointmentSerializer, CreateAppointmentSerializer
from accounts.models import CustomUser
from notifications.utils import send_notification


class AppointmentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status', None)
        search = self.request.query_params.get('search', None)

        if user.role == 'patient':
            qs = Appointment.objects.filter(patient=user)
        elif user.role == 'doctor':
            qs = Appointment.objects.filter(doctor=user)
        elif user.role == 'admin':
            qs = Appointment.objects.all()
        else:
            return Appointment.objects.none()

        if status_filter:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                Q(patient__username__icontains=search) |
                Q(patient__first_name__icontains=search) |
                Q(patient__last_name__icontains=search) |
                Q(doctor__username__icontains=search) |
                Q(doctor__first_name__icontains=search) |
                Q(doctor__last_name__icontains=search)
            )
        return qs.select_related('patient', 'doctor').order_by('-date', '-time')


class BookAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'patient':
            return Response(
                {'error': 'Only patients can book appointments.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CreateAppointmentSerializer(data=request.data)
        if serializer.is_valid():
            appointment = serializer.save(patient=request.user, status='pending')

            # Notify doctor about new booking
            send_notification(
                appointment.doctor,
                f'New appointment booked by {appointment.patient.get_full_name()} '
                f'on {appointment.date} at {appointment.time}. Please confirm or cancel.',
                notif_type='new_appointment',
                extra={'appointment_id': appointment.id},
            )

            return Response(
                AppointmentSerializer(appointment).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ConfirmAppointmentView(APIView):
    """Doctor or admin confirms a pending appointment."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appointment = get_object_or_404(Appointment, pk=pk)
        user = request.user

        # Only doctor assigned or admin can confirm
        if user.role == 'doctor' and appointment.doctor != user:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'patient':
            return Response({'error': 'Patients cannot confirm appointments.'}, status=status.HTTP_403_FORBIDDEN)

        if appointment.status == 'cancelled':
            return Response(
                {'error': 'Cannot confirm a cancelled appointment.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if appointment.status == 'confirmed':
            return Response(
                {'error': 'Appointment is already confirmed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = 'confirmed'
        appointment.save()

        # Notify patient
        send_notification(
            appointment.patient,
            f'Your appointment with Dr. {appointment.doctor.get_full_name()} '
            f'on {appointment.date} at {appointment.time} has been CONFIRMED.',
            notif_type='appointment_confirmed',
            extra={'appointment_id': appointment.id},
        )

        return Response(
            {'message': 'Appointment confirmed.',
             'appointment': AppointmentSerializer(appointment).data}
        )


class UpdateAppointmentStatusView(APIView):
    """Admin can set any status on any appointment."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can update status directly.'}, status=403)

        appointment = get_object_or_404(Appointment, pk=pk)
        new_status = request.data.get('status', '').strip()

        valid = ['pending', 'confirmed', 'cancelled', 'completed']
        if new_status not in valid:
            return Response(
                {'error': f'Status must be one of: {", ".join(valid)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = appointment.status
        appointment.status = new_status
        appointment.save()

        patient = appointment.patient
        doctor = appointment.doctor

        # Notify both parties of the status change
        send_notification(
            patient,
            f'Your appointment with Dr. {doctor.get_full_name()} on {appointment.date} '
            f'has been updated to {new_status.upper()} by admin.',
            notif_type='status_update',
            extra={'appointment_id': appointment.id},
        )
        send_notification(
            doctor,
            f'Appointment with {patient.get_full_name()} on {appointment.date} '
            f'has been updated to {new_status.upper()} by admin.',
            notif_type='status_update',
            extra={'appointment_id': appointment.id},
        )

        return Response(
            {'message': f'Status updated to {new_status}.',
             'appointment': AppointmentSerializer(appointment).data}
        )


class CancelAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appointment = get_object_or_404(Appointment, pk=pk)
        user = request.user

        if user.role == 'patient' and appointment.patient != user:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'doctor' and appointment.doctor != user:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        if appointment.status == 'cancelled':
            return Response(
                {'error': 'Appointment is already cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = 'cancelled'
        appointment.save()

        patient = appointment.patient
        doctor = appointment.doctor
        date_str = str(appointment.date)
        time_str = str(appointment.time)

        if user.role == 'admin':
            send_notification(
                patient,
                f'Your appointment with Dr. {doctor.get_full_name()} on {date_str} at {time_str} was cancelled by admin.',
                notif_type='cancellation',
                extra={'appointment_id': appointment.id},
            )
            send_notification(
                doctor,
                f'Appointment with {patient.get_full_name()} on {date_str} at {time_str} was cancelled by admin.',
                notif_type='cancellation',
                extra={'appointment_id': appointment.id},
            )

        elif user.role == 'doctor':
            send_notification(
                patient,
                f'Your appointment with Dr. {doctor.get_full_name()} on {date_str} at {time_str} was cancelled by the doctor.',
                notif_type='cancellation',
                extra={'appointment_id': appointment.id},
            )

        elif user.role == 'patient':
            send_notification(
                doctor,
                f'Appointment with {patient.get_full_name()} on {date_str} at {time_str} was cancelled by the patient.',
                notif_type='cancellation',
                extra={'appointment_id': appointment.id},
            )
            admins = CustomUser.objects.filter(role='admin', is_active=True)
            for admin in admins:
                send_notification(
                    admin,
                    f'Appointment between Dr. {doctor.get_full_name()} and {patient.get_full_name()} on {date_str} was cancelled by patient.',
                    notif_type='cancellation',
                    extra={'appointment_id': appointment.id},
                )

        return Response(
            {'message': 'Appointment cancelled.',
             'appointment': AppointmentSerializer(appointment).data}
        )


class AppointmentDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Appointment.objects.all()
        elif user.role == 'doctor':
            return Appointment.objects.filter(doctor=user)
        return Appointment.objects.filter(patient=user)


class AppointmentStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

        from accounts.models import CustomUser as User
        return Response({
            'total_patients': User.objects.filter(role='patient', is_active=True).count(),
            'total_doctors': User.objects.filter(role='doctor', is_active=True).count(),
            'total_appointments': Appointment.objects.count(),
            'pending': Appointment.objects.filter(status='pending').count(),
            'confirmed': Appointment.objects.filter(status='confirmed').count(),
            'cancelled': Appointment.objects.filter(status='cancelled').count(),
            'completed': Appointment.objects.filter(status='completed').count(),
        })