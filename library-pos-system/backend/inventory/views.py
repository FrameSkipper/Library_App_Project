"""
Enhanced views.py with Analytics endpoints
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from datetime import timedelta
from .models import Book, Publisher, Transaction, TransactionDetail, Staff, Report
from .serializers import BookSerializer, PublisherSerializer, TransactionSerializer, StaffSerializer, ReportSerializer


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


class AnalyticsViewSet(viewsets.ViewSet):
    """
    Analytics endpoints for dashboard charts and insights
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def inventory(self, request):
        """
        Get inventory analytics:
        - Total books
        - Total value
        - Low stock items
        - Books by publisher
        """
        try:
            # Total books and value
            books = Book.objects.all()
            total_books = books.count()
            total_value = sum(book.total_value for book in books)
            
            # Low stock items
            low_stock_count = books.filter(stock_qty__lt=5).count()
            low_stock_items = BookSerializer(
                books.filter(stock_qty__lt=5)[:5], 
                many=True
            ).data
            
            # Books by publisher
            books_by_publisher = []
            for publisher in Publisher.objects.all():
                pub_books = books.filter(pub=publisher)
                books_by_publisher.append({
                    'publisher': publisher.name,
                    'count': pub_books.count(),
                    'value': float(sum(book.total_value for book in pub_books))
                })
            
            # Stock distribution
            stock_ranges = [
                {'range': '0-5', 'count': books.filter(stock_qty__lte=5).count()},
                {'range': '6-20', 'count': books.filter(stock_qty__gt=5, stock_qty__lte=20).count()},
                {'range': '21-50', 'count': books.filter(stock_qty__gt=20, stock_qty__lte=50).count()},
                {'range': '50+', 'count': books.filter(stock_qty__gt=50).count()},
            ]
            
            return Response({
                'total_books': total_books,
                'total_value': float(total_value),
                'low_stock_count': low_stock_count,
                'low_stock_items': low_stock_items,
                'books_by_publisher': books_by_publisher,
                'stock_distribution': stock_ranges,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def sales(self, request):
        """
        Get sales analytics:
        - Sales by period (daily, weekly, monthly)
        - Top selling books
        - Revenue trends
        """
        try:
            period = request.query_params.get('period', 'daily')
            
            # Calculate date range
            now = timezone.now()
            if period == 'daily':
                start_date = now - timedelta(days=7)
                date_format = '%Y-%m-%d'
            elif period == 'weekly':
                start_date = now - timedelta(weeks=12)
                date_format = '%Y-W%W'
            else:  # monthly
                start_date = now - timedelta(days=365)
                date_format = '%Y-%m'
            
            # Sales over time
            transactions = Transaction.objects.filter(trans_date__gte=start_date)
            
            sales_by_date = {}
            for trans in transactions:
                date_key = trans.trans_date.strftime(date_format)
                if date_key not in sales_by_date:
                    sales_by_date[date_key] = {
                        'date': date_key,
                        'revenue': 0,
                        'transactions': 0
                    }
                sales_by_date[date_key]['revenue'] += float(trans.total_amount)
                sales_by_date[date_key]['transactions'] += 1
            
            sales_trend = sorted(sales_by_date.values(), key=lambda x: x['date'])
            
            # Top selling books
            top_books = TransactionDetail.objects.values(
                'book__title', 
                'book__author'
            ).annotate(
                total_sold=Sum('quantity'),
                revenue=Sum('line_total')
            ).order_by('-total_sold')[:10]
            
            # Overall stats
            total_revenue = transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            total_transactions = transactions.count()
            avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
            
            return Response({
                'sales_trend': sales_trend,
                'top_books': list(top_books),
                'total_revenue': float(total_revenue),
                'total_transactions': total_transactions,
                'avg_transaction_value': float(avg_transaction),
                'period': period,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def customer(self, request):
        """
        Get customer analytics:
        - Transactions by customer
        - Customer frequency
        - Average purchase value
        """
        try:
            # Get all transactions with customer names
            transactions_with_customers = Transaction.objects.exclude(
                Q(customer_name__isnull=True) | Q(customer_name='')
            )
            
            # Customer stats
            customer_data = {}
            for trans in transactions_with_customers:
                name = trans.customer_name
                if name not in customer_data:
                    customer_data[name] = {
                        'name': name,
                        'transactions': 0,
                        'total_spent': 0,
                        'last_purchase': None
                    }
                customer_data[name]['transactions'] += 1
                customer_data[name]['total_spent'] += float(trans.total_amount)
                if not customer_data[name]['last_purchase'] or trans.trans_date > customer_data[name]['last_purchase']:
                    customer_data[name]['last_purchase'] = trans.trans_date
            
            # Sort by total spent
            top_customers = sorted(
                customer_data.values(), 
                key=lambda x: x['total_spent'], 
                reverse=True
            )[:10]
            
            # Format dates
            for customer in top_customers:
                if customer['last_purchase']:
                    customer['last_purchase'] = customer['last_purchase'].strftime('%Y-%m-%d')
            
            # Anonymous vs named customers
            total_transactions = Transaction.objects.count()
            named_transactions = transactions_with_customers.count()
            anonymous_transactions = total_transactions - named_transactions
            
            return Response({
                'top_customers': top_customers,
                'total_customers': len(customer_data),
                'named_transactions': named_transactions,
                'anonymous_transactions': anonymous_transactions,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def dashboard_summary(self, request):
        """
        Get quick summary stats for dashboard
        """
        try:
            # Today's stats
            today = timezone.now().date()
            today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
            
            today_transactions = Transaction.objects.filter(trans_date__gte=today_start)
            today_revenue = today_transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            
            # This week's stats
            week_start = today_start - timedelta(days=today.weekday())
            week_transactions = Transaction.objects.filter(trans_date__gte=week_start)
            week_revenue = week_transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            
            # This month's stats
            month_start = today_start.replace(day=1)
            month_transactions = Transaction.objects.filter(trans_date__gte=month_start)
            month_revenue = month_transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            
            # Inventory stats
            books = Book.objects.all()
            low_stock_books = books.filter(stock_qty__lt=5).count()
            total_inventory_value = sum(book.total_value for book in books)
            
            return Response({
                'today': {
                    'revenue': float(today_revenue),
                    'transactions': today_transactions.count(),
                },
                'week': {
                    'revenue': float(week_revenue),
                    'transactions': week_transactions.count(),
                },
                'month': {
                    'revenue': float(month_revenue),
                    'transactions': month_transactions.count(),
                },
                'inventory': {
                    'total_books': books.count(),
                    'total_value': float(total_inventory_value),
                    'low_stock_items': low_stock_books,
                }
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )