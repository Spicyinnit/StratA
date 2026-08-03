from django.shortcuts import render, get_object_or_404
from rest_framework import generics
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User

from .models import Conversation, Message, UserProfile
from .serializers import UserProfileSerializer, UserSerializer, ConversationSerializer, MessageSerializer


# auth 

class LoginView(ObtainAuthToken):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'error': 'Wrong username or password'}, status=400)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
        })


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


@api_view(['GET'])
def search_users(request):
    q = request.GET.get('q', '').strip()
    if len(q) < 1:
        return Response([])

    profiles = (UserProfile.objects
                .filter(handle__icontains=q)
                .exclude(user=request.user)
                .select_related('user')[:10])

    data = [{
        'user_id': p.user.id,
        'handle': p.handle,
        'display_name': p.display_name,
        'avatar': request.build_absolute_uri(p.avatar.url) if p.avatar else None,
    } for p in profiles]
    return Response(data)


@api_view(['GET'])
def user_list(request):
    users = User.objects.all()
    return Response(UserSerializer(users, many=True).data)


def home(request):
    return render(request, "home.html")


# conversations

@api_view(['GET'])
def get_or_create_conversation(request, user1_id, user2_id):
    # you can only open a conversation you're part of
    if request.user.id not in (int(user1_id), int(user2_id)):
        return Response({'detail': 'not your conversation'}, status=403)

    user1 = get_object_or_404(User, id=user1_id)
    user2 = get_object_or_404(User, id=user2_id)

    convo = Conversation.objects.filter(participants=user1).filter(participants=user2).first()
    if not convo:
        convo = Conversation.objects.create()
        convo.participants.add(user1, user2)
    return Response(ConversationSerializer(convo, context={'request': request}).data)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def send_message(request, conversation_id):
    convo = get_object_or_404(Conversation, id=conversation_id)
    if not convo.participants.filter(id=request.user.id).exists():
        return Response({'detail': 'not your conversation'}, status=403)

    msg = Message.objects.create(
        conversation=convo,
        sender=request.user,               # taken from the token, not the request body
        text=request.data.get('text', ''),
        image=request.FILES.get('image'),
    )
    return Response(MessageSerializer(msg, context={'request': request}).data, status=201)


@api_view(['GET'])
def list_messages(request, conversation_id):
    convo = get_object_or_404(Conversation, id=conversation_id)
    if not convo.participants.filter(id=request.user.id).exists():
        return Response({'detail': 'not your conversation'}, status=403)

    msgs = convo.messages.order_by('timestamp')
    return Response(MessageSerializer(msgs, many=True, context={'request': request}).data)


@api_view(['POST'])
def mark_read(request, conversation_id):
    convo = get_object_or_404(Conversation, id=conversation_id)
    if not convo.participants.filter(id=request.user.id).exists():
        return Response({'detail': 'not your conversation'}, status=403)

    convo.messages.exclude(sender=request.user).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['GET'])
def unread_counts(request):
    conversations = Conversation.objects.filter(participants=request.user)
    data = []
    for convo in conversations:
        count = convo.messages.filter(is_read=False).exclude(sender=request.user).count()
        if count > 0:
            data.append({'conversation_id': convo.id, 'unread_count': count})
    return Response(data)