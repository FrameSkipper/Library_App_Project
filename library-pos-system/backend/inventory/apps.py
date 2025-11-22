from django.apps import AppConfig

class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventory'
    
    def ready(self):
        # Import signals using a relative import so it resolves within this app package
        from . import signals