from django.urls import path
from .views import (
    PrescriptionListView, CreatePrescriptionView, UpdatePrescriptionView,
    MedicalRecordListView, CreateMedicalRecordView,
)

urlpatterns = [
    path('prescriptions/', PrescriptionListView.as_view(), name='prescription-list'),
    path('prescriptions/create/', CreatePrescriptionView.as_view(), name='prescription-create'),
    path('prescriptions/<int:pk>/update/', UpdatePrescriptionView.as_view(), name='prescription-update'),
    path('records/', MedicalRecordListView.as_view(), name='record-list'),
    path('records/create/', CreateMedicalRecordView.as_view(), name='record-create'),
]
