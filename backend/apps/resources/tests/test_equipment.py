import pytest
from django.urls import reverse

from apps.accounts.models import Role
from apps.audit.models import AuditLog
from apps.hospitals.models import StorageLocation
from apps.resources.models import Equipment, EquipmentStatus

pytestmark = pytest.mark.django_db


def place(hospital, name="ICU equipment bay"):
    return StorageLocation.objects.create(hospital=hospital, name=name)


def payload(location, **overrides):
    base = {"id": "VENT-04", "type": "ventilator", "locationId": location.pk}
    return {**base, **overrides}


def test_equipment_matches_frontend_shape(client_as, make_hospital):
    hospital = make_hospital()
    bay = place(hospital)
    Equipment.objects.create(
        code="VENT-01",
        type="ventilator",
        status=EquipmentStatus.IN_USE,
        hospital=hospital,
        storage_location=bay,
    )
    [data] = client_as(Role.NURSE, hospital=hospital).get(reverse("equipment-list")).json()
    assert data == {
        "id": "VENT-01",
        "type": "ventilator",
        "location": "ICU equipment bay",
        "locationId": bay.pk,
        "status": "inUse",
    }


def test_list_filters_by_type_and_status(client_as, make_hospital):
    hospital = make_hospital()
    bay = place(hospital)
    Equipment.objects.create(
        code="VENT-01", type="ventilator", status=EquipmentStatus.AVAILABLE, hospital=hospital, storage_location=bay
    )
    Equipment.objects.create(
        code="MON-01", type="monitor", status=EquipmentStatus.AVAILABLE, hospital=hospital, storage_location=bay
    )
    Equipment.objects.create(
        code="VENT-02", type="ventilator", status=EquipmentStatus.IN_USE, hospital=hospital, storage_location=bay
    )
    client = client_as(Role.DOCTOR, hospital=hospital)
    url = reverse("equipment-list")
    by_type = client.get(url, {"type": "ventilator"}).json()
    assert [row["id"] for row in by_type] == ["VENT-01", "VENT-02"]
    both = client.get(url, {"type": "ventilator", "status": "available"}).json()
    assert [row["id"] for row in both] == ["VENT-01"]
    assert [row["id"] for row in client.get(url, {"type": "nope"}).json()] == ["MON-01", "VENT-01", "VENT-02"]


def test_list_shows_only_the_users_hospital(client_as, make_hospital):
    here, there = make_hospital("Here"), make_hospital("There")
    Equipment.objects.create(
        code="VENT-01", type="ventilator", hospital=here, storage_location=place(here)
    )
    Equipment.objects.create(
        code="MON-09", type="monitor", hospital=there, storage_location=place(there, "Emergency bay")
    )
    rows = client_as(Role.NURSE, hospital=here).get(reverse("equipment-list")).json()
    assert [row["id"] for row in rows] == ["VENT-01"]


@pytest.mark.parametrize(("role", "code"), [(Role.NURSE, 201), (Role.ADMIN, 201), (Role.DOCTOR, 403), (Role.PHARMACIST, 403)])
def test_register_requires_edit_role(client_as, make_hospital, role, code):
    hospital = make_hospital()
    bay = place(hospital)
    response = client_as(role, hospital=hospital).post(reverse("equipment-list"), payload(bay), format="json")
    assert response.status_code == code


def test_register_starts_available_and_is_audit_logged(client_as, make_hospital):
    hospital = make_hospital()
    bay = place(hospital)
    response = client_as(Role.NURSE, hospital=hospital).post(
        reverse("equipment-list"), payload(bay, id=" vent-04 "), format="json"
    )
    assert response.status_code == 201
    assert response.json()["status"] == "available"
    assert response.json()["location"] == "ICU equipment bay"
    saved = Equipment.objects.get()
    assert saved.code == "vent-04" and saved.hospital == hospital and saved.status == EquipmentStatus.AVAILABLE
    entry = AuditLog.objects.get(action="equipment.registered")
    assert entry.target_repr == "vent-04"
    assert entry.after["id"] == "vent-04"


def test_register_rejects_duplicate_identifier_ignoring_case(client_as, make_hospital):
    hospital = make_hospital()
    bay = place(hospital)
    Equipment.objects.create(code="VENT-04", type="monitor", hospital=hospital, storage_location=bay)
    response = client_as(Role.NURSE, hospital=hospital).post(
        reverse("equipment-list"), payload(bay, id="vent-04"), format="json"
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["id"][0]


def test_register_rejects_a_location_at_another_hospital(client_as, make_hospital):
    here, there = make_hospital("Here"), make_hospital("There")
    theirs = place(there)
    response = client_as(Role.NURSE, hospital=here).post(reverse("equipment-list"), payload(theirs), format="json")
    assert response.status_code == 400
    assert "your hospital" in response.json()["locationId"][0]
    assert not Equipment.objects.exists()


def test_register_rejects_an_account_with_no_hospital(client_as, make_hospital):
    bay = place(make_hospital())
    response = client_as(Role.ADMIN).post(reverse("equipment-list"), payload(bay), format="json")
    assert response.status_code == 400
    assert "isn’t linked" in response.json()["locationId"][0]
