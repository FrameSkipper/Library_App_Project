from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Staff


@receiver(post_save, sender=User)
def create_staff_profile(sender, instance, created, **kwargs):
    """
    Automatically create a Staff profile when a User is created.
    
    This prevents the "No staff profile found" error when users
    try to complete transactions.
    
    Args:
        sender: The User model class
        instance: The actual User instance being saved
        created: Boolean indicating if this is a new user
        **kwargs: Additional keyword arguments
    """
    if created:
        # Only create staff profile for new users
        Staff.objects.create(
            user=instance,
            name=instance.get_full_name() or instance.username,
            email=instance.email or f"{instance.username}@example.com",
            role='CLERK'  # Default role, can be changed later by admin
        )
        print(f"✓ Staff profile created for user: {instance.username}")


@receiver(post_save, sender=User)
def save_staff_profile(sender, instance, **kwargs):
    """
    Save the staff profile when user is saved.
    
    This ensures staff profile stays in sync with user changes.
    """
    if hasattr(instance, 'staff_profile'):
        instance.staff_profile.save()