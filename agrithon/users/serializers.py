from rest_framework import serializers
from .models import User,FarmerCrops

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['name', 'phone', 'userType', 'address', 'city', 'state', 'pincode', 'district', 'country', 'isProfileComplete', 'registrationDate', 'last_active','app_history']


class FarmerCropsSerializer(serializers.ModelSerializer):
    farmer = UserSerializer(read_only=True)

    class Meta:
        model = FarmerCrops
        fields = '__all__'