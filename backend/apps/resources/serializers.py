from rest_framework import serializers

from apps.hospitals.models import StorageLocation

from .models import EQUIPMENT_LIFECYCLE, Equipment, EquipmentType


class EquipmentSerializer(serializers.ModelSerializer):
    """Shape of `Equipment` in frontend/src/api/equipment.ts."""

    id = serializers.CharField(source="code")
    location = serializers.CharField(source="storage_location.name")
    locationId = serializers.IntegerField(source="storage_location_id")

    class Meta:
        model = Equipment
        fields = ["id", "type", "location", "locationId", "status"]


class EquipmentCreateSerializer(serializers.ModelSerializer):
    """POST /api/equipment/ (story 2.2). Status is always available; the lifecycle moves it later."""

    id = serializers.CharField(source="code", max_length=20)
    locationId = serializers.PrimaryKeyRelatedField(
        source="storage_location", queryset=StorageLocation.objects.all()
    )

    class Meta:
        model = Equipment
        fields = ["id", "type", "locationId"]

    def validate_id(self, value):
        code = value.strip()
        if not code:
            raise serializers.ValidationError("Enter an identifier.")
        if Equipment.objects.filter(code__iexact=code).exists():
            raise serializers.ValidationError("Equipment with this identifier already exists.")
        return code

    def validate_type(self, value):
        if value not in EquipmentType.values:
            raise serializers.ValidationError("Choose a type.")
        return value

    def validate_locationId(self, location):
        hospital = getattr(self.context["request"].user, "hospital", None)
        if hospital is None:
            raise serializers.ValidationError("Your account isn’t linked to a hospital.")
        if location.hospital_id != hospital.id:
            raise serializers.ValidationError("Choose a location at your hospital.")
        return location


class EquipmentActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=EQUIPMENT_LIFECYCLE.actions)
