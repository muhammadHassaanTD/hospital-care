import django.db.models.deletion
import django.db.models.functions.text
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("hospitals", "0004_bed_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="Equipment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "hospital",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to="hospitals.hospital",
                    ),
                ),
                (
                    "storage_location",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to="hospitals.storagelocation",
                    ),
                ),
                ("status_since", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "code",
                    models.CharField(help_text="Asset identifier, e.g. VENT-04. Also the API id.", max_length=20),
                ),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("ventilator", "Ventilator"),
                            ("monitor", "Monitor"),
                            ("defibrillator", "Defibrillator"),
                            ("dialysis", "Dialysis"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("available", "Available"),
                            ("inUse", "In use"),
                            ("maintenance", "Maintenance"),
                            ("outOfService", "Out of service"),
                        ],
                        default="available",
                        max_length=20,
                    ),
                ),
            ],
            options={
                "ordering": ["type", "code"],
                "indexes": [
                    models.Index(fields=["type", "status"], name="resources_equip_type_status")
                ],
                "constraints": [
                    models.UniqueConstraint(
                        django.db.models.functions.text.Lower("code"),
                        name="resources_equip_code_ci_uniq",
                    )
                ],
            },
        ),
    ]
