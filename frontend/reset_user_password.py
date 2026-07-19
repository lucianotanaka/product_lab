#!/usr/bin/env python3
"""
Product Lab — Reset de Senha de Usuário (executar NO SERVIDOR)

Uso no servidor:
  cd /opt/product_lab
  python3 frontend/reset_user_password.py

Requisitos: venv do backend com bcrypt instalado
  /opt/product_lab/backend/venv/bin/python3 frontend/reset_user_password.py
"""
import sys
import os
import getpass

# Adiciona o backend ao path para usar as dependências do venv
BACKEND = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, BACKEND)

# DATABASE_URL do .env do backend (se existir)
env_file = os.path.join(BACKEND, ".env")
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                os.environ.setdefault("DATABASE_URL", line.split("=", 1)[1])

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://productlab:prdctmngr@2026@localhost:5432/product_lab"
)

def make_hash(password: str) -> str:
    """Gera hash bcrypt compatível com passlib."""
    import bcrypt
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

def list_users(conn):
    cur = conn.cursor()
    cur.execute("SELECT user_id, user_email, user_full_name, user_is_active FROM users ORDER BY user_id")
    rows = cur.fetchall()
    cur.close()
    print("\n┌─────┬────────────────────────────────────────┬──────────────────────────┬────────┐")
    print("│  ID │ E-MAIL                                 │ NOME                     │ ATIVO  │")
    print("├─────┼────────────────────────────────────────┼──────────────────────────┼────────┤")
    for r in rows:
        print(f"│{r[0]:4} │ {r[1]:<38} │ {r[2]:<24} │ {'Sim' if r[3] else 'Não':<6} │")
    print("└─────┴────────────────────────────────────────┴──────────────────────────┴────────┘")
    return rows

def main():
    print("=" * 60)
    print("  PRODUCT LAB — Reset de Senha (Servidor)")
    print("=" * 60)
    print(f"\n  Banco: {DB_URL.split('@')[-1] if '@' in DB_URL else DB_URL}")

    try:
        import psycopg2
    except ImportError:
        print("\n❌ psycopg2 não encontrado. Execute com o venv do backend:")
        print("   /opt/product_lab/backend/venv/bin/python3 frontend/reset_user_password.py")
        sys.exit(1)

    # Conectar ao banco
    try:
        conn = psycopg2.connect(DB_URL)
        print("\n✅ Conectado ao banco product_lab")
    except Exception as e:
        print(f"\n❌ Erro ao conectar: {e}")
        sys.exit(1)

    # Listar usuários
    print("\n📋 Usuários cadastrados:")
    rows = list_users(conn)

    if not rows:
        print("\n⚠  Nenhum usuário encontrado.")
        conn.close(); sys.exit(0)

    # Selecionar usuário
    print()
    email = input("E-mail do usuário para reset (ou ID): ").strip()

    # Buscar por ID ou e-mail
    cur = conn.cursor()
    if email.isdigit():
        cur.execute("SELECT user_id, user_email, user_full_name FROM users WHERE user_id = %s", (int(email),))
    else:
        cur.execute("SELECT user_id, user_email, user_full_name FROM users WHERE user_email = %s", (email,))
    user = cur.fetchone()
    cur.close()

    if not user:
        print(f"\n❌ Usuário não encontrado: {email}")
        conn.close(); sys.exit(1)

    uid, uemail, uname = user
    print(f"\n✔ Usuário selecionado: [{uid}] {uname} ({uemail})")

    # Nova senha
    while True:
        nova = getpass.getpass("\nNova senha (min. 8 caracteres): ")
        if len(nova) < 8:
            print("⚠  Senha muito curta."); continue
        conf = getpass.getpass("Confirme a nova senha: ")
        if nova != conf:
            print("⚠  As senhas não conferem."); continue
        break

    # Gerar hash e atualizar
    print("\n⏳ Gerando hash bcrypt...")
    hashed = make_hash(nova)

    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET user_password = %s, updated_at = NOW() WHERE user_id = %s",
        (hashed, uid)
    )
    conn.commit()
    cur.close()
    conn.close()

    print(f"\n✅ Senha redefinida com sucesso para: {uemail}")
    print("   Faça login no Product Lab com a nova senha.")
    print("=" * 60)

if __name__ == "__main__":
    main()
