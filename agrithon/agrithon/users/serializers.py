from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['name', 'phone', 'userType', 'address', 'city', 'state', 'pincode', 'district', 'country', 'isProfileComplete', 'registrationDate', 'last_active']
