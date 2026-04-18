from django.db import models
from accounts.models import CustomUser


class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]

    patient = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='patient_appointments'
    )
    doctor = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='doctor_appointments'
    )
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-time']

    def __str__(self):
        return (
            f"Appointment: {self.patient.username} with Dr. {self.doctor.username} "
            f"on {self.date} at {self.time} [{self.status}]"
        )
