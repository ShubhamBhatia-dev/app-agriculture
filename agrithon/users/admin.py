from django.contrib import admin
from .models import User,AppHistory,FarmerCrops,Chats
# Register your models here.

admin.site.register(User)
admin.site.register(AppHistory)
admin.site.register(FarmerCrops)
admin.site.register(Chats)