@echo off
title Mur de Post-it - Lancement automatique
color 0A

echo ========================================
echo  MUR DE POST-IT - LANCEMENT AUTOMATIQUE
echo ========================================
echo.

:: Vérifier si Node.js est installé
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas trouve !
    echo        Telechargez-le depuis https://nodejs.org
    pause
    exit /b 1
)

:: Vérifier si Python est disponible (optionnel)
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ATTENTION] Python non detecte - le serveur frontal ne demarrera pas automatiquement
    echo            Ouvrez manuellement index.html dans Chrome
    set PYTHON_DISPO=0
) else (
    set PYTHON_DISPO=1
)

echo [1/4] Arret des processus existants...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Installation des dependances backend...
cd backend
if not exist "node_modules" (
    echo Installation de express, cors, sqlite3...
    npm install --silent
) else (
    echo Les dependances sont deja installees.
)
cd ..

echo [3/4] Demarrage du serveur backend...
start "Serveur Backend (port 3000)" cmd /c "cd backend && node server.js"
timeout /t 3 /nobreak >nul

echo [4/4] Demarrage du serveur frontend...
if %PYTHON_DISPO%==1 (
    start "Serveur Frontend (port 8000)" cmd /c "cd frontend && python -m http.server 8000"
    timeout /t 2 /nobreak >nul
    echo.
    echo ========================================
    echo  ✅ APPLICATION LANCEE !
    echo ========================================
    echo.
    echo [Backend] http://localhost:3000/api/notes
    echo [Frontend] http://localhost:8000
    echo.
    echo Ouvrez Chrome automatiquement ?
    choice /C OO /N /T 10 /D O >nul
    if errorlevel 2 (
        echo Ouverture annulee. Ouvrez manuellement Chrome.
    ) else (
        start chrome http://localhost:8000
    )
) else (
    echo.
    echo ========================================
    echo  ⚠️  SERVEUR FRONTEND NON LANCE
    echo ========================================
    echo.
    echo 1. Assurez-vous d'avoir Python installe
    echo 2. Ou ouvrez manuellement index.html :
    echo    cd frontend
    echo    start index.html
    echo.
    pause
    exit /b 1
)

echo.
echo Appuyez sur une touche pour quitter...
pause >nul
