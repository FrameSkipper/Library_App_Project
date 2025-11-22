"""
Serializers for converting models to/from JSON.
"""

from rest_framework import serializers
from .models import Book, Publisher, Transaction, TransactionDetail, Staff, Report


class PublisherSerializer(serializers.ModelSerializer):
    """Serializer for Publisher model"""
    class Meta:
        model = Publisher
        fields = '__all__'


class BookSerializer(serializers.ModelSerializer):
    """Serializer for Book model"""
    publisher = serializers.CharField(source='pub.name', read_only=True)
    pub_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Book
        fields = [
            'book_id', 'title', 'author', 'isbn', 'stock_qty', 
            'unit_price', 'publisher', 'pub_id', 'created_at', 
            'updated_at', 'is_low_stock'
        ]
        read_only_fields = ['book_id', 'created_at', 'updated_at', 'is_low_stock']

    def create(self, validated_data):
        """Create a new book with publisher"""
        pub_id = validated_data.pop('pub_id', None)
        
        if pub_id:
            try:
                publisher = Publisher.objects.get(pub_id=pub_id)
                validated_data['pub'] = publisher
            except Publisher.DoesNotExist:
                raise serializers.ValidationError({'pub_id': 'Publisher not found'})
        else:
            publisher, created = Publisher.objects.get_or_create(
                name='Default Publisher',
                defaults={'email': '', 'phone': ''}
            )
            validated_data['pub'] = publisher
            
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update book with optional publisher change"""
        pub_id = validated_data.pop('pub_id', None)
        
        if pub_id:
            try:
                publisher = Publisher.objects.get(pub_id=pub_id)
                validated_data['pub'] = publisher
            except Publisher.DoesNotExist:
                raise serializers.ValidationError({'pub_id': 'Publisher not found'})
        
        return super().update(instance, validated_data)


class TransactionDetailSerializer(serializers.ModelSerializer):
    """Serializer for transaction line items"""
    book_title = serializers.CharField(source='book.title', read_only=True)
    
    class Meta:
        model = TransactionDetail
        fields = ['detail_id', 'book', 'book_title', 'quantity', 'unit_price', 'line_total']
        read_only_fields = ['detail_id', 'line_total']


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for transactions (sales)"""
    details = TransactionDetailSerializer(many=True, required=False)
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    # Make staff optional in the serializer input
    staff = serializers.PrimaryKeyRelatedField(
        queryset=Staff.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['trans_id', 'trans_date', 'total_amount']

    def validate(self, data):
        """Validate and auto-assign staff if not provided"""
        # If staff is not in the data, try to get it from request
        if 'staff' not in data or data['staff'] is None:
            request = self.context.get('request')
            if not request:
                raise serializers.ValidationError({
                    'staff': 'Unable to determine staff. Request context missing.'
                })
            
            if not request.user.is_authenticated:
                raise serializers.ValidationError({
                    'staff': 'User must be authenticated to create transactions.'
                })
            
            try:
                staff = Staff.objects.get(user=request.user)
                data['staff'] = staff
            except Staff.DoesNotExist:
                raise serializers.ValidationError({
                    'staff': f'No staff profile found for user "{request.user.username}". Please contact administrator.'
                })
        
        return data

    def create(self, validated_data):
        """Create a new transaction with details"""
        details_data = validated_data.pop('details', [])
        
        # Staff should already be set by validate() method
        if 'staff' not in validated_data:
            raise serializers.ValidationError({
                'staff': 'Staff field is required but was not set.'
            })
        
        # Calculate total amount
        total = sum(
            detail['quantity'] * detail['unit_price']
            for detail in details_data
        )
        validated_data['total_amount'] = total
        
        # Create transaction
        transaction = Transaction.objects.create(**validated_data)
        
        # Create details and update inventory
        for detail_data in details_data:
            book = detail_data['book']
            quantity = detail_data['quantity']
            
            # Check stock availability
            if book.stock_qty < quantity:
                transaction.delete()  # Rollback
                raise serializers.ValidationError(
                    f"Insufficient stock for {book.title}. Available: {book.stock_qty}"
                )
            
            # Create detail
            TransactionDetail.objects.create(
                trans=transaction,
                **detail_data
            )
            
            # Update book stock
            book.stock_qty -= quantity
            book.save()
        
        return transaction


class StaffSerializer(serializers.ModelSerializer):
    """Serializer for Staff model"""
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Staff
        fields = '__all__'
        read_only_fields = ['staff_id', 'created_at', 'updated_at']


class ReportSerializer(serializers.ModelSerializer):
    """Serializer for Report model"""
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ['report_id', 'date', 'created_at']