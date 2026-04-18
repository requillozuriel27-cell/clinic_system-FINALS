from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('doctor', 'Doctor'),
        ('patient', 'Patient'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='patient')
    email = models.EmailField(unique=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

    def get_full_name(self):
        full = super().get_full_name()
        return full if full.strip() else self.username


class DoctorProfile(models.Model):
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name='doctor_profile'
    )
    specialization = models.CharField(max_length=200)
    available_days = models.CharField(
        max_length=200,
        default='Monday,Tuesday,Wednesday,Thursday,Friday'
    )

    def __str__(self):
        return f"Dr. {self.user.username} – {self.specialization}"


class PatientProfile(models.Model):
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name='patient_profile'
    )
    date_of_birth = models.DateField(null=True, blank=True)
    medical_history = models.TextField(blank=True)

    def __str__(self):
        return f"Patient: {self.user.username}"
