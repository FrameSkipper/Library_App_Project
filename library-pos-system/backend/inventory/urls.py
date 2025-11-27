"""
URL Configuration for inventory app API endpoints.
Includes Analytics endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'books', views.BookViewSet, basename='book')
router.register(r'publishers', views.PublisherViewSet, basename='publisher')
router.register(r'transactions', views.TransactionViewSet, basename='transaction')
router.register(r'reports', views.ReportViewSet, basename='report')
router.register(r'staff', views.StaffViewSet, basename='staff')
router.register(r'analytics', views.AnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]