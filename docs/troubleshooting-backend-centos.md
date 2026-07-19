# Documentação de Deploy e Resolução de Problemas — Product Lab Backend

## 1. Visão Geral do Ambiente

* **Sistema Operacional:** CentOS Stream
* **Servidor Web / Proxy Reverso:** Apache (`httpd` v2.4.62)
* **Servidor de Aplicação (Backend):** FastAPI rodando via Uvicorn na porta `127.0.0.1:8000`
* **Banco de Dados:** PostgreSQL (Database: `product_lab`, Usuário: `productlab`)
* **Gerenciador de Processos:** Systemd

---

## 2. Configuração do Arquivo de Ambiente (`.env`)

O Systemd possui um leitor rígido para o `EnvironmentFile`. Linhas com comentários decorativos (ex: `# ───`) ou espaços inadequados fazem com que o serviço ignore as variáveis, forçando o FastAPI a assumir valores padrões (*fallback*), o que causa falhas de autenticação.

Além disso, caracteres especiais como `@` na senha precisam ser codificados como `%40` na string de conexão (`DATABASE_URL`) para evitar que os drivers Python quebrem a interpretação do host.

Crie o arquivo limpo exatamente em `/opt/product_lab/backend/.env`:

```text
DATABASE_URL=postgresql://productlab:prdctmngr%402026@localhost:5432/product_lab
DATABASE_URL_SYNC=postgresql://productlab:prdctmngr%402026@localhost:5432/product_lab
APP_ENV=production
DEBUG=false
SECRET_KEY=9a2b8c7d6e5f4b3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://172.30.100.3
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20

```

> **Segurança:** A `SECRET_KEY` acima é um exemplo estático de produção. Para gerar uma nova chave criptográfica segura de 64 caracteres via terminal, utilize: `openssl rand -hex 32`.

---

## 3. Configuração do Serviço Systemd

Para que o backend rode em segundo plano e inicialize automaticamente com o sistema, certifique-se de que o arquivo `/etc/systemd/system/productlab-backend.service` contenha a diretiva `EnvironmentFile` apontando para o arquivo criado no passo anterior.

```ini
[Unit]
Description=Product Lab Backend Service (FastAPI)
After=network.target postgresql.service

[Service]
User=root
WorkingDirectory=/opt/product_lab/backend
EnvironmentFile=/opt/product_lab/backend/.env
ExecStart=/opt/product_lab/backend/venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target

```

Após qualquer alteração neste arquivo, aplique os comandos de ciclo de vida do serviço:

```bash
# Recarregar as configurações do Systemd
sudo systemctl daemon-reload

# Limpar o histórico de falhas e loops de restart do serviço
sudo systemctl reset-failed productlab-backend

# Inicializar o backend
sudo systemctl restart productlab-backend

```

---

## 4. Segurança de Rede e Políticas do SELinux

Por padrão, o SELinux opera no modo `Enforcing` (Bloqueio) no CentOS, impedindo que o Apache (`httpd`) direcione requisições para portas de rede locais, como a porta `8000` do Uvicorn. Isso resulta em um erro **HTTP 503 Service Unavailable** no navegador.

Para liberar o fluxo de dados mantendo o servidor seguro e com o SELinux ativo, execute as diretivas abaixo:

```bash
# Garantir que o SELinux está ativo (Modo de Bloqueio)
sudo setenforce 1

# Permitir permanentemente (-P) que o Apache realize conexões de rede de proxy externo/interno
sudo setsebool -P httpd_can_network_connect 1

```

Com certeza! Diante dos últimos acontecimentos e da resolução definitiva dos bloqueios, precisamos atualizar o documento **`troubleshooting-backend-centos.md`** (ou `DEPLOY_RUNBOOK.md`) para incluir a resolução dos erros de permissões do SELinux e do Systemd.

Adicione estas duas novas seções ao seu documento para que ele fique completo e cubra as falhas de inicialização (`status=203/EXEC` e `Permission denied` no `.env`):

---

### 4.1. Permissões de Leitura do Arquivo `.env` pelo Systemd

Se o arquivo `.env` for recriado ou editado diretamente por usuários restritos ou via redirecionamento de comando (como `cat << EOF`), o SELinux pode bloquear o acesso de leitura ao gerenciador de serviços do sistema.

**Sintoma no log (`journalctl`):**

> `productlab-backend.service: Failed to load environment files: Permission denied`

**Solução:**
Ajuste as permissõesPOSIX de leitura do arquivo e aplique explicitamente o rótulo de segurança do SELinux que autoriza o gerenciamento pelo Systemd:

```bash
# Conceder permissão de leitura global ao arquivo
chmod 644 /opt/product_lab/backend/.env

# Definir o contexto correto do SELinux para arquivos de unidade do Systemd
chcon -t systemd_unit_file_t /opt/product_lab/backend/.env

```

---

### 4.2. Erro de Execução do Ambiente Virtual (`status=203/EXEC`)

Como a estrutura da aplicação está localizada no diretório `/opt`, o SELinux restringe por padrão a execução automatizada de binários e interpretadores (como o Python dentro do `venv`) através de serviços do sistema.

**Sintoma no log (`journalctl`):**

> `productlab-backend.service: Failed to locate executable /opt/product_lab/backend/venv/bin/python: Permission denied`
> `Main PID: XXXX (code=exited, status=203/EXEC)`

**Solução:**
Cadastre uma política persistente na base de dados do SELinux para sinalizar que o diretório de execução do ambiente virtual do backend contém binários de sistema confiáveis (`bin_t`):

```bash
# 1. Registrar a regra de mapeamento para os binários do ambiente virtual
semanage fcontext -a -t bin_t "/opt/product_lab/backend/venv/bin(/.*)?"

# 2. Forçar a restauração e aplicação imediata do contexto nos arquivos
restorecon -R -v /opt/product_lab/backend/venv/bin

```

---

Incluindo esses passos, qualquer pessoa que pegar esse guia conseguirá resolver o deploy em poucos minutos se o SELinux voltar a barrar o interpretador ou as variáveis!

---

## 5. Script de Validação da Pilha (Health Check)

Para auditar se a infraestrutura está operando corretamente sem precisar abrir a interface gráfica, execute a sequência de comandos abaixo no terminal da VM:

```bash
# 1. Verificar se o processo Python/FastAPI está estável e consumindo memória normalmente
sudo systemctl status productlab-backend

# 2. Testar se o Apache está encaminhando o tráfego e recebendo a resposta direta do Uvicorn
curl -I http://127.0.0.1/api/docs

```

### Comportamento esperado do sucesso:

Ao rodar o `curl`, o servidor deve retornar o status **`HTTP/1.1 200 OK`** e expor a assinatura do servidor backend no cabeçalho:

```text
HTTP/1.1 200 OK
Server: uvicorn
Content-Type: text/html; charset=utf-8

```

---

## 6. Logs de Suporte para Resolução de Problemas

Caso a aplicação volte a apresentar instabilidade, os logs detalhados do interpretador Python e do ciclo de conexões do SQLAlchemy podem ser extraídos em tempo real através do diário do sistema:

```bash
journalctl -u productlab-backend.service -n 50 --no-pager

```