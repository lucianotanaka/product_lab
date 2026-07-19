#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Product Lab — Iniciar o Backend FastAPI
# Execute no servidor: bash /opt/product_lab/frontend/start_backend.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

BACKEND="/opt/product_lab/backend"
FRONTEND="/opt/product_lab/frontend"
VENV="$BACKEND/venv/bin"
LOG="/opt/product_lab/logs/backend.log"

echo "======================================================"
echo "  PRODUCT LAB — Iniciando Backend"
echo "======================================================"

# 1. Verificar se o backend já está rodando
if pgrep -f "uvicorn app.main:app" > /dev/null 2>&1; then
    echo "⚠  Backend já está rodando (PID: $(pgrep -f 'uvicorn app.main:app'))"
    echo "   Para reiniciar: pkill -f 'uvicorn app.main:app' && bash $0"
    exit 0
fi

# 2. Executar setup se os arquivos do backend não existirem
if [ ! -f "$BACKEND/app/core/config.py" ]; then
    echo "📦 Estrutura do backend não encontrada. Executando setup..."
    python3 "$FRONTEND/setup_backend.py"
fi

# 3. Instalar dependências se necessário
echo "📦 Verificando dependências (SSL bypass para proxy corporativo)..."
$VENV/pip install -r "$BACKEND/requirements.txt" -q \
    --trusted-host pypi.org \
    --trusted-host files.pythonhosted.org \
    --trusted-host pypi.python.org \
    --no-warn-script-location 2>&1 | grep -v "^WARNING" || true

# 4. Criar .env se não existir
if [ ! -f "$BACKEND/.env" ]; then
    echo "⚙  Criando .env com credenciais padrão..."
    cat > "$BACKEND/.env" << 'EOF'
DATABASE_URL=postgresql://productlab:prdctmngr@2026@localhost:5432/product_lab
APP_ENV=production
DEBUG=false
SECRET_KEY=product-lab-secret-key-2026
ALLOWED_ORIGINS=http://172.30.100.3,http://localhost:5173,http://localhost:3000
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
EOF
fi

# 5. Executar migrations
echo "🗄  Executando migrations..."
cd "$BACKEND"
DATABASE_URL="postgresql://productlab:prdctmngr@2026@localhost:5432/product_lab" \
    $VENV/alembic upgrade head 2>/dev/null || \
    DATABASE_URL="postgresql://productlab:prdctmngr@2026@localhost:5432/product_lab" \
    $VENV/alembic revision --autogenerate -m "initial" && \
    $VENV/alembic upgrade head || true

# 6. Iniciar uvicorn em background
echo "🚀 Iniciando uvicorn na porta 8000..."
mkdir -p "$(dirname $LOG)"
cd "$BACKEND"
nohup $VENV/uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2 \
    --log-level info \
    >> "$LOG" 2>&1 &

BACKEND_PID=$!
echo "   PID: $BACKEND_PID"
sleep 2

# 7. Verificar se iniciou
if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo ""
    echo "✅ Backend iniciado com sucesso!"
    echo "   Health: http://localhost:8000/api/v1/health"
    echo "   Docs:   http://localhost:8000/api/docs"
    echo "   Log:    $LOG"
else
    echo ""
    echo "⚠  Backend pode não ter iniciado. Verifique o log:"
    echo "   tail -50 $LOG"
fi

echo "======================================================"
