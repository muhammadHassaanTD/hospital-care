from django.urls import path

from . import views

urlpatterns = [
    path("", views.EquipmentListView.as_view(), name="equipment-list"),
    path("<str:code>/actions/", views.EquipmentActionView.as_view(), name="equipment-action"),
]
