from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Book, Publisher, Transaction, TransactionDetail, Staff, Report
from .serializers import BookSerializer, PublisherSerializer, TransactionSerializer, StaffSerializer, ReportSerializer
from django.db.models import Sum, Count, Avg, F
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from datetime import datetime, timedelta
from rest_framework.decorators import api_view

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

class PublisherViewSet(viewsets.ModelViewSet):
    queryset = Publisher.objects.all()
    serializer_class = PublisherSerializer
    permission_classes = [IsAuthenticated]

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Override create to ensure proper context and better error handling"""
        print(f"\n{'='*50}")
        print(f"TRANSACTION CREATE REQUEST")
        print(f"{'='*50}")
        print(f"User: {request.user}")
        print(f"Authenticated: {request.user.is_authenticated}")
        print(f"Data received: {request.data}")
        
        # Check if user has staff profile
        try:
            staff = Staff.objects.get(user=request.user)
            print(f"✓ Staff found: {staff.name} (ID: {staff.staff_id})")
        except Staff.DoesNotExist:
            print(f"✗ No staff profile for user: {request.user.username}")
            return Response(
                {'error': f'No staff profile found for user "{request.user.username}". Please contact administrator.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get serializer with context
        serializer = self.get_serializer(data=request.data)
        
        print(f"Serializer context: {serializer.context.keys()}")
        
        try:
            serializer.is_valid(raise_exception=True)
            print(f"✓ Validation passed")
            self.perform_create(serializer)
            print(f"✓ Transaction created successfully")
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            print(f"✗ Error: {str(e)}")
            raise

class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated]

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

@api_view(['GET'])
def sales_analytics(request):
    """
    Advanced sales analytics with multiple time periods and metrics
    """
    period = request.query_params.get('period', 'daily')  # daily, weekly, monthly
    days = int(request.query_params.get('days', 30))
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Base queryset
    transactions = Transaction.objects.filter(
        trans_date__gte=start_date,
        trans_date__lte=end_date
    )
    
    # Group by period
    if period == 'daily':
        trunc_func = TruncDate
    elif period == 'weekly':
        trunc_func = TruncWeek
    else:
        trunc_func = TruncMonth
    
    # Sales over time
    sales_over_time = transactions.annotate(
        period=trunc_func('trans_date')
    ).values('period').annotate(
        total_sales=Sum('total_amount'),
        transaction_count=Count('trans_id'),
        avg_transaction=Avg('total_amount')
    ).order_by('period')
    
    # Top selling books
    top_books = TransactionDetail.objects.filter(
        trans__trans_date__gte=start_date
    ).values(
        'book__title',
        'book__author',
        'book__book_id'
    ).annotate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum('line_total')
    ).order_by('-total_quantity')[:10]
    
    # Revenue by category/genre (if you have genres)
    # This assumes you add a genre field to Book model
    
    # Staff performance
    staff_performance = Transaction.objects.filter(
        trans_date__gte=start_date
    ).values(
        'staff__name',
        'staff__staff_id'
    ).annotate(
        total_sales=Sum('total_amount'),
        transaction_count=Count('trans_id'),
        avg_sale=Avg('total_amount')
    ).order_by('-total_sales')
    
    # Overall metrics
    overall = transactions.aggregate(
        total_revenue=Sum('total_amount'),
        total_transactions=Count('trans_id'),
        avg_transaction_value=Avg('total_amount')
    )
    
    # Calculate growth compared to previous period
    prev_start = start_date - timedelta(days=days)
    previous_period = Transaction.objects.filter(
        trans_date__gte=prev_start,
        trans_date__lt=start_date
    ).aggregate(
        total_revenue=Sum('total_amount'),
        total_transactions=Count('trans_id')
    )
    
    growth_rate = 0
    if previous_period['total_revenue']:
        growth_rate = ((overall['total_revenue'] or 0) - (previous_period['total_revenue'] or 0)) / previous_period['total_revenue'] * 100
    
    return Response({
        'period': period,
        'date_range': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat()
        },
        'overall_metrics': {
            **overall,
            'growth_rate': round(growth_rate, 2),
            'previous_period_revenue': previous_period['total_revenue']
        },
        'sales_over_time': list(sales_over_time),
        'top_selling_books': list(top_books),
        'staff_performance': list(staff_performance)
    })


@api_view(['GET'])
def inventory_analytics(request):
    """
    Detailed inventory analytics
    """
    # Stock distribution
    stock_distribution = {
        'out_of_stock': Book.objects.filter(stock_qty=0).count(),
        'low_stock': Book.objects.filter(stock_qty__gt=0, stock_qty__lt=5).count(),
        'medium_stock': Book.objects.filter(stock_qty__gte=5, stock_qty__lt=20).count(),
        'high_stock': Book.objects.filter(stock_qty__gte=20).count()
    }
    
    # Inventory value by publisher
    value_by_publisher = Book.objects.values(
        'pub__name',
        'pub__pub_id'
    ).annotate(
        total_books=Sum('stock_qty'),
        total_value=Sum(F('stock_qty') * F('unit_price')),
        avg_price=Avg('unit_price')
    ).order_by('-total_value')
    
    # Price distribution
    price_ranges = {
        'under_10': Book.objects.filter(unit_price__lt=10).count(),
        'between_10_25': Book.objects.filter(unit_price__gte=10, unit_price__lt=25).count(),
        'between_25_50': Book.objects.filter(unit_price__gte=25, unit_price__lt=50).count(),
        'over_50': Book.objects.filter(unit_price__gte=50).count()
    }
    
    # Books needing restock
    restock_needed = Book.objects.filter(
        stock_qty__lt=5
    ).values(
        'book_id', 'title', 'author', 'stock_qty', 'unit_price', 'pub__name'
    ).order_by('stock_qty')
    
    # Total inventory value
    total_inventory = Book.objects.aggregate(
        total_books=Sum('stock_qty'),
        total_value=Sum(F('stock_qty') * F('unit_price')),
        unique_titles=Count('book_id'),
        avg_price=Avg('unit_price')
    )
    
    return Response({
        'stock_distribution': stock_distribution,
        'value_by_publisher': list(value_by_publisher),
        'price_distribution': price_ranges,
        'restock_needed': list(restock_needed),
        'total_inventory': total_inventory
    })


@api_view(['GET'])
def customer_analytics(request):
    """
    Customer purchase patterns and analytics
    """
    days = int(request.query_params.get('days', 30))
    start_date = datetime.now() - timedelta(days=days)
    
    # Transaction patterns by day of week
    transactions = Transaction.objects.filter(trans_date__gte=start_date)
    
    # Books purchased together (basic market basket analysis)
    # Find books that appear in the same transactions
    from collections import defaultdict
    co_purchases = defaultdict(int)
    
    transactions_with_details = Transaction.objects.filter(
        trans_date__gte=start_date
    ).prefetch_related('details__book')
    
    for transaction in transactions_with_details:
        books = list(transaction.details.values_list('book__title', flat=True))
        if len(books) > 1:
            for i, book1 in enumerate(books):
                for book2 in books[i+1:]:
                    pair = tuple(sorted([book1, book2]))
                    co_purchases[pair] += 1
    
    # Convert to list and sort
    frequent_pairs = sorted(
        [{'book1': pair[0], 'book2': pair[1], 'count': count} 
         for pair, count in co_purchases.items()],
        key=lambda x: x['count'],
        reverse=True
    )[:10]
    
    # Average items per transaction
    avg_items = TransactionDetail.objects.filter(
        trans__trans_date__gte=start_date
    ).aggregate(
        avg_items_per_transaction=Avg('quantity')
    )
    
    return Response({
        'frequent_pairs': frequent_pairs,
        'avg_items_per_transaction': avg_items['avg_items_per_transaction']
    })