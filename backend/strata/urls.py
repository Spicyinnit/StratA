from django.urls import path
from . import views

urlpatterns = [
    # auth
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.logout_view, name='logout'),

    # profile
    path('profile/me/', views.MyProfileView.as_view(), name='my-profile'),

    # exist
    path('users/', views.user_list),
    path('', views.home),
    path('conversations/<int:user1_id>/<int:user2_id>/', views.get_or_create_conversation),
    path('conversations/<int:conversation_id>/messages/', views.list_messages),
    path('conversations/<int:conversation_id>/send/', views.send_message),
    path('search-users/', views.search_users, name='search-users'),
    path('conversations/<int:conversation_id>/mark-read/', views.mark_read),
    path('conversations/unread-counts/', views.unread_counts),
]