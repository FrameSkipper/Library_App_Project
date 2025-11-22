from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from inventory.models import Staff


class Command(BaseCommand):
    help = 'Create Staff records for existing users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Create staff for specific username only'
        )

    def handle(self, *args, **options):
        username = options.get('username')
        
        if username:
            # Create staff for specific user
            try:
                user = User.objects.get(username=username)
                staff, created = Staff.objects.get_or_create(
                    user=user,
                    defaults={
                        'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                        'email': user.email or f"{user.username}@library.com",
                        'role': 'ADMIN' if user.is_superuser else 'CLERK'
                    }
                )
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'Successfully created staff record for {username}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Staff record already exists for {username}')
                    )
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'User {username} not found')
                )
        else:
            # Create staff for all users without staff records
            users_without_staff = User.objects.exclude(
                staff_profile__isnull=False
            )
            
            created_count = 0
            for user in users_without_staff:
                staff = Staff.objects.create(
                    user=user,
                    name=f"{user.first_name} {user.last_name}".strip() or user.username,
                    email=user.email or f"{user.username}@library.com",
                    role='ADMIN' if user.is_superuser else 'CLERK'
                )
                created_count += 1
                self.stdout.write(f'Created staff record for {user.username}')
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nSuccessfully created {created_count} staff records'
                )
            )