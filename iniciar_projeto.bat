@echo off
REM Define o diretório do projeto como a localização do script
SET ProjectDir=%~dp0

ECHO =========================================================
ECHO Iniciando o Projeto Lanchonete (Inicialização Sequencial)...
ECHO =========================================================

REM ----------------------------------------------------------------------
REM 0. ABRIR VSCODE (Minimizado)
REM Abre o Visual Studio Code no diretório raiz do projeto, minimizado.
REM ----------------------------------------------------------------------
ECHO 0. ABRINDO VISUAL STUDIO CODE (MINIMIZADO)...
start /min "" code "%ProjectDir%"

REM ----------------------------------------------------------------------
REM 1. Servidor Principal (Minimizado)
REM Inicia 'node server.js' no diretório raiz do projeto, minimizado.
REM ----------------------------------------------------------------------
ECHO 1. INICIANDO SERVIDOR PRINCIPAL (MINIMIZADO)...
start /min "Servidor Principal (node server.js)" cmd /k "cd /d "%ProjectDir%" & node server.js"

REM ----------------------------------------------------------------------
REM AGUARDANDO: Damos um TIMEOUT de 10 segundos para o servidor subir antes
REM de iniciar os clientes. Você pode ajustar este tempo.
REM ----------------------------------------------------------------------
ECHO.
ECHO AGUARDANDO 10 SEGUNDOS para o Servidor inicializar...
timeout /t 10 /nobreak

REM ----------------------------------------------------------------------
REM 2. Admin Client (PORTA 3000 FIXA) (Minimizado)
REM Força o Admin a usar a porta 3000, minimizado.
REM ----------------------------------------------------------------------
ECHO.
ECHO 2. INICIANDO ADMIN CLIENT na porta 3000 (MINIMIZADO)...
start /min "Admin Client (lanchonete-admin) - Porta 3000" cmd /k "cd /d "%ProjectDir%lanchonete-admin" & SET PORT=3000 & CALL npm start"

REM ----------------------------------------------------------------------
REM AGUARDANDO: Damos um TIMEOUT de 5 segundos antes de iniciar o segundo cliente.
REM ----------------------------------------------------------------------
ECHO.
ECHO AGUARDANDO 5 SEGUNDOS antes de iniciar o App Client...
timeout /t 5 /nobreak

REM ----------------------------------------------------------------------
REM 3. App Client (PORTA 3002 FIXA) (Minimizado)
REM Força a porta 3002, minimizado.
REM ----------------------------------------------------------------------
ECHO.
ECHO 3. INICIANDO APP CLIENT na porta 3002 (MINIMIZADO)...
start /min "App Client (lanchonete-app) - Porta 3002" cmd /k "cd /d "%ProjectDir%lanchonete-app" & SET PORT=3002 & CALL npm start"

ECHO.
ECHO =========================================================
ECHO Todos os componentes foram iniciados.
ECHO Feche as janelas de prompt para encerrar os processos.
ECHO =========================================================
pause
