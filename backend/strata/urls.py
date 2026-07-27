from django.urls import path
from . import views
from .views import LoginView

urlpatterns = [
    # auth
    path('login/', LoginView.as_view()),
    path('logout/', views.logout_view),

    # existing
    path('users/', views.user_list),
    path('', views.home),
    path('conversations/<int:user1_id>/<int:user2_id>/', views.get_or_create_conversation),
    path('conversations/<int:conversation_id>/messages/', views.list_messages),
    path('conversations/<int:conversation_id>/send/', views.send_message),
    path('users/<int:user_id>/avatar/', views.upload_avatar, name='upload_avatar'),
    path('search-users/', views.search_users, name='search-users'),
    path('users/<int:user_id>/profile/', views.update_profile, name='update-profile'),
    path('conversations/<int:conversation_id>/mark-read/', views.mark_read),
    path('conversations/unread-counts/', views.unread_counts),
]