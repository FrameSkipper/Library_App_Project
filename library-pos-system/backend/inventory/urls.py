from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'books', views.BookViewSet)
router.register(r'publishers', views.PublisherViewSet)
router.register(r'transactions', views.TransactionViewSet)
router.register(r'reports', views.ReportViewSet)
router.register(r'staff', views.StaffViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('analytics/sales/', views.sales_analytics, name='sales-analytics'),
    path('analytics/inventory/', views.inventory_analytics, name='inventory-analytics'),
    path('analytics/customers/', views.customer_analytics, name='customer-analytics'),
]