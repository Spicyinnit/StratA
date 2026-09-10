from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth.models import User
from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from users.views import _my_nicknames
from .models import Conversation, Message, ConversationState
from .serializers import (
    ConversationListSerializer,
    ConversationSerializer,
    MessageSerializer,
    GroupDetailSerializer,
)

def _my_conversation_states(user):
    rows = ConversationState.objects.filter(user=user).values(
        "conversation_id", "pinned", "muted", "archived"
    )
    return {r["conversation_id"]: r for r in rows}

# conversations

@api_view(['GET'])
def my_conversations(request):
    """Sidebar list — DMs and groups in one call, newest activity first."""
    from django.db.models import Max

    convos = (Conversation.objects
              .filter(participants=request.user)
              .annotate(last_activity=Max('messages__timestamp'))
              .order_by(models.F('last_activity').desc(nulls_last=True), '-created_at')
              .prefetch_related('participants', 'messages'))
    data = ConversationListSerializer(
        convos,
        many=True,
        context={
            'request': request,
            'nicknames': _my_nicknames(request.user),
            'states': _my_conversation_states(request.user),
        },
    ).data
    return Response(data)

@api_view(['PATCH'])
def set_conversation_state(request, conversation_id):
    """Toggle pinned/muted/archived for the caller only. Send any subset."""
    convo = get_object_or_404(Conversation, id=conversation_id)
    if not convo.participants.filter(id=request.user.id).exists():
        return Response({'detail': 'not your conversation'}, status=403)

    state, _ = ConversationState.objects.get_or_create(user=request.user, conversation=convo)

    for field in ('pinned', 'muted', 'archived'):
        if field in request.data:
            setattr(state, field, bool(request.data[field]))
    state.save()

    return Response({'pinned': state.pinned, 'muted': state.muted, 'archived': state.archived})


@api_view(['GET'])
def get_or_create_conversation(request, user1_id, user2_id):
    # you can only open a conversation you're part of
    if request.user.id not in (int(user1_id), int(user2_id)):
        return Response({'detail': 'not your conversation'}, status=403)

    user1 = get_object_or_404(User, id=user1_id)
    user2 = get_object_or_404(User, id=user2_id)

    convo = (Conversation.objects
             .filter(is_group=False)
             .filter(participants=user1)
             .filter(participants=user2)
             .first())
    if not convo:
        convo = Conversation.objects.create()
        convo.participants.add(user1, user2)
    return Response(ConversationSerializer(convo, context={'request': request}).data)


@api_view(["DELETE"])
def delete_conversation_with(request, other_user_id):
    convo = (Conversation.objects
             .filter(is_group=False)                       # NEW — don't nuke a group
             .filter(participants=request.user)
             .filter(participants__id=other_user_id)
             .first())
    if not convo:
        return Response(status=204)
    convo.delete()
    return Response(status=204)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def send_message(request, conversation_id):
    convo = get_object_or_404(Conversation, id=conversation_id)
    if not convo.participants.filter(id=request.user.id).exists():
        return Response({'detail': 'not your conversation'}, status=403)

    upload = request.FILES.get('image') or request.FILES.get('file')
    is_image = bool(upload) and upload.content_type.startswith('image/')

    msg = Message.objects.create(
        conversation=convo,
        sender=request.user,
        text=request.data.get('text', ''),
        image=upload if is_image else None,
        file=None if is_image else upload,
    )

    # NEW — one room per conversation, works for 2 people or 20
    async_to_sync(get_channel_layer().group_send)(
        convo.room_group_name,
        {"type": "chat.message", "message": {}},
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

    updated = convo.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
    if updated:
        async_to_sync(get_channel_layer().group_send)(
            convo.room_group_name,     # convo_<id>
            {
                "type": "read_receipt",
                "reader_id": request.user.id,
                "conversation_id": convo.id,
            },
        )
    return Response(status=204)


@api_view(['GET'])
def unread_summary(request):
    nicknames = _my_nicknames(request.user)            # NEW

    data = []
    for convo in Conversation.objects.filter(participants=request.user):
        unread = convo.messages.filter(is_read=False).exclude(sender=request.user)
        latest = unread.order_by('-timestamp').first()
        if not latest:
            continue

        entry = {
            'conversation_id': convo.id,
            'is_group': convo.is_group,                    # NEW
            'latest_message_id': latest.id,
            'unread_count': unread.count(),
            'preview': (latest.text or '')[:60] or '📷 Image',
        }

        # NEW — groups have no "other user", so branch instead of crashing
        if convo.is_group:
            entry.update({
                'user_id': None,
                'tag': None,
                'display_name': convo.name or f"Group {convo.id}",
                'nickname': '',                            # NEW
                'avatar': request.build_absolute_uri(convo.avatar.url) if convo.avatar else None,
            })
        else:
            other = convo.participants.exclude(id=request.user.id).first()
            if not other:
                continue
            profile = getattr(other, 'profile', None)
            entry.update({
                'user_id': other.id,
                'tag': other.username,
                'display_name': (profile.display_name if profile else '') or other.username,
                'nickname': nicknames.get(other.id, ''),   # NEW
                'avatar': request.build_absolute_uri(profile.avatar.url) if profile and profile.avatar else None,
            })

        data.append(entry)
    return Response(data)


# groups — all NEW

def _get_group(conversation_id, user):
    """Fetch a group the user actually belongs to, or None."""
    convo = Conversation.objects.filter(id=conversation_id, is_group=True).first()
    if not convo or not convo.participants.filter(id=user.id).exists():
        return None
    return convo


def _parse_ids(raw):
    if isinstance(raw, str):
        return [i for i in raw.split(',') if i.strip()]
    return raw or []


@api_view(['POST'])
def create_group(request):
    name = (request.data.get('name') or '').strip()
    if not name:
        return Response({'detail': 'Group name is required'}, status=400)

    ids = _parse_ids(request.data.get('participant_ids'))
    users = list(User.objects.filter(id__in=ids).exclude(id=request.user.id))
    if not users:
        return Response({'detail': 'Add at least one other person'}, status=400)

    convo = Conversation.objects.create(is_group=True, name=name, owner=request.user)
    convo.participants.add(request.user, *users)
    return Response(
        GroupDetailSerializer(convo, context={'request': request}).data,
        status=201,
    )


@api_view(['GET', 'PATCH'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def group_detail(request, conversation_id):
    convo = _get_group(conversation_id, request.user)
    if not convo:
        return Response({'detail': 'not your group'}, status=403)

    if request.method == 'PATCH':
        if convo.owner_id != request.user.id:
            return Response({'detail': 'only the owner can edit the group'}, status=403)
        name = request.data.get('name')
        if name is not None:
            name = name.strip()
            if not name:
                return Response({'detail': 'Group name cannot be empty'}, status=400)
            convo.name = name
        if 'avatar' in request.FILES:
            convo.avatar = request.FILES['avatar']
        convo.save()

    return Response(GroupDetailSerializer(convo, context={'request': request}).data)


@api_view(['POST'])
def add_members(request, conversation_id):
    convo = _get_group(conversation_id, request.user)
    if not convo:
        return Response({'detail': 'not your group'}, status=403)
    if convo.owner_id != request.user.id:
        return Response({'detail': 'only the owner can add members'}, status=403)

    users = User.objects.filter(id__in=_parse_ids(request.data.get('participant_ids')))
    if not users:
        return Response({'detail': 'No valid users'}, status=400)

    convo.participants.add(*users)
    return Response(GroupDetailSerializer(convo, context={'request': request}).data)


@api_view(['DELETE'])
def remove_member(request, conversation_id, user_id):
    convo = _get_group(conversation_id, request.user)
    if not convo:
        return Response({'detail': 'not your group'}, status=403)
    if convo.owner_id != request.user.id:
        return Response({'detail': 'only the owner can remove members'}, status=403)
    if user_id == convo.owner_id:
        return Response({'detail': 'the owner cannot be removed'}, status=400)

    convo.participants.remove(user_id)
    return Response(GroupDetailSerializer(convo, context={'request': request}).data)

@api_view(['POST'])
def leave_group(request, conversation_id):
    convo = _get_group(conversation_id, request.user)
    if not convo:
        return Response({'detail': 'not your group'}, status=403)

    convo.participants.remove(request.user)

    remaining = convo.participants.all()
    if not remaining.exists():
        convo.delete()                     # last one out kills the group
        return Response(status=204)

    if convo.owner_id == request.user.id:
        convo.owner = remaining.first()    # hand ownership to whoevers left
        convo.save()

    return Response(status=204)