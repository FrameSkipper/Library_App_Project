# inventory/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, F
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Book, Publisher, Transaction, Staff
from .serializers import BookSerializer, PublisherSerializer, TransactionSerializer, StaffSerializer

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Book.objects.all()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(title__icontains=search)
        return queryset

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get books with stock quantity below threshold"""
        threshold = int(request.query_params.get('threshold', 10))
        low_stock_books = self.queryset.filter(stock_qty__lte=threshold)
        serializer = self.get_serializer(low_stock_books, many=True)
        return Response(serializer.data)


class PublisherViewSet(viewsets.ModelViewSet):
    queryset = Publisher.objects.all()
    serializer_class = PublisherSerializer
    permission_classes = [IsAuthenticated]


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's transactions"""
        today = timezone.now().date()
        today_transactions = self.queryset.filter(trans_date__date=today)
        serializer = self.get_serializer(today_transactions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get transaction statistics"""
        period = request.query_params.get('period', 'daily')
        
        if period == 'daily':
            start_date = timezone.now().date()
        elif period == 'weekly':
            start_date = timezone.now().date() - timedelta(days=7)
        elif period == 'monthly':
            start_date = timezone.now().date() - timedelta(days=30)
        else:
            start_date = timezone.now().date()

        transactions = self.queryset.filter(trans_date__date__gte=start_date)
        
        stats = transactions.aggregate(
            total_revenue=Sum('total_amount'),
            total_transactions=Count('trans_id'),
            avg_transaction=Avg('total_amount')
        )

        return Response({
            'period': period,
            'start_date': start_date,
            'total_revenue': float(stats['total_revenue'] or 0),
            'total_transactions': stats['total_transactions'] or 0,
            'avg_transaction': float(stats['avg_transaction'] or 0),
        })


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated]


class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def sales_report(self, request):
        """Generate sales report"""
        period = request.query_params.get('period', 'daily')
        
        if period == 'daily':
            start_date = timezone.now().date()
        elif period == 'weekly':
            start_date = timezone.now().date() - timedelta(days=7)
        elif period == 'monthly':
            start_date = timezone.now().date() - timedelta(days=30)
        else:
            start_date = timezone.now().date()

        transactions = Transaction.objects.filter(trans_date__date__gte=start_date)
        
        report = {
            'period': period,
            'start_date': str(start_date),
            'total_sales': float(transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
            'transaction_count': transactions.count(),
            'transactions': TransactionSerializer(transactions, many=True).data
        }

        return Response(report)

    @action(detail=False, methods=['get'])
    def inventory_report(self, request):
        """Generate inventory report"""
        books = Book.objects.all()
        
        total_books = books.count()
        total_stock = books.aggregate(Sum('stock_qty'))['stock_qty__sum'] or 0
        total_value = sum(
            float(book.stock_qty * book.unit_price) 
            for book in books
        )
        low_stock = books.filter(stock_qty__lte=10).count()

        report = {
            'total_books': total_books,
            'total_stock': total_stock,
            'total_value': total_value,
            'low_stock_items': low_stock,
            'books': BookSerializer(books, many=True).data
        }

        return Response(report)


class AnalyticsViewSet(viewsets.ViewSet):
    """
    Analytics endpoints for dashboard insights
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def customers(self, request):
        """
        Get customer analytics
        """
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        transactions = Transaction.objects.filter(trans_date__date__gte=start_date)
        
        # Basic customer analytics based on transactions
        analytics = {
            'total_customers': transactions.values('staff').distinct().count(),
            'repeat_customers': 0,
            'new_customers': 0,
            'customer_retention_rate': 0,
            'avg_customer_value': float(
                transactions.aggregate(Avg('total_amount'))['total_amount__avg'] or 0
            ),
            'period_days': days,
        }
        
        return Response(analytics)

    @action(detail=False, methods=['get'])
    def inventory(self, request):
        """
        Get inventory analytics
        """
        days = int(request.query_params.get('days', 30))
        
        books = Book.objects.all()
        
        total_books = books.count()
        total_stock = books.aggregate(Sum('stock_qty'))['stock_qty__sum'] or 0
        total_value = sum(
            float(book.stock_qty * book.unit_price) 
            for book in books
        )
        low_stock_count = books.filter(stock_qty__lte=10).count()
        out_of_stock = books.filter(stock_qty=0).count()
        
        analytics = {
            'total_books': total_books,
            'total_stock_quantity': total_stock,
            'total_inventory_value': total_value,
            'low_stock_items': low_stock_count,
            'out_of_stock_items': out_of_stock,
            'avg_book_value': total_value / total_books if total_books > 0 else 0,
            'period_days': days,
        }
        
        return Response(analytics)

    @action(detail=False, methods=['get'])
    def sales(self, request):
        """
        Get sales analytics with time-based grouping
        """
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        transactions = Transaction.objects.filter(trans_date__date__gte=start_date)
        
        total_revenue = transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_transactions = transactions.count()
        avg_transaction = transactions.aggregate(Avg('total_amount'))['total_amount__avg'] or 0
        
        # Group by date for chart data
        sales_by_date = {}
        for trans in transactions:
            date_key = trans.trans_date.date().isoformat()
            if date_key not in sales_by_date:
                sales_by_date[date_key] = {
                    'date': date_key,
                    'revenue': 0,
                    'transactions': 0
                }
            sales_by_date[date_key]['revenue'] += float(trans.total_amount)
            sales_by_date[date_key]['transactions'] += 1
        
        analytics = {
            'total_revenue': float(total_revenue),
            'total_transactions': total_transactions,
            'avg_transaction_value': float(avg_transaction),
            'period_days': days,
            'sales_by_date': list(sales_by_date.values()),
        }
        
        return Response(analytics)

    @action(detail=False, methods=['get'])
    def per_period(self, request):
        """
        Get sales data grouped by period (daily, weekly, monthly)
        """
        period = request.query_params.get('period', 'daily')
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        transactions = Transaction.objects.filter(trans_date__date__gte=start_date)
        
        # Group by day
        sales_data = []
        current_date = start_date
        while current_date <= timezone.now().date():
            day_transactions = transactions.filter(trans_date__date=current_date)
            sales_data.append({
                'period': current_date.isoformat(),
                'revenue': float(day_transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
                'transactions': day_transactions.count()
            })
            current_date += timedelta(days=1)
        
        return Response({
            'period': period,
            'days': days,
            'data': sales_data
        })