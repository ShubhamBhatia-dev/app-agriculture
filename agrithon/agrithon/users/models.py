from django.db import models
from django.utils import timezone
from datetime import date
import uuid



class WhatsApp(models.Model):
    name = models.CharField(max_length=100,blank=True,null=True)
    phone = models.CharField(max_length=20,blank=True,null=True)
    last_active = models.DateTimeField(default=timezone.now)
    conversation_history = models.JSONField(default=list, blank=True)

class User(models.Model):
    name = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=15, unique=True, blank=True)
    userType = models.CharField(max_length=100, default="", blank=True)
    address = models.TextField(default="", blank=True)
    city = models.CharField(max_length=100, default="", blank=True)
    state = models.CharField(max_length=100, default="", blank=True)
    pincode = models.CharField(max_length=6, default="", blank=True)
    district = models.CharField(max_length=100, default="", blank=True)
    country = models.CharField(max_length=100, default="", blank=True)
    isProfileComplete = models.BooleanField(default=False, blank=True)
    registrationDate = models.DateField(default=date.today, blank=True)  # Fixed: removed ()
    # Store complete conversation in structured JSON format
    conversation_history = models.JSONField(default=list, blank=True)
    app_history = models.JSONField(default=list, blank=True)
    last_active = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name or 'Unknown'} ({self.phone})"

class FarmerCrops(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)  # Primary key
    farmer = models.ForeignKey(
        'User',  # Links to User model
        on_delete=models.CASCADE,
        related_name='farmer_crops'  # Fixed: unique related_name
    )
    crop_name = models.CharField(max_length=100, blank=True, null=True)
    crop_price = models.FloatField(default=0.0)  # per unit price
    quantity = models.FloatField(default=0.0)  # amount available
    unit = models.CharField(max_length=20, default="kg")  # e.g., kg, ton, liter
    description = models.TextField(blank=True, default="")
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.crop_name or 'Unknown Crop'} by {self.farmer.name if self.farmer else 'Unknown Farmer'}"

class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)  # Primary key
    vendor = models.ForeignKey(
        'User',  # Links to User model
        on_delete=models.CASCADE,
        related_name='vendor_crops'  # Fixed: unique related_name
    )
    crop_name = models.CharField(max_length=100, blank=True, null=True)
    crop_price = models.FloatField(default=0.0)  # per unit price
    quantity = models.FloatField(default=0.0)  # amount available
    unit = models.CharField(max_length=20, default="kg")  # e.g., kg, ton, liter
    description = models.TextField(blank=True, default="")
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.crop_name or 'Unknown Crop'} by {self.vendor.name if self.vendor else 'Unknown Vendor'}"  # Fixed: changed farmer to vendor

class AppHistory(models.Model):
    user = models.ForeignKey(
        'User',  # Links to User model
        on_delete=models.CASCADE,
        related_name='app_history_records'  # Fixed: unique related_name
    )
    title = models.CharField(max_length=200, default="")  # Fixed: removed quotes from max_length
    content = models.JSONField(default=list, blank=True)  # Fixed: removed duplicate field definition

    def __str__(self):
        return f"{self.title} - {self.user.name if self.user else 'Unknown User'}"