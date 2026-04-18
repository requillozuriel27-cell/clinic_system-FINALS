from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Prescription, MedicalRecord
from .serializers import (
    PrescriptionSerializer, CreatePrescriptionSerializer,
    MedicalRecordSerializer, CreateMedicalRecordSerializer,
)
from accounts.models import CustomUser
from notifications.utils import send_notification


class PrescriptionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrescriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return Prescription.objects.filter(patient=user).select_related('doctor', 'patient')
        elif user.role == 'doctor':
            patient_id = self.request.query_params.get('patient_id')
            qs = Prescription.objects.filter(doctor=user).select_related('doctor', 'patient')
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
            return qs
        elif user.role == 'admin':
            return Prescription.objects.all().select_related('doctor', 'patient')
        return Prescription.objects.none()


class CreatePrescriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'doctor':
            return Response({'error': 'Only doctors can create prescriptions.'}, status=403)

        serializer = CreatePrescriptionSerializer(data=request.data)
        if serializer.is_valid():
            prescription = serializer.save(doctor=request.user)

            # Notify patient
            send_notification(
                prescription.patient,
                f'Dr. {request.user.get_full_name()} has added a new prescription for you.',
                notif_type='new_prescription',
                extra={'prescription_id': prescription.id},
            )

            return Response(
                PrescriptionSerializer(prescription).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdatePrescriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        if request.user.role != 'doctor':
            return Response({'error': 'Only doctors can update prescriptions.'}, status=403)

        prescription = get_object_or_404(Prescription, pk=pk, doctor=request.user)
        serializer = CreatePrescriptionSerializer(prescription, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(PrescriptionSerializer(prescription).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MedicalRecordListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MedicalRecordSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return MedicalRecord.objects.filter(patient=user).select_related('patient', 'created_by')
        elif user.role == 'doctor':
            from appointments.models import Appointment
            patient_ids = Appointment.objects.filter(
                doctor=user
            ).values_list('patient_id', flat=True).distinct()
            patient_id = self.request.query_params.get('patient_id')
            qs = MedicalRecord.objects.filter(patient_id__in=patient_ids)
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
            return qs.select_related('patient', 'created_by')
        elif user.role == 'admin':
            return MedicalRecord.objects.all().select_related('patient', 'created_by')
        return MedicalRecord.objects.none()


class CreateMedicalRecordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ('doctor', 'admin'):
            return Response({'error': 'Unauthorized.'}, status=403)

        serializer = CreateMedicalRecordSerializer(data=request.data)
        if serializer.is_valid():
            patient = get_object_or_404(CustomUser, pk=serializer.validated_data['patient'])
            record = MedicalRecord(
                patient=patient,
                record_title=serializer.validated_data['record_title'],
                created_by=request.user,
            )
            record.set_data(serializer.validated_data['data'])
            record.save()
            return Response(
                MedicalRecordSerializer(record).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
