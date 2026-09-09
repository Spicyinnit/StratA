from django.urls import path
from . import views

urlpatterns = [
    # auth
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('logout/', views.logout_view, name='logout'),

    # profile
    path('profile/me/', views.MyProfileView.as_view(), name='my-profile'),

    # app
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>/nickname/', views.set_nickname, name='set-nickname'),  # usernaem part
    path('search-users/', views.search_users, name='search-users'),

    # conversations
    path('conversations/', views.my_conversations),
    path('conversations/<int:user1_id>/<int:user2_id>/', views.get_or_create_conversation),
    path('conversations/with/<int:other_user_id>/delete/', views.delete_conversation_with),
    path('conversations/<int:conversation_id>/messages/', views.list_messages),
    path('conversations/<int:conversation_id>/send/', views.send_message),
    path('conversations/<int:conversation_id>/mark-read/', views.mark_read),
    path('conversations/<int:conversation_id>/state/', views.set_conversation_state),
    path('conversations/unread-summary/', views.unread_summary),

    # groups
    path('groups/create/', views.create_group),
    path('groups/<int:conversation_id>/', views.group_detail),
    path('groups/<int:conversation_id>/members/add/', views.add_members),
    path('groups/<int:conversation_id>/members/<int:user_id>/remove/', views.remove_member),
    path('groups/<int:conversation_id>/leave/', views.leave_group),
]