from django.urls import path
from .views import (
    AppointmentListView, BookAppointmentView, CancelAppointmentView,
    ConfirmAppointmentView, UpdateAppointmentStatusView,
    AppointmentDetailView, AppointmentStatsView,
)

urlpatterns = [
    path('appointments/', AppointmentListView.as_view(), name='appointment-list'),
    path('appointments/book/', BookAppointmentView.as_view(), name='appointment-book'),
    path('appointments/stats/overview/', AppointmentStatsView.as_view(), name='appointment-stats'),
    path('appointments/<int:pk>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('appointments/<int:pk>/cancel/', CancelAppointmentView.as_view(), name='appointment-cancel'),
    path('appointments/<int:pk>/confirm/', ConfirmAppointmentView.as_view(), name='appointment-confirm'),
    path('appointments/<int:pk>/update-status/', UpdateAppointmentStatusView.as_view(), name='appointment-update-status'),
]