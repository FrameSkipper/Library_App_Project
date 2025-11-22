from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'books', views.BookViewSet)
router.register(r'publishers', views.PublisherViewSet)
router.register(r'transactions', views.TransactionViewSet)
router.register(r'reports', views.ReportViewSet)
router.register(r'staff', views.StaffViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/sales/', views.sales_analytics, name='sales-analytics'),
    path('analytics/inventory/', views.inventory_analytics, name='inventory-analytics'),
    path('analytics/customers/', views.customer_analytics, name='customer-analytics'),
]