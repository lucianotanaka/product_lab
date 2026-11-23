<#
.SYNOPSIS
    Script de Gerenciamento do Ambiente ProductLab.

.DESCRIPTION
    Automatiza o ciclo de vida completo do ambiente de desenvolvimento:
    1. Verificação do serviço local do PostgreSQL no Windows.
    2. Checagem de conectividade e prontidão do banco.
    3. Configuração das variáveis de ambiente do Backend e Frontend.
    4. Execução dos servidores Backend (FastAPI/Uvicorn :8000) e Frontend (Vite :5173).

.PARAMETER Action
    - 'start'   : Inicia backend e frontend, validando o PostgreSQL local. (Padrão)
    - 'stop'    : Encerra backend e frontend.
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
$PIDS_FILE      = "$PROJECT_ROOT\.productlab.pids"
$DB_NAME        = "product_lab"
$DB_USER        = "postgres"
$DB_PASSWORD    = "nttbsp"
$PG_SERVICE_NAME = "postgresql-x64-18"
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

function Get-PythonExe {
    $pythonExe = "$PROJECT_ROOT\backend\venv\Scripts\python.exe"
    if (Test-Path $pythonExe) { return $pythonExe }
    return "python"
}

function Test-PostgresConnection {
    param(
        [string]$Database = $DB_NAME
    )

    $pythonExe = Get-PythonExe
    $tempScriptPath = Join-Path $PROJECT_ROOT "backend\tmp_pg_runtime_test.py"
    $scriptContent = @"
import sys
import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        dbname="${Database}",
        user="${DB_USER}",
        password="${DB_PASSWORD}",
        connect_timeout=3,
    )
    cur = conn.cursor()
    cur.execute("SELECT 1;")
    cur.fetchone()
    cur.close()
    conn.close()
    print("OK")
except Exception as e:
    print(str(e))
    sys.exit(1)
"@
    Set-Content -Path $tempScriptPath -Value $scriptContent -Encoding UTF8
    & $pythonExe $tempScriptPath
    return ($LASTEXITCODE -eq 0)
}

function Get-UserCount {
    $pythonExe = Get-PythonExe
    $tempScriptPath = Join-Path $PROJECT_ROOT "backend\tmp_pg_usercount_test.py"
    $scriptContent = @"
import psycopg2
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="${DB_NAME}",
    user="${DB_USER}",
    password="${DB_PASSWORD}",
    connect_timeout=3,
)
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM users;")
print(cur.fetchone()[0])
cur.close()
conn.close()
"@
    Set-Content -Path $tempScriptPath -Value $scriptContent -Encoding UTF8
    try {
        $result = & $pythonExe $tempScriptPath
        if ($LASTEXITCODE -eq 0) {
            return ($result | Select-Object -First 1).ToString().Trim()
        }
    } catch {}
    return $null
}

function New-DefaultAdmin {
    $pythonExe = Get-PythonExe
    $adminEmail    = "admin@productlab.local"
    $adminPassword = "Admin@2026"
    $adminName     = "Administrator"
    $tempScriptPath = Join-Path $PROJECT_ROOT "backend\tmp_pg_seed_admin.py"

    $scriptContent = @"
import bcrypt
import psycopg2

admin_email = "${adminEmail}"
admin_password = "${adminPassword}"
admin_name = "${adminName}"

pw_hash = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt(12)).decode()

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="${DB_NAME}",
    user="${DB_USER}",
    password="${DB_PASSWORD}",
    connect_timeout=3,
)
cur = conn.cursor()
cur.execute(
    "INSERT INTO users (user_full_name,user_email,user_password,user_is_active,user_role,created_at,updated_at) VALUES (%s,%s,%s,true,'admin',NOW(),NOW())",
    (admin_name, admin_email, pw_hash)
)
conn.commit()
cur.close()
conn.close()
print("OK")
"@
    Set-Content -Path $tempScriptPath -Value $scriptContent -Encoding UTF8

    & $pythonExe $tempScriptPath | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Usuario admin criado!" -ForegroundColor Green
        Write-Host "     Email   : $adminEmail" -ForegroundColor Yellow
        Write-Host "     Senha   : $adminPassword" -ForegroundColor Yellow
        Write-Host "     ATENCAO : Altere a senha apos o primeiro login!" -ForegroundColor Red
    } else {
        Write-Host "   Nao foi possivel criar o admin automaticamente. Crie-o manualmente apos subir o backend." -ForegroundColor Yellow
        Write-Host "   Endpoint sugerido: POST /api/v1/auth/register" -ForegroundColor Gray
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
    Write-Host "    `(sem argumento`)          Inicia banco + backend + frontend" -ForegroundColor White
    Write-Host "    -Start                   Idem — inicia todos os servicos" -ForegroundColor White
    Write-Host "    -Stop                    Encerra backend e frontend" -ForegroundColor White
    Write-Host "    -Restart                 Para e reinicia tudo" -ForegroundColor White
    Write-Host "    -RebuildBackend          Reinstala dependencias do backend (se necessario)" -ForegroundColor White
    Write-Host "                             e reinicia backend/frontend locais" -ForegroundColor Gray
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
    Write-Host "    Banco      localhost:5432  (PostgreSQL local Windows)" -ForegroundColor Gray
    Write-Host "    Servico PG $PG_SERVICE_NAME" -ForegroundColor Gray
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host ""
}

# ─── FUNÇÃO: RebuildBackend ────────────────────────────────────────────────────
function Rebuild-Backend {
    Write-Host "`n[REBUILD BACKEND] Reinstalando dependencias e reiniciando ambiente local..." -ForegroundColor Cyan

    $pythonExe = Get-PythonExe
    if (-not (Test-Path "$PROJECT_ROOT\backend\venv\Scripts\Activate.ps1")) {
        Write-Host "-> venv nao encontrado. Criando ambiente virtual..." -ForegroundColor Yellow
        $setupCmd = "Set-Location '$PROJECT_ROOT\backend'; python -m venv venv; .\venv\Scripts\Activate.ps1; pip install --upgrade pip; pip install -r requirements.txt"
        $proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $setupCmd -PassThru
        $proc.WaitForExit()
    } else {
        Write-Host "-> Atualizando dependencias do backend..." -ForegroundColor Yellow
        & $pythonExe -m pip install -r "$PROJECT_ROOT\backend\requirements.txt"
    }

    Stop-ProductLab
    Start-Sleep -Seconds 2
    Start-ProductLab
}

# ─── FUNÇÃO: Stop ──────────────────────────────────────────────────────────────
function Stop-ProductLab {
    Write-Host "`n[STOP] Encerrando ambiente ProductLab..." -ForegroundColor Yellow

    $trackedPids = @()

    # 1. Encerra PIDs registrados no arquivo .productlab.pids
    if (Test-Path $PIDS_FILE) {
        Write-Host "-> Encerrando processos registrados ($PIDS_FILE)..." -ForegroundColor Gray
        $trackedPids = Get-Content $PIDS_FILE |
            ForEach-Object { $_.Trim() } |
            Where-Object { $_ -match '^\d+$' } |
            ForEach-Object { [int]$_ }

        foreach ($pid_ in $trackedPids) {
            $proc = Get-Process -Id $pid_ -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "   Encerrando PID $pid_ ($($proc.Name) - $($proc.MainWindowTitle))" -ForegroundColor Gray
                Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
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

    Start-Sleep -Seconds 1

    # 2. Fecha janelas PowerShell/cmd iniciadas pelo launcher e que tenham ficado órfãs
    if ($trackedPids.Count -gt 0) {
        Write-Host "-> Verificando janelas filhas/orfas do backend/frontend..." -ForegroundColor Gray
        Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object {
                ($_.ParentProcessId -in $trackedPids) -or
                (
                    ($_.Name -ieq "powershell.exe" -or $_.Name -ieq "cmd.exe") -and
                    $_.CommandLine -match "ProductLab - (BACKEND|FRONTEND)"
                )
            } |
            ForEach-Object {
                Write-Host "   Encerrando processo auxiliar PID $($_.ProcessId) ($($_.Name))" -ForegroundColor Gray
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            }
    }

    # 3. Fallback adicional por título de janela
    Get-Process powershell -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowTitle -like 'ProductLab*' } |
        ForEach-Object {
            Write-Host "   Fechando janela remanescente: '$($_.MainWindowTitle)' (PID $($_.Id))" -ForegroundColor Gray
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }

    # 4. Libera portas do backend/frontend
    Write-Host "-> Liberando portas 8000 e 5173..." -ForegroundColor Gray
    Release-Port 8000
    Release-Port 5173

    Write-Host "[OK] Ambiente encerrado. O servico PostgreSQL local foi mantido ativo.`n" -ForegroundColor Green
}

# ─── FUNÇÃO: Start ─────────────────────────────────────────────────────────────
function Start-ProductLab {
    Write-Host "`n[START] Inicializando ProductLab..." -ForegroundColor Cyan

    # ── 1. Serviço PostgreSQL local ────────────────────────────────────────────
    Write-Host "`n[1/5] Verificando servico PostgreSQL local..." -ForegroundColor Cyan
    $pgService = Get-Service -Name $PG_SERVICE_NAME -ErrorAction SilentlyContinue

    if (-not $pgService) {
        Write-Host "[ERRO] Servico '$PG_SERVICE_NAME' nao foi encontrado." -ForegroundColor Red
        Write-Host "       Ajuste a variavel `\$PG_SERVICE_NAME no script caso o nome do servico seja diferente." -ForegroundColor Yellow
        return
    }

    if ($pgService.Status -ne "Running") {
        Write-Host "-> Servico '$PG_SERVICE_NAME' esta parado. Iniciando..." -ForegroundColor Yellow
        Start-Service -Name $PG_SERVICE_NAME -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        $pgService.Refresh()
    }

    if ($pgService.Status -ne "Running") {
        Write-Host "[ERRO] Servico '$PG_SERVICE_NAME' nao iniciou corretamente." -ForegroundColor Red
        return
    }

    Write-Host "[OK] Servico PostgreSQL '$PG_SERVICE_NAME' em execucao." -ForegroundColor Green

    # ── 2. Aguardar banco aceitar conexões ─────────────────────────────────────
    Write-Host "`n[2/5] Validando conectividade com o banco..." -ForegroundColor Cyan
    $sp = @('|','/','-','\')
    $ready = $false
    $retries = 0
    while (-not $ready -and $retries -lt 20) {
        if (Test-PostgresConnection) {
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
        Write-Host "[ERRO] Nao foi possivel conectar ao banco '$DB_NAME' em localhost:5432." -ForegroundColor Red
        Write-Host "       Verifique se o banco foi restaurado e se o usuario/senha estao corretos." -ForegroundColor Yellow
        return
    }

    Write-Host "[OK] Banco '$DB_NAME' pronto e funcional." -ForegroundColor Green

    # ── 3. Seed opcional de admin ──────────────────────────────────────────────
    Write-Host "`n[3/5] Verificando se banco precisa de seed..." -ForegroundColor Cyan
    $userCount = Get-UserCount
    if ($userCount -eq "0" -or $null -eq $userCount -or $userCount -eq "") {
        Write-Host "-> Banco vazio. Criando usuario admin padrao..." -ForegroundColor Yellow
        New-DefaultAdmin
    } else {
        Write-Host "[OK] Banco ja possui $userCount usuario(s)." -ForegroundColor Green
    }

    # ── 4. .env do Backend e Frontend ──────────────────────────────────────────
    Write-Host "`n[4/5] Configurando ambientes..." -ForegroundColor Cyan
    $backendEnvPath = "$PROJECT_ROOT\backend\.env"
    $pwEncoded = $DB_PASSWORD -replace "@", "%40"

    if (-not (Test-Path $backendEnvPath)) {
        Write-Host "-> backend\.env nao encontrado. Criando..." -ForegroundColor Yellow
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
        $envContent = Get-Content $backendEnvPath -Raw
        $envContent = [regex]::Replace($envContent, 'DATABASE_URL=.*', "DATABASE_URL=postgresql://${DB_USER}:${pwEncoded}@localhost:5432/${DB_NAME}")
        $envContent = [regex]::Replace($envContent, 'DATABASE_URL_SYNC=.*', "DATABASE_URL_SYNC=postgresql://${DB_USER}:${pwEncoded}@localhost:5432/${DB_NAME}")
        Set-Content -Path $backendEnvPath -Value $envContent -Encoding UTF8 -Force
        Write-Host "[OK] backend\.env atualizado para PostgreSQL local." -ForegroundColor Green
    }

    Set-Content -Path "$PROJECT_ROOT\frontend\.env" -Value "VITE_API_URL=$VITE_API_URL" -Encoding UTF8 -Force
    Write-Host "[OK] frontend\.env -> VITE_API_URL=$VITE_API_URL" -ForegroundColor Green

    if (-not (Test-Path "$PROJECT_ROOT\backend\venv\Scripts\Activate.ps1")) {
        Write-Host "-> venv nao encontrado. Criando e instalando dependencias..." -ForegroundColor Yellow
        $setupCmd = "Set-Location '$PROJECT_ROOT\backend'; python -m venv venv; .\venv\Scripts\Activate.ps1; pip install --upgrade pip; pip install -r requirements.txt; Write-Host 'Dependencias instaladas.'"
        $proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $setupCmd -PassThru
        $proc.WaitForExit()
    }

    # ── 5. Backend e Frontend ───────────────────────────────────────────────────
    Write-Host "`n[5/5] Subindo Backend e Frontend..." -ForegroundColor Cyan

    Write-Host "-> Encerrando processos anteriores nas portas 8000 e 5173..." -ForegroundColor Gray
    Release-Port 8000
    Release-Port 5173
    Start-Sleep -Seconds 1

    $backendCmd = "`$host.ui.RawUI.WindowTitle = 'ProductLab - BACKEND :8000'; Set-Location '$PROJECT_ROOT\backend'; .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    $backendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Minimized -PassThru
    Write-Host "-> Backend iniciado (PID $($backendProc.Id) | janela: 'ProductLab - BACKEND :8000'). Aguardando startup..." -ForegroundColor Yellow

    $backendReady = $false
    $bRetries = 0
    $spinIdx = 0
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

    "$($backendProc.Id)`n$($frontendProc.Id)" | Set-Content $PIDS_FILE -Encoding UTF8
    Write-Host "-> PIDs registrados em '$PIDS_FILE' (backend=$($backendProc.Id), frontend=$($frontendProc.Id))" -ForegroundColor Gray

    Start-Sleep -Seconds 5

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
    Write-Host "  Servico   : $PG_SERVICE_NAME" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "`n  Para encerrar: .\manage_productlab.ps1 stop" -ForegroundColor Gray
    Write-Host ""
}

# ─── FLUXO PRINCIPAL ───────────────────────────────────────────────────────────
if ($Help)               { Show-Help }
elseif ($Stop)           { Stop-ProductLab }
elseif ($Restart)        { Stop-ProductLab; Start-Sleep -Seconds 2; Start-ProductLab }
elseif ($RebuildBackend) { Rebuild-Backend }
else                     { Start-ProductLab }   # -Start ou nenhum argumento → start
