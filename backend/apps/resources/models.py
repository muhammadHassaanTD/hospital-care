from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from .state_machine import StateMachine


class Resource(models.Model):
    """
    What every shared resource has: the hospital that owns it, where it's stored, and when its status last
    changed. Subclasses add their own `status` field (with their choices) and a `machine` (StateMachine).
    Status changes go through apps.resources.services.change_status, never by setting `status` directly.
    """

    machine: StateMachine

    # Nullable only for rows from before Sprint 2; seed_demo backfills them. New rows always get one.
    hospital = models.ForeignKey(
        "hospitals.Hospital", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    storage_location = models.ForeignKey(
        "hospitals.StorageLocation", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    status_since = models.DateTimeField(default=timezone.now)

    class Meta:
        abstract = True


class EquipmentType(models.TextChoices):
    """Critical equipment a hospital can locate and share (story 2.2)."""

    VENTILATOR = "ventilator", "Ventilator"
    MONITOR = "monitor", "Monitor"
    DEFIBRILLATOR = "defibrillator", "Defibrillator"
    DIALYSIS = "dialysis", "Dialysis"


class EquipmentStatus(models.TextChoices):
    AVAILABLE = "available", "Available"
    IN_USE = "inUse", "In use"
    MAINTENANCE = "maintenance", "Maintenance"
    OUT_OF_SERVICE = "outOfService", "Out of service"


E = EquipmentStatus

# available ↔ in use; available → maintenance → available; any of those → out of service.
EQUIPMENT_LIFECYCLE = StateMachine(
    "piece of equipment",
    EquipmentStatus,
    {
        (E.AVAILABLE, "startUse"): E.IN_USE,
        (E.IN_USE, "finishUse"): E.AVAILABLE,
        (E.AVAILABLE, "startMaintenance"): E.MAINTENANCE,
        (E.MAINTENANCE, "finishMaintenance"): E.AVAILABLE,
        (E.AVAILABLE, "outOfService"): E.OUT_OF_SERVICE,
        (E.IN_USE, "outOfService"): E.OUT_OF_SERVICE,
        (E.MAINTENANCE, "outOfService"): E.OUT_OF_SERVICE,
    },
)


class EquipmentQuerySet(models.QuerySet):
    def for_matching(self):
        """
        Machines another hospital may be offered. Only `available` is working and free.
        Maintenance is never a candidate. Out of service is not working. In use is already with a patient.
        """
        return self.filter(status=EquipmentStatus.AVAILABLE)


class Equipment(Resource):
    """One machine. `code` is the asset identifier staff use to find it. Hospital comes from the registrar."""

    objects = EquipmentQuerySet.as_manager()
    machine = EQUIPMENT_LIFECYCLE

    code = models.CharField(max_length=20, help_text="Asset identifier, e.g. VENT-04. Also the API id.")
    type = models.CharField(max_length=20, choices=EquipmentType.choices)
    status = models.CharField(max_length=20, choices=EquipmentStatus.choices, default=EquipmentStatus.AVAILABLE)

    class Meta:
        ordering = ["type", "code"]
        constraints = [
            models.UniqueConstraint(Lower("code"), name="resources_equip_code_ci_uniq")
        ]
        indexes = [models.Index(fields=["type", "status"], name="resources_equip_type_status")]

    def __str__(self):
        return self.code
