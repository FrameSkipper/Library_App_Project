from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.http import HttpResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

def home(request):
    """Simple home page"""
    return HttpResponse("""
        <html>
            <head><title>Library POS System</title></head>
            <body style="font-family: Arial; padding: 50px; text-align: center;">
                <h1>📚 Library POS System API</h1>
                <p>Welcome to the Library Inventory & Billing System</p>
                <ul style="list-style: none;">
                    <li><a href="/api/">📡 API Root</a></li>
                    <li><a href="/api/books/">📖 Books</a></li>
                    <li><a href="/api/transactions/">💰 Transactions</a></li>
                    <li><a href="/api/reports/">📊 Reports</a></li>
                    <li><a href="/admin/">⚙️ Admin Panel</a></li>
                </ul>
            </body>
        </html>
    """)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('inventory.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]