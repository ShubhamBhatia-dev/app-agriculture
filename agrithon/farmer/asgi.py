import os
from django.core.asgi import get_asgi_application

# Set the environment variable for settings FIRST.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'farmer.settings')

# IMPORTANT: Initialize the Django ASGI application. This MUST be done before
# importing anything that relies on the Django ORM, like your routing.
django_asgi_app = get_asgi_application()

# Now that Django is initialized, you can safely import your Channels routing.
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
import users.routing

application = ProtocolTypeRouter({
    # Use the Django app you initialized for HTTP requests.
    "http": django_asgi_app,

    # Handle WebSocket requests.
    "websocket": AuthMiddlewareStack(
        URLRouter(
            users.routing.websocket_urlpatterns
        )
    ),
})