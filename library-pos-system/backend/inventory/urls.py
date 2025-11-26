"""
URL Configuration for inventory app API endpoints.
Registers all ViewSets for the REST API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router and register ViewSets
router = DefaultRouter()
router.register(r'books', views.BookViewSet, basename='book')
router.register(r'publishers', views.PublisherViewSet, basename='publisher')
router.register(r'transactions', views.TransactionViewSet, basename='transaction')
router.register(r'reports', views.ReportViewSet, basename='report')
router.register(r'staff', views.StaffViewSet, basename='staff')

urlpatterns = [
    # Include all router URLs
    path('', include(router.urls)),
]