from django.urls import path
from . import views

urlpatterns = [
    # auth
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('logout/', views.logout_view, name='logout'),

    # profile
    path('profile/me/', views.MyProfileView.as_view(), name='my-profile'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>/nickname/', views.set_nickname, name='set-nickname'),
    path('search-users/', views.search_users, name='search-users'),
]