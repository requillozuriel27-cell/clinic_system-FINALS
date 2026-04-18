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
                f'on {appointment.date} at {appointment.time}.',
                notif_type='new_appointment',
                extra={'appointment_id': appointment.id},
            )

            return Response(
                AppointmentSerializer(appointment).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CancelAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appointment = get_object_or_404(Appointment, pk=pk)
        user = request.user

        # Permission checks
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

        # Flowchart notification rules
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
                    f'Appointment between Dr. {doctor.get_full_name()} and {patient.get_full_name()} on {date_str} was cancelled by the patient.',
                    notif_type='cancellation',
                    extra={'appointment_id': appointment.id},
                )

        return Response(
            {'message': 'Appointment cancelled successfully.',
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
        total_patients = User.objects.filter(role='patient', is_active=True).count()
        total_doctors = User.objects.filter(role='doctor', is_active=True).count()
        total_appointments = Appointment.objects.count()
        pending = Appointment.objects.filter(status='pending').count()
        confirmed = Appointment.objects.filter(status='confirmed').count()
        cancelled = Appointment.objects.filter(status='cancelled').count()
        completed = Appointment.objects.filter(status='completed').count()

        return Response({
            'total_patients': total_patients,
            'total_doctors': total_doctors,
            'total_appointments': total_appointments,
            'pending': pending,
            'confirmed': confirmed,
            'cancelled': cancelled,
            'completed': completed,
        })
