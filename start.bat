@echo off
start "Backend" cmd /k "cd backend && call .venv\Scripts\activate && python manage.py runserver"
start "Frontend" cmd /k "cd frontend && npm run dev"

:: only use in situations where the .vscode does not work . or type everythign by yourself idc