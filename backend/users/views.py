from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import api_view
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import UserProfile, Contact
from .serializers import UserProfileSerializer, RegisterSerializer

def _my_nicknames(user):
    return dict(
        Contact.objects
        .filter(owner=user)
        .exclude(nickname='')
        .values_list('target_id', 'nickname')
        )

#auth

class LoginView(ObtainAuthToken):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'error': 'Wrong tag or password'}, status=400)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
        })


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
        }, status=201)


@api_view(['POST'])
def logout_view(request):
    Token.objects.filter(user=request.user).delete()
    return Response({'detail': 'logged out'})


# profile

class MyProfileView(generics.RetrieveUpdateAPIView):
    """GET + PATCH the logged-in user's own profile. The id never comes from
    the URL, so nobody can edit someone else's profile."""
    serializer_class = UserProfileSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

    def get_serializer_context(self):
        return {'request': self.request}


class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserProfileSerializer

    def get_object(self):
        return get_object_or_404(User, pk=self.kwargs["pk"]).profile


@api_view(['PATCH', 'DELETE'])
def set_nickname(request, user_id):
    """PATCH {"nickname": "..."} to save your private name for someone.
    Empty string or DELETE clears it. Only the caller ever sees this."""
    if int(user_id) == request.user.id:
        return Response({'detail': "you can't nickname yourself"}, status=400)

    target = get_object_or_404(User, pk=user_id)

    if request.method == 'DELETE':
        Contact.objects.filter(owner=request.user, target=target).delete()
        return Response({'nickname': ''})

    nickname = (request.data.get('nickname') or '').strip()
    if len(nickname) > 50:
        return Response({'detail': 'Nickname is too long (max 50)'}, status=400)

    if not nickname:
        Contact.objects.filter(owner=request.user, target=target).delete()
        return Response({'nickname': ''})

    contact, _ = Contact.objects.get_or_create(owner=request.user, target=target)
    contact.nickname = nickname
    contact.save()
    return Response({'nickname': contact.nickname})


@api_view(['GET'])
def search_users(request):
    q = request.GET.get('q', '').strip().lstrip('@')
    if len(q) < 1:
        return Response([])

    users = (User.objects
             .filter(username__icontains=q)
             .exclude(id=request.user.id)
             .select_related('profile')[:10])

    nicknames = _my_nicknames(request.user)          # NEW

    data = []
    for u in users:
        profile = getattr(u, 'profile', None)
        avatar = None
        if profile and profile.avatar:
            avatar = request.build_absolute_uri(profile.avatar.url)
        data.append({
            'user_id': u.id,
            'tag': u.username,
            'display_name': (profile.display_name if profile else '') or u.username,
            'nickname': nicknames.get(u.id, ''),      # NEW
            'avatar': avatar,
        })
    return Response(data)
