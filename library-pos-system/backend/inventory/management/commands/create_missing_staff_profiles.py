from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from inventory.models import Staff


class Command(BaseCommand):
    help = 'Creates staff profiles for users who do not have one'

    def add_arguments(self, parser):
        parser.add_argument(
            '--role',
            type=str,
            default='CLERK',
            choices=['ADMIN', 'MANAGER', 'CLERK', 'DOCUMENTALIST'],
            help='Default role for created staff profiles'
        )

    def handle(self, *args, **options):
        default_role = options['role']
        users_without_staff = []
        
        # Find users without staff profiles
        for user in User.objects.all():
            if not hasattr(user, 'staff_profile'):
                users_without_staff.append(user)
        
        if not users_without_staff:
            self.stdout.write(
                self.style.SUCCESS('✓ All users already have staff profiles!')
            )
            return
        
        # Create staff profiles
        created_count = 0
        for user in users_without_staff:
            staff = Staff.objects.create(
                user=user,
                name=user.get_full_name() or user.username,
                email=user.email or f"{user.username}@example.com",
                role=default_role
            )
            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Created staff profile for: {user.username} ({staff.email})'
                )
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Successfully created {created_count} staff profile(s)'
            )
        )