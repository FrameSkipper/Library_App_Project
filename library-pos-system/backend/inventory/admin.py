"""
Django admin configuration.
Provides user-friendly interface for managing data.
"""

from django.contrib import admin
from .models import Book, Publisher, Transaction, TransactionDetail, Staff, Report


@admin.register(Publisher)
class PublisherAdmin(admin.ModelAdmin):
    """Admin interface for Publisher model"""
    list_display = ['pub_id', 'name', 'email', 'phone', 'created_at']
    search_fields = ['name', 'email']
    list_filter = ['created_at']


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    """Admin interface for Book model"""
    list_display = ['book_id', 'title', 'author', 'isbn', 'stock_qty', 'unit_price', 'pub']
    list_filter = ['pub', 'created_at']
    search_fields = ['title', 'author', 'isbn']
    list_editable = ['stock_qty', 'unit_price']
    
    def get_queryset(self, request):
        """Optimize queries"""
        return super().get_queryset(request).select_related('pub')


class TransactionDetailInline(admin.TabularInline):
    """Inline display of transaction details"""
    model = TransactionDetail
    extra = 0
    readonly_fields = ['line_total']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """Admin interface for Transaction model"""
    list_display = ['trans_id', 'trans_date', 'total_amount', 'staff', 'customer_name']
    list_filter = ['trans_date', 'staff']
    search_fields = ['trans_id', 'customer_name']
    inlines = [TransactionDetailInline]
    readonly_fields = ['trans_date', 'total_amount']


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    """Admin interface for Staff model"""
    list_display = ['staff_id', 'name', 'email', 'role', 'created_at']
    list_filter = ['role']
    search_fields = ['name', 'email']


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    """Admin interface for Report model"""
    list_display = ['report_id', 'type', 'date', 'staff']
    list_filter = ['type', 'date']
    search_fields = ['report_id']
    readonly_fields = ['date', 'created_at']