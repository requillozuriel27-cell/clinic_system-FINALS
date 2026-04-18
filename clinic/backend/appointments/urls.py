from django.urls import path
from .views import (
    AppointmentListView, BookAppointmentView, CancelAppointmentView,
    AppointmentDetailView, AppointmentStatsView,
)

urlpatterns = [
    path('appointments/', AppointmentListView.as_view(), name='appointment-list'),
    path('appointments/book/', BookAppointmentView.as_view(), name='appointment-book'),
    path('appointments/<int:pk>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('appointments/<int:pk>/cancel/', CancelAppointmentView.as_view(), name='appointment-cancel'),
    path('appointments/stats/overview/', AppointmentStatsView.as_view(), name='appointment-stats'),
]
