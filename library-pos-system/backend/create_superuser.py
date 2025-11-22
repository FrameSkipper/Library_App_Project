"""
Run this script to create a superuser automatically
Usage: python create_superuser.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_system.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Superuser credentials (change these!)
username = 'librarian'
email = 'admin@library.com'
password = 'L1b_Dj@nG_0'

# Check if superuser already exists
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(
        username=username,
        email=email,
        password=password
    )
    print(f"✅ Superuser '{username}' created successfully!")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    print(f"   Email: {email}")
else:
    print(f"ℹ️  Superuser '{username}' already exists")