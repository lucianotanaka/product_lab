<#
.SYNOPSIS
    Script de Gerenciamento do Ambiente ProductLab.

.DESCRIPTION
    Automatiza o ciclo de vida completo do ambiente de desenvolvimento:
    1. Inicialização da engine do Docker Desktop.
    2. Gestão do container PostgreSQL e checagem de prontidão do banco.
    3. Configuração das variáveis de ambiente do Backend e Frontend.
    4. Execução dos servidores Backend (FastAPI/Uvicorn :8000) e Frontend (Vite :5173).

.PARAMETER Action
    - 'start'   : Inicia banco, backend e frontend. (Padrão)
    - 'stop'    : Encerra todos os serviços.
    - 'restart' : Para e reinicia tudo.

.EXAMPLE
    .\manage_productlab.ps1
    .\manage_productlab.ps1 -Action start
    .\manage_productlab.ps1 stop
    .\manage_productlab.ps1 restart
#>

# IMPORTANTE: param DEVE ser a primeira instrução executável do script (após comentários)
param (
    [switch]$Start,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$RebuildBackend,
    [switch]$Help
)

# Configuração de encoding — vem DEPOIS do param
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ─── CONFIGURAÇÕES ─────────────────────────────────────────────────────────────
$PROJECT_ROOT   = "C:\Users\luciano.tanaka\Projects\product_lab"
$PIDS_FILE      = "$PROJECT_ROOT\.productlab.pids"   # arquivo de rastreamento de PIDs
$CONTAINER_NAME = "productlab_db"   # container_name definido em docker-compose.yml
$DB_NAME        = "product_lab"
$DB_USER        = "productlab"
$DB_PASSWORD    = "prdctmngr@2026"   # senha original; usar %40 na DATABASE_URL
$DOCKER_EXE     = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# Com proxy Vite configurado em vite.config.ts, o caminho relativo /api/v1
# é encaminhado automaticamente para http://localhost:8000/api/v1
$VITE_API_URL   = "/api/v1"

# ─── HELPER: libera uma porta matando o processo que a ocupa ───────────────────
function Release-Port {
    param([int]$Port)
    $pids = netstat -ano 2>$null |
        Select-String ":$Port\s" |
        ForEach-Object { ($_ -split '\s+')[-1] } |
        Where-Object { $_ -match '^\d+$' } |
        Select-Object -Unique

    foreach ($p in $pids) {
        try {
            Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
            Write-Host "   PID $p (porta $Port) encerrado." -ForegroundColor Gray
        } catch {}
    }
}

# ─── FUNÇÃO: Show-Help ────────────────────────────────────────────────────────
function Show-Help {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  ProductLab — Gerenciador de Ambiente" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  USO:" -ForegroundColor Yellow
    Write-Host "    .\manage_productlab.ps1 [opcao]" -ForegroundColor White
    Write-Host ""
    Write-Host "  OPCOES:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    (sem argumento)          Inicia banco + backend + frontend" -ForegroundColor White
    Write-Host "    -Start                   Idem — inicia todos os servicos" -ForegroundColor White
    Write-Host "    -Stop                    Encerra todos os servicos e libera portas" -ForegroundColor White
    Write-Host "    -Restart                 Para e reinicia todos os servicos" -ForegroundColor White
    Write-Host "    -RebuildBackend          Reconstroi a imagem Docker do backend" -ForegroundColor White
    Write-Host "                             e reinicia o container (aplica mudancas de codigo)" -ForegroundColor Gray
    Write-Host "    -Help                    Exibe este menu de ajuda" -ForegroundColor White
    Write-Host ""
    Write-Host "  EXEMPLOS:" -ForegroundColor Yellow
    Write-Host "    .\manage_productlab.ps1" -ForegroundColor Green
    Write-Host "    .\manage_productlab.ps1 -Start" -ForegroundColor Green
    Write-Host "    .\manage_productlab.ps1 -Stop" -ForegroundColor Green
    Write-Host "    .\manage_productlab.ps1 -Restart" -ForegroundColor Green
    Write-Host "    .\manage_productlab.ps1 -RebuildBackend" -ForegroundColor Green
    Write-Host "    .\manage_productlab.ps1 -Help" -ForegroundColor Green
    Write-Host ""
    Write-Host "  SERVICOS:" -ForegroundColor Yellow
    Write-Host "    Frontend   http://localhost:5173" -ForegroundColor Gray
    Write-Host "    Backend    http://localhost:8000" -ForegroundColor Gray
    Write-Host "    API Docs   http://localhost:8000/api/docs" -ForegroundColor Gray
    Write-Host "    Banco      localhost:5432  (PostgreSQL via Docker)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host ""
}

# ─── FUNÇÃO: RebuildBackend ────────────────────────────────────────────────────
function Rebuild-Backend {
    Write-Host "`n[REBUILD BACKEND] Reconstruindo imagem e reiniciando container do backend..." -ForegroundColor Cyan

    # Verifica se Docker está ativo
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Docker nao esta ativo. Inicie o Docker Desktop e tente novamente." -ForegroundColor Red
        return
    }

    # Rebuild + restart só do container backend (mantém db intacto)
    Write-Host "-> Executando: docker-compose up -d --build backend" -ForegroundColor Yellow
    docker compose -f "$PROJECT_ROOT\docker-compose.yml" up -d --build backend
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Falha ao reconstruir o backend. Verifique o Dockerfile e os logs." -ForegroundColor Red
        Write-Host "   Dica: docker compose logs backend" -ForegroundColor Gray
        return
    }

    # Aguarda o backend responder
    $backendReady = $false
    $retries = 0; $spinIdx2 = 0
    $sp2 = @('|','/','-','\')
    while (-not $backendReady -and $retries -lt 30) {
        $retries++
        $pct2 = [int](($retries / 30) * 20)
        $bar2 = ('#' * $pct2).PadRight(20)
        for ($fk = 0; $fk -lt 15; $fk++) {
            Write-Host "`r   $($sp2[$spinIdx2%4]) Aguardando backend (rebuild)... [$bar2]   " -NoNewline -ForegroundColor Yellow
            $spinIdx2++
            Start-Sleep -Milliseconds 200
        }
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) { $backendReady = $true }
        } catch {}
    }
    Write-Host ""

    if ($backendReady) {
        Write-Host "`n[OK] Backend reconstruido e operacional em http://localhost:8000" -ForegroundColor Green
        Write-Host "     API Docs : http://localhost:8000/api/docs" -ForegroundColor Yellow
    } else {
        Write-Host "`n[AVISO] Backend nao respondeu no tempo esperado." -ForegroundColor Yellow
        Write-Host "   Verifique os logs: docker compose logs backend" -ForegroundColor Gray
    }
}

# ─── FUNÇÃO: Stop ──────────────────────────────────────────────────────────────
function Stop-ProductLab {
    Write-Host "`n[STOP] Encerrando ambiente ProductLab..." -ForegroundColor Yellow

    # 1. Encerra PIDs registrados no arquivo .productlab.pids
    if (Test-Path $PIDS_FILE) {
        Write-Host "-> Encerrando processos registrados ($PIDS_FILE)..." -ForegroundColor Gray
        Get-Content $PIDS_FILE | ForEach-Object {
            $pid_ = $_.Trim()
            if ($pid_ -match '^\d+$') {
                $proc = Get-Process -Id ([int]$pid_) -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "   Encerrando PID $pid_ ($($proc.Name) - $($proc.MainWindowTitle))" -ForegroundColor Gray
                    Stop-Process -Id ([int]$pid_) -Force -ErrorAction SilentlyContinue
                }
            }
        }
        Remove-Item $PIDS_FILE -Force -ErrorAction SilentlyContinue
        Write-Host "   Arquivo de PIDs removido." -ForegroundColor Gray
    } else {
        # Fallback: fecha por título de janela (compatibilidade com sessões antigas)
        Write-Host "-> Nenhum arquivo de PIDs encontrado. Buscando por titulo de janela..." -ForegroundColor Gray
        Get-Process powershell -ErrorAction SilentlyContinue |
            Where-Object { $_.MainWindowTitle -like 'ProductLab*' } |
            ForEach-Object {
                Write-Host "   Fechando: '$($_.MainWindowTitle)' (PID $($_.Id))" -ForegroundColor Gray
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
    }

    # 2. Libera portas (garante que processos filhos também sejam encerrados)
    Write-Host "-> Liberando portas 8000, 5173 e 5432..." -ForegroundColor Gray
    Release-Port 8000
    Release-Port 5173
    Release-Port 5432

    # 2. Para o container PostgreSQL (se existir e estiver rodando)
    $containerRunning = docker inspect -f '{{.State.Running}}' $CONTAINER_NAME 2>$null
    if ($containerRunning -eq "true") {
        Write-Host "-> Parando container '$CONTAINER_NAME'..." -ForegroundColor Gray
        docker stop $CONTAINER_NAME | Out-Null
        Write-Host "   Container parado." -ForegroundColor Gray
    } else {
        Write-Host "-> Container '$CONTAINER_NAME' ja esta parado ou nao existe." -ForegroundColor Gray
    }

    # 3. Para o servico Windows do PostgreSQL local, se existir
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue |
                 Where-Object { $_.Status -eq "Running" } |
                 Select-Object -First 1
    if ($pgService) {
        Write-Host "-> Parando servico Windows PostgreSQL '$($pgService.Name)'..." -ForegroundColor Yellow
        Stop-Service -Name $pgService.Name -Force -ErrorAction SilentlyContinue
        Write-Host "   Servico parado." -ForegroundColor Gray
    }

    Write-Host "[OK] Ambiente encerrado.`n" -ForegroundColor Green
}

# ─── FUNÇÃO: Start ─────────────────────────────────────────────────────────────
function Start-ProductLab {
    Write-Host "`n[START] Inicializando ProductLab..." -ForegroundColor Cyan

    # ── 1. Docker Engine ────────────────────────────────────────────────────────
    Write-Host "`n[1/6] Verificando Docker Engine..." -ForegroundColor Cyan
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "-> Docker inativo. Abrindo Docker Desktop..." -ForegroundColor Yellow
        Start-Process $DOCKER_EXE
        $timeout = 60; $elapsed = 0
        while ($elapsed -lt $timeout) {
            Start-Sleep -Seconds 3; $elapsed += 3
            docker info > $null 2>&1
            if ($LASTEXITCODE -eq 0) { break }
            Write-Host "   Aguardando Docker... (${elapsed}s)" -ForegroundColor Gray
        }
        if ($elapsed -ge $timeout) {
            Write-Host "[ERRO] Docker nao iniciou. Abra-o manualmente e tente novamente." -ForegroundColor Red
            return
        }
    }
    Write-Host "[OK] Docker Engine online." -ForegroundColor Green

    # ── 2/3. Container PostgreSQL (libera porta só se necessário) ───────────────
    Write-Host "`n[2/6] Verificando container '$CONTAINER_NAME'..." -ForegroundColor Cyan
    $containerStatus = docker inspect -f '{{.State.Running}}' $CONTAINER_NAME 2>$null

    if ($containerStatus -eq "true") {
        Write-Host "[OK] Container ja esta em execucao com porta mapeada." -ForegroundColor Green
    } elseif ($containerStatus -eq "false") {
        Write-Host "-> Reiniciando container existente..." -ForegroundColor Yellow
        docker start $CONTAINER_NAME | Out-Null
        Write-Host "   Container reiniciado." -ForegroundColor Green
    } else {
        # Container nao existe — verifica se a porta 5432 esta livre antes de criar
        Write-Host "-> Container nao encontrado. Verificando porta 5432..." -ForegroundColor Yellow
        $port5432InUse = netstat -ano 2>$null | Select-String ":5432\s"
        if ($port5432InUse) {
            Write-Host "   Porta 5432 ocupada por outro processo. Liberando..." -ForegroundColor Yellow
            # Para servico Windows PostgreSQL local
            $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue |
                         Where-Object { $_.Status -eq "Running" } | Select-Object -First 1
            if ($pgService) {
                Stop-Service -Name $pgService.Name -Force -ErrorAction SilentlyContinue
                Write-Host "   Servico Windows '$($pgService.Name)' parado." -ForegroundColor Gray
            }
            # Para outros containers Docker que ocupam a porta 5432
            $otherContainers = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -ne $CONTAINER_NAME }
            foreach ($c in $otherContainers) {
                $ports = docker inspect -f '{{.HostConfig.PortBindings}}' $c 2>$null
                if ($ports -match "5432") {
                    Write-Host "   Parando container '$c' que ocupa porta 5432..." -ForegroundColor Yellow
                    docker stop $c | Out-Null
                }
            }
            Start-Sleep -Seconds 2
        }
        Write-Host "-> Subindo container via docker-compose (servico 'db')..." -ForegroundColor Yellow
        docker compose -f "$PROJECT_ROOT\docker-compose.yml" up -d --no-deps db
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERRO] Falha ao subir o container. Verifique o docker-compose.yml." -ForegroundColor Red
            return
        }
    }

    # ── 3b. Seed: cria admin padrão se o banco estiver vazio ───────────────────
    # Aguarda o container estar pronto para aceitar conexões antes do seed
    Write-Host "`n[3b] Verificando se banco precisa de seed..." -ForegroundColor Cyan
    $userCount = docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME `
        psql -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM users;" 2>$null
    if ($userCount -eq "0" -or $null -eq $userCount) {
        Write-Host "-> Banco vazio. Criando usuario admin padrao..." -ForegroundColor Yellow

        # Gera hash bcrypt via Python (usa o venv do backend se disponivel)
        $pythonExe = "$PROJECT_ROOT\backend\venv\Scripts\python.exe"
        if (-not (Test-Path $pythonExe)) { $pythonExe = "python" }

        $adminEmail    = "admin@productlab.local"
        $adminPassword = "Admin@2026"
        $adminName     = "Administrator"

        $hashScript = "import bcrypt; pw='$adminPassword'.encode(); h=bcrypt.hashpw(pw,bcrypt.gensalt(12)).decode(); print(h)"
        $pwHash = & $pythonExe -c $hashScript 2>$null

        if ($pwHash) {
            $insertSQL = "INSERT INTO users (user_full_name,user_email,user_password,user_is_active,user_role,created_at,updated_at) VALUES ('$adminName','$adminEmail',`'$pwHash`',true,'admin',NOW(),NOW());"
            docker exec -e PGPASSWORD=$DB_PASSWORD $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c $insertSQL > $null 2>&1
            Write-Host "[OK] Usuario admin criado!" -ForegroundColor Green
            Write-Host "     Email   : $adminEmail" -ForegroundColor Yellow
            Write-Host "     Senha   : $adminPassword" -ForegroundColor Yellow
            Write-Host "     ATENCAO : Altere a senha apos o primeiro login!" -ForegroundColor Red
        } else {
            Write-Host "   Nao foi possivel gerar hash. Crie o admin manualmente apos subir o backend:" -ForegroundColor Yellow
            Write-Host "   POST /api/v1/auth/register" -ForegroundColor Gray
        }
    } else {
        Write-Host "[OK] Banco ja possui $userCount usuario(s)." -ForegroundColor Green
    }

    # ── 4. Aguardar PostgreSQL aceitar conexões ─────────────────────────────────
    Write-Host "`n[4/6] Aguardando PostgreSQL ficar pronto..." -ForegroundColor Cyan
    $sp = @('|','/','-','\')
    $ready = $false; $retries = 0
    while (-not $ready -and $retries -lt 20) {
        $env:PGPASSWORD = $DB_PASSWORD
        docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
        } else {
            $retries++
            $pb = [int](($retries / 20) * 20)
            $barDb = ('#' * $pb).PadRight(20)
            for ($fj = 0; $fj -lt 10; $fj++) {
                Write-Host "`r   $($sp[($retries*10+$fj)%4]) Aguardando PostgreSQL... [$barDb]   " -NoNewline -ForegroundColor Yellow
                Start-Sleep -Milliseconds 200
            }
        }
    }
    Write-Host ""
    if (-not $ready) {
        Write-Host "[ERRO] PostgreSQL nao respondeu. Verifique o container." -ForegroundColor Red
        return
    }
    Write-Host "[OK] Banco '$DB_NAME' pronto." -ForegroundColor Green

    # ── 5. .env do Backend ──────────────────────────────────────────────────────
    Write-Host "`n[5/6] Configurando ambientes..." -ForegroundColor Cyan
    $backendEnvPath = "$PROJECT_ROOT\backend\.env"
    if (-not (Test-Path $backendEnvPath)) {
        Write-Host "-> backend\.env nao encontrado. Criando..." -ForegroundColor Yellow
        # @ na senha deve ser URL-encoded como %40 na connection string
        $pwEncoded = $DB_PASSWORD -replace "@", "%40"
        $backendEnvContent = @"
APP_ENV=development
DEBUG=true
DATABASE_URL=postgresql://${DB_USER}:${pwEncoded}@localhost:5432/${DB_NAME}
DATABASE_URL_SYNC=postgresql://${DB_USER}:${pwEncoded}@localhost:5432/${DB_NAME}
SECRET_KEY=dev-secret-key-troque-em-producao-$(Get-Random -Maximum 999999)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
"@
        Set-Content -Path $backendEnvPath -Value $backendEnvContent -Encoding UTF8 -Force
        Write-Host "   backend\.env criado (edite SECRET_KEY antes de producao)." -ForegroundColor Green
    } else {
        # Corrige DATABASE_URL se apontar para 'db' (Docker interno) em vez de 'localhost'
        $envContent = Get-Content $backendEnvPath -Raw
        if ($envContent -match "@db:") {
            $envContent = $envContent -replace "@db:", "@localhost:"
            Set-Content -Path $backendEnvPath -Value $envContent -Encoding UTF8 -Force
            Write-Host "   DATABASE_URL corrigida: @db -> @localhost." -ForegroundColor Yellow
        }
        Write-Host "[OK] backend\.env encontrado." -ForegroundColor Green
    }

    # .env do Frontend
    Set-Content -Path "$PROJECT_ROOT\frontend\.env" -Value "VITE_API_URL=$VITE_API_URL" -Encoding UTF8 -Force
    Write-Host "[OK] frontend\.env -> VITE_API_URL=$VITE_API_URL" -ForegroundColor Green

    # Verifica venv Python
    if (-not (Test-Path "$PROJECT_ROOT\backend\venv\Scripts\Activate.ps1")) {
        Write-Host "-> venv nao encontrado. Criando e instalando dependencias..." -ForegroundColor Yellow
        $setupCmd = "Set-Location '$PROJECT_ROOT\backend'; python -m venv venv; .\venv\Scripts\Activate.ps1; pip install --upgrade pip; pip install -r requirements.txt; Write-Host 'Dependencias instaladas.'"
        $proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $setupCmd -PassThru
        $proc.WaitForExit()
    }

    # ── 6. Backend e Frontend ───────────────────────────────────────────────────
    Write-Host "`n[6/6] Subindo Backend e Frontend..." -ForegroundColor Cyan

    # Fecha janelas anteriores (mata processos existentes nas portas)
    Write-Host "-> Encerrando processos anteriores nas portas 8000 e 5173..." -ForegroundColor Gray
    Release-Port 8000
    Release-Port 5173
    Start-Sleep -Seconds 1

    $backendCmd = "`$host.ui.RawUI.WindowTitle = 'ProductLab - BACKEND :8000'; Set-Location '$PROJECT_ROOT\backend'; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --reload-dir app --host 127.0.0.1 --port 8000"
    $backendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Minimized -PassThru
    Write-Host "-> Backend iniciado (PID $($backendProc.Id) | janela: 'ProductLab - BACKEND :8000'). Aguardando startup..." -ForegroundColor Yellow

    # Aguarda o backend responder em /api/v1/health antes de subir o frontend
    $backendReady = $false
    $bRetries = 0; $spinIdx = 0
    while (-not $backendReady -and $bRetries -lt 20) {
        $bRetries++
        $pct = [int](($bRetries / 20) * 20)
        $bar = ('#' * $pct).PadRight(20)
        for ($fi = 0; $fi -lt 10; $fi++) {
            Write-Host "`r   $($sp[$spinIdx%4]) Aguardando backend... [$bar]   " -NoNewline -ForegroundColor Yellow
            $spinIdx++
            Start-Sleep -Milliseconds 200
        }
        try {
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) { $backendReady = $true }
        } catch {}
    }
    Write-Host ""
    if ($backendReady) {
        Write-Host "[OK] Backend respondendo em http://127.0.0.1:8000" -ForegroundColor Green
    } else {
        Write-Host "[AVISO] Backend nao respondeu no tempo esperado. Verifique a janela minimizada." -ForegroundColor Yellow
    }

    $frontendCmd = "`$host.ui.RawUI.WindowTitle = 'ProductLab - FRONTEND :5173'; Set-Location '$PROJECT_ROOT\frontend'; npm run dev"
    $frontendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Minimized -PassThru
    Write-Host "-> Frontend iniciado (PID $($frontendProc.Id) | janela: 'ProductLab - FRONTEND :5173'). Aguardando Vite compilar..." -ForegroundColor Yellow

    # Salva PIDs no arquivo para uso pelo -Stop
    "$($backendProc.Id)`n$($frontendProc.Id)" | Set-Content $PIDS_FILE -Encoding UTF8
    Write-Host "-> PIDs registrados em '$PIDS_FILE' (backend=$($backendProc.Id), frontend=$($frontendProc.Id))" -ForegroundColor Gray

    Start-Sleep -Seconds 5

    # Abre o browser somente se ProductLab não estiver já carregado
    $browserProcs = Get-Process -Name chrome, msedge, firefox, brave, opera, iexplore -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowTitle -like '*localhost:5173*' -or $_.MainWindowTitle -like '*PRODUCT LAB*' }
    if ($browserProcs) {
        Write-Host "-> Browser com ProductLab ja esta aberto. Nenhuma nova aba sera aberta." -ForegroundColor Green
    } else {
        Start-Process "http://localhost:5173/productlab/"
        Write-Host "-> Browser aberto em http://localhost:5173/productlab/" -ForegroundColor Green
    }

    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "  ProductLab esta operacional!" -ForegroundColor Green
    Write-Host "----------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "  Frontend  : http://localhost:5173" -ForegroundColor Yellow
    Write-Host "  API Docs  : http://localhost:8000/api/docs  (Swagger)" -ForegroundColor Yellow
    Write-Host "  Banco     : localhost:5432 | DB: $DB_NAME | User: $DB_USER" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "`n  Para encerrar: .\manage_productlab.ps1 stop" -ForegroundColor Gray
    Write-Host ""
}

# ─── FLUXO PRINCIPAL ───────────────────────────────────────────────────────────
if ($Help)             { Show-Help }
elseif ($Stop)         { Stop-ProductLab }
elseif ($Restart)      { Stop-ProductLab; Start-Sleep -Seconds 2; Start-ProductLab }
elseif ($RebuildBackend) { Rebuild-Backend }
else                   { Start-ProductLab }   # -Start ou nenhum argumento → start
