from django.shortcuts import render
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User

from .models import Conversation, Message, UserProfile
from .serializers import UserProfileSerializer, UserSerializer, ConversationSerializer, MessageSerializer


class LoginView(ObtainAuthToken):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    request.user.auth_token.delete()
    return Response({'detail': 'logged out'})


@api_view(['GET'])
def search_users(request):
    q = request.GET.get('q', '').strip()
    exclude_id = request.GET.get('exclude_id')

    if len(q) < 1:
        return Response([])

    profiles = UserProfile.objects.filter(handle__icontains=q)
    if exclude_id:
        profiles = profiles.exclude(user_id=exclude_id)
    profiles = profiles[:10]

    data = [{
        'user_id': p.user.id,
        'handle': p.handle,
        'avatar': p.avatar.url if p.avatar else None
    } for p in profiles]
    return Response(data)


@api_view(['GET'])
def user_list(request):
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


def home(request):
    return render(request, "home.html")


@api_view(['GET'])
def get_or_create_conversation(request, user1_id, user2_id):
    user1 = User.objects.get(id=user1_id)
    user2 = User.objects.get(id=user2_id)
    convo = Conversation.objects.filter(participants=user1).filter(participants=user2).first()
    if not convo:
        convo = Conversation.objects.create()
        convo.participants.add(user1, user2)
    return Response(ConversationSerializer(convo).data)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def send_message(request, conversation_id):
    convo = Conversation.objects.get(id=conversation_id)
    sender_id = request.data['sender_id']
    text = request.data.get('text', '')
    image = request.FILES.get('image')

    msg = Message.objects.create(
        conversation=convo,
        sender_id=sender_id,
        text=text,
        image=image
    )
    return Response(MessageSerializer(msg).data)


@api_view(['PATCH'])
@parser_classes([MultiPartParser, FormParser])
def upload_avatar(request, user_id):
    profile, _ = UserProfile.objects.get_or_create(user_id=user_id)
    profile.avatar = request.FILES.get('avatar')
    profile.save()
    return Response(UserProfileSerializer(profile).data)


@api_view(['GET'])
def list_messages(request, conversation_id):
    msgs = Message.objects.filter(conversation_id=conversation_id).order_by('timestamp')
    return Response(MessageSerializer(msgs, many=True).data)


@api_view(['POST'])
def update_profile(request, user_id):
    profile, _ = UserProfile.objects.get_or_create(user_id=user_id)
    serializer = UserProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

@api_view(['POST'])
def mark_read(request, conversation_id):
    user_id = request.data.get('user_id')
    Message.objects.filter(
        conversation_id=conversation_id
    ).exclude(sender_id=user_id).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['GET'])
def unread_counts(request):
    user_id = request.GET.get('user_id')
    conversations = Conversation.objects.filter(participants__id=user_id)
    data = []
    for convo in conversations:
        count = convo.messages.filter(is_read=False).exclude(sender_id=user_id).count()
        if count > 0:
            data.append({'conversation_id': convo.id, 'unread_count': count})
    return Response(data)