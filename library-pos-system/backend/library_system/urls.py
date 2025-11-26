"""
Main URL Configuration for library_system project.
Routes /api/ to the inventory app's API endpoints.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # JWT Token endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API endpoints - routes to inventory app
    path('api/', include('inventory.urls')),
]