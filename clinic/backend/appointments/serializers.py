from rest_framework import serializers
from .models import Appointment
from accounts.serializers import UserSerializer


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    doctor_specialization = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'doctor', 'patient_name', 'doctor_name',
            'doctor_specialization', 'date', 'time', 'status', 'notes', 'created_at',
        ]
        read_only_fields = ['patient', 'status', 'created_at']

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name()

    def get_doctor_specialization(self, obj):
        if hasattr(obj.doctor, 'doctor_profile'):
            return obj.doctor.doctor_profile.specialization
        return ''


class CreateAppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ['doctor', 'date', 'time', 'notes']

    def validate(self, attrs):
        doctor = attrs.get('doctor')
        if doctor.role != 'doctor':
            raise serializers.ValidationError({'doctor': 'Selected user is not a doctor.'})
        # Check for duplicate booking
        date = attrs.get('date')
        time = attrs.get('time')
        if Appointment.objects.filter(
            doctor=doctor, date=date, time=time, status__in=['pending', 'confirmed']
        ).exists():
            raise serializers.ValidationError(
                {'time': 'This time slot is already booked.'}
            )
        return attrs
