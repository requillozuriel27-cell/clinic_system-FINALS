from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet
from accounts.models import CustomUser
from appointments.models import Appointment


def get_fernet():
    key = settings.FERNET_KEY
    if not key:
        # Development fallback — generates a temporary key (data lost on restart)
        key = Fernet.generate_key().decode()
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


class Prescription(models.Model):
    appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE, related_name='prescriptions',
        null=True, blank=True,
    )
    doctor = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='doctor_prescriptions'
    )
    patient = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='patient_prescriptions'
    )
    diagnosis = models.TextField()
    medicines = models.TextField(help_text='List medicines separated by newlines')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"Prescription by Dr. {self.doctor.username} "
            f"for {self.patient.username} on {self.created_at.date()}"
        )


class MedicalRecord(models.Model):
    patient = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='medical_records'
    )
    _encrypted_data = models.BinaryField(db_column='encrypted_data')
    record_title = models.CharField(max_length=255, default='Medical Record')
    created_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_records'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def set_data(self, plain_text: str):
        f = get_fernet()
        self._encrypted_data = f.encrypt(plain_text.encode())

    def get_data(self) -> str:
        f = get_fernet()
        return f.decrypt(bytes(self._encrypted_data)).decode()

    def __str__(self):
        return f"MedicalRecord[{self.record_title}] – {self.patient.username}"
