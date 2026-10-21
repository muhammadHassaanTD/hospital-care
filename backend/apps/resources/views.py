from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import module_permission
from apps.resources.state_machine import TransitionNotAllowed

from .models import Equipment, EquipmentStatus, EquipmentType
from .serializers import EquipmentActionSerializer, EquipmentCreateSerializer, EquipmentSerializer
from .services import apply_equipment_action, register_equipment

EquipmentAccess = module_permission("equipment")


def own_hospital(queryset, user):
    """Users who work at a hospital see only its rows; admins without one see the whole network."""
    return queryset.filter(hospital_id=user.hospital_id) if user.hospital_id else queryset


class EquipmentListView(APIView):
    """GET /api/equipment/ → the machines in the user's hospital.
    Optional filters: ?type=ventilator&status=available.
    POST registers one (equipment: edit). New equipment is available."""

    permission_classes = [EquipmentAccess]

    def get(self, request):
        equipment = own_hospital(Equipment.objects.select_related("storage_location"), request.user)
        wanted_type = request.query_params.get("type")
        if wanted_type in EquipmentType.values:
            equipment = equipment.filter(type=wanted_type)
        wanted_status = request.query_params.get("status")
        if wanted_status in EquipmentStatus.values:
            equipment = equipment.filter(status=wanted_status)
        # Matching asks with ?forMatching=1 and must not be offered a machine in maintenance.
        if request.query_params.get("forMatching") in {"1", "true"}:
            equipment = equipment.for_matching()
        return Response(EquipmentSerializer(equipment, many=True).data)

    def post(self, request):
        serializer = EquipmentCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        equipment = register_equipment(serializer, request.user)
        return Response(EquipmentSerializer(equipment).data, status=status.HTTP_201_CREATED)


class EquipmentActionView(APIView):
    """POST /api/equipment/<id>/actions/ {"action": "startMaintenance"} → the updated machine."""

    permission_classes = [EquipmentAccess]

    def post(self, request, code):
        serializer = EquipmentActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not Equipment.objects.filter(code=code).exists():
            return Response({"detail": "No equipment with that id."}, status=status.HTTP_404_NOT_FOUND)
        try:
            equipment = apply_equipment_action(code, serializer.validated_data["action"], actor=request.user)
        except TransitionNotAllowed as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(EquipmentSerializer(equipment).data)
