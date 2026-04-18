from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser, DoctorProfile, PatientProfile


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    specialization = serializers.CharField(required=False, allow_blank=True, default='')
    date_of_birth = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'password',
            'first_name', 'last_name', 'role',
            'specialization', 'date_of_birth',
        ]

    def validate(self, attrs):
        role = attrs.get('role', 'patient')
        if role == 'admin':
            raise serializers.ValidationError(
                {'role': 'Cannot self-register as admin.'}
            )
        if role == 'doctor' and not attrs.get('specialization', '').strip():
            raise serializers.ValidationError(
                {'specialization': 'Specialization is required for doctors.'}
            )
        return attrs

    def create(self, validated_data):
        specialization = validated_data.pop('specialization', '')
        date_of_birth = validated_data.pop('date_of_birth', None)

        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'patient'),
        )

        if user.role == 'doctor':
            DoctorProfile.objects.create(user=user, specialization=specialization)
        elif user.role == 'patient':
            PatientProfile.objects.create(user=user, date_of_birth=date_of_birth)

        return user


class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = ['specialization', 'available_days']


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ['date_of_birth', 'medical_history']


class UserSerializer(serializers.ModelSerializer):
    specialization = serializers.SerializerMethodField()
    date_of_birth = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'specialization', 'date_of_birth',
        ]

    def get_specialization(self, obj):
        if obj.role == 'doctor' and hasattr(obj, 'doctor_profile'):
            return obj.doctor_profile.specialization
        return None

    def get_date_of_birth(self, obj):
        if obj.role == 'patient' and hasattr(obj, 'patient_profile'):
            dob = obj.patient_profile.date_of_birth
            return str(dob) if dob else None
        return None
