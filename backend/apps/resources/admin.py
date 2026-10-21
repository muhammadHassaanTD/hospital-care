from django.contrib import admin

from .models import Equipment


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ["code", "type", "status", "hospital", "storage_location"]
    list_filter = ["type", "status"]
    search_fields = ["code"]
