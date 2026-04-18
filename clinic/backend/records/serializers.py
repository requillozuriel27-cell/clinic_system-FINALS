from rest_framework import serializers
from .models import Prescription, MedicalRecord


class PrescriptionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    doctor_specialization = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            'id', 'appointment', 'doctor', 'patient',
            'doctor_name', 'patient_name', 'doctor_specialization',
            'diagnosis', 'medicines', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['doctor', 'created_at', 'updated_at']

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name()

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_doctor_specialization(self, obj):
        if hasattr(obj.doctor, 'doctor_profile'):
            return obj.doctor.doctor_profile.specialization
        return ''


class CreatePrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ['appointment', 'patient', 'diagnosis', 'medicines', 'notes']


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    data = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'patient', 'patient_name', 'record_title',
            'data', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['patient', 'created_by', 'created_at']

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else ''

    def get_data(self, obj):
        try:
            return obj.get_data()
        except Exception:
            return '[Unable to decrypt record]'


class CreateMedicalRecordSerializer(serializers.Serializer):
    patient = serializers.IntegerField()
    record_title = serializers.CharField(max_length=255)
    data = serializers.CharField()
