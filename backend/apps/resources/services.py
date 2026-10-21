from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.accounts.permissions import may_change
from apps.audit.services import record

from .models import Equipment, EquipmentStatus, Resource
from .serializers import EquipmentSerializer


def change_status(resource: Resource, action: str, *, actor, reason: str = "") -> Resource:
    """
    Move `resource` along its lifecycle and record who did it, when and why in the audit log.
    Raises TransitionNotAllowed and saves nothing if the machine refuses. The caller holds the row lock
    (select_for_update inside transaction.atomic), so two people can't move the same resource at once.
    """
    before = resource.status
    resource.status = type(resource).machine.next(before, action)
    resource.status_since = timezone.now()
    resource.save()
    record(
        actor,
        f"{resource._meta.model_name}.status_changed",
        resource,
        before={"status": before},
        after={"status": resource.status},
        reason=reason or action,
    )
    return resource


def register_equipment(serializer, actor) -> Equipment:
    """Create equipment from a valid serializer, at the actor's hospital, and audit-log it."""
    equipment = serializer.save(hospital=actor.hospital, status=EquipmentStatus.AVAILABLE)
    record(actor, "equipment.registered", equipment, after=dict(EquipmentSerializer(equipment).data))
    return equipment


@transaction.atomic
def apply_equipment_action(code: str, action: str, *, actor) -> Equipment:
    """
    Move one machine along EQUIPMENT_LIFECYCLE. The row is locked, so two people can't change it at once.
    Raises PermissionDenied for another hospital's machine, TransitionNotAllowed for a refused move.
    """
    equipment = Equipment.objects.select_for_update().select_related("storage_location").get(code=code)
    if not may_change(actor, equipment):
        raise PermissionDenied("You can only change equipment in your own hospital.")
    return change_status(equipment, action, actor=actor)
