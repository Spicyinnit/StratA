from .models import Account
from django.db import transaction

def update_balance(user, amount):
    try:
        with transaction.atomic():
            account = Account.objects.select_for_update().get(pk = user.pk)
            if 0 < account.balance + amount < 900000000:
                account.balance += amount
            account.save()
        return {"success": "Successfully updated balance.", "new_balance": str(account.balance)}
    except (ValueError, TypeError, KeyError):
        return {"error": "Invalid request!"}