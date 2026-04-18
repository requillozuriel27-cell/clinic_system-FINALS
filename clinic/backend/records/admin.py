from django.contrib import admin
from .models import Prescription, MedicalRecord
admin.site.register(Prescription)
admin.site.register(MedicalRecord)
