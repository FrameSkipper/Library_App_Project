from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


class Publisher(models.Model):
    """
    Publisher model - stores information about book publishers.
    
    Fields:
        pub_id: Auto-incrementing primary key
        name: Publisher name (required)
        email: Publisher email (optional)
        phone: Publisher phone (optional)
        created_at: Timestamp when created
        updated_at: Timestamp when last modified
    """
    pub_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'publisher'
        ordering = ['name']  # Default ordering by name
        verbose_name = 'Publisher'
        verbose_name_plural = 'Publishers'

    def __str__(self):
        """String representation of publisher"""
        return self.name


class Book(models.Model):
    """
    Book model - core inventory table.
    
    Stores all book details including stock and pricing.
    Links to Publisher via foreign key.
    """
    book_id = models.AutoField(primary_key=True)
    pub = models.ForeignKey(
        Publisher, 
        on_delete=models.PROTECT,  # Prevent deletion if books exist
        related_name='books'
    )
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=17, unique=True)
    stock_qty = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)]  # Cannot be negative
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    genre = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'book'
        ordering = ['title']
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['author']),
            models.Index(fields=['isbn']),
        ]

    def __str__(self):
        return f"{self.title} by {self.author}"

    @property
    def is_low_stock(self):
        """Returns True if stock is below threshold"""
        return self.stock_qty < 5

    @property
    def total_value(self):
        """Calculate total inventory value"""
        return self.stock_qty * self.unit_price


class Staff(models.Model):
    """
    Staff model - extends Django's User model.
    
    Stores additional staff information and roles.
    """
    ROLE_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('MANAGER', 'Manager'),
        ('CLERK', 'Clerk'),
        ('DOCUMENTALIST', 'Documentalist'),
    ]
    
    staff_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        related_name='staff_profile'
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='CLERK'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'staff'
        verbose_name_plural = 'Staff'

    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"


class Transaction(models.Model):
    """
    Transaction model - represents a sale.
    
    Main transaction record with total amount and metadata.
    """
    trans_id = models.AutoField(primary_key=True)
    trans_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    staff = models.ForeignKey(
        Staff, 
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    customer_name = models.CharField(
        max_length=255, 
        blank=True, 
        null=True
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'transaction'
        ordering = ['-trans_date']  # Newest first
        indexes = [
            models.Index(fields=['-trans_date']),
        ]

    def __str__(self):
        return f"Transaction #{self.trans_id} - ${self.total_amount}"


class TransactionDetail(models.Model):
    """
    Transaction Detail model - line items in a transaction.
    
    Links books to transactions with quantity and pricing.
    """
    detail_id = models.AutoField(primary_key=True)
    trans = models.ForeignKey(
        Transaction, 
        on_delete=models.CASCADE,
        related_name='details'
    )
    book = models.ForeignKey(
        Book, 
        on_delete=models.PROTECT,
        related_name='transaction_details'
    )
    quantity = models.IntegerField(
        validators=[MinValueValidator(1)]
    )
    unit_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2
    )
    line_total = models.DecimalField(
        max_digits=10, 
        decimal_places=2
    )

    class Meta:
        db_table = 'transaction_detail'

    def save(self, *args, **kwargs):
        """Override save to calculate line total"""
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.book.title} x {self.quantity}"


class Report(models.Model):
    """
    Report model - stores generated reports.
    
    Uses JSON field for flexible report data storage.
    """
    REPORT_TYPES = [
        ('DAILY', 'Daily Sales'),
        ('WEEKLY', 'Weekly Sales'),
        ('MONTHLY', 'Monthly Sales'),
        ('INVENTORY', 'Inventory Report'),
        ('LOW_STOCK', 'Low Stock Report'),
        ('TOP_SELLING', 'Top Selling Books'),
        ('REVENUE', 'Revenue Analysis'),
    ]
    
    report_id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=20, choices=REPORT_TYPES)
    date = models.DateTimeField(auto_now_add=True)
    staff = models.ForeignKey(
        Staff, 
        on_delete=models.PROTECT,
        related_name='reports'
    )
    data = models.JSONField()  # Flexible report data
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'report'
        ordering = ['-date']

    def __str__(self):
        return f"{self.get_type_display()} - {self.date.strftime('%Y-%m-%d')}"