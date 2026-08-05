from django.urls import path
from . import views

urlpatterns = [
    # auth
    path('login/', views.LoginView.as_view(), name='login'), #views.py 18.row
    path('register/', views.RegisterView.as_view(), name='register'),#views.py 33.row
    path('logout/', views.logout_view, name='logout'),#views.py 49.row

    # profile
    path('profile/me/', views.MyProfileView.as_view(), name='my-profile'),

    # exist
    path('', views.home),
    path('users/', views.user_list),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('conversations/<int:user1_id>/<int:user2_id>/', views.get_or_create_conversation),
    path('conversations/with/<int:other_user_id>/delete/', views.delete_conversation_with),
    path('conversations/<int:conversation_id>/messages/', views.list_messages),
    path('conversations/<int:conversation_id>/send/', views.send_message),
    path('search-users/', views.search_users, name='search-users'),
    path('conversations/<int:conversation_id>/mark-read/', views.mark_read),
    path('conversations/unread-counts/', views.unread_counts),
]

