# Deploy do Product Lab em servidor CentOS

## Objetivo

Este documento descreve um passo a passo para publicar o **Product Lab** em um servidor **CentOS / CentOS Stream** com:

- **Frontend React + Vite** servido por **Nginx**
- **Backend FastAPI** executando com **Uvicorn** como serviço `systemd`
- **Banco PostgreSQL**
- **HTTPS com certificado gratuito Let's Encrypt**
- **Proxy reverso Nginx** para encaminhar `/api` ao backend

> Arquitetura recomendada para este projeto:
>
> - **Nginx: necessário**
> - **Apache: não necessário**
>
> Motivos:
>
> 1. O frontend é gerado como arquivos estáticos (`vite build`), o que o Nginx atende muito bem.
> 2. O backend FastAPI deve ficar atrás de um proxy reverso.
> 3. O projeto já usa rota relativa para API no frontend (`/api/v1`) e base pública `/productlab/`, o que encaixa bem com Nginx.
> 4. Para HTTPS gratuito, o fluxo com **Certbot + Nginx** é simples e amplamente suportado.

---

## 1. Visão geral da solução

### Componentes do Product Lab identificados no projeto

- **Frontend**
  - React 19
  - Vite 8
  - Build estático com `npm run build`
  - Base pública configurada como:
    - `/productlab/`
- **Backend**
  - FastAPI
  - Uvicorn
  - SQLAlchemy
  - Pydantic Settings
- **Banco**
  - PostgreSQL
- **Integração frontend/backend**
  - O frontend usa:
    - `VITE_API_URL` ou, por padrão, `"/api/v1"`
  - Em produção, o ideal é manter:
    - `"/api/v1"`
  - O proxy Nginx encaminha `/api/` para o backend na porta `8000`

### Topologia sugerida

- `https://seu-dominio.com/productlab/` → frontend
- `https://seu-dominio.com/api/` → proxy para FastAPI local em `127.0.0.1:8000`

---

## 2. Pré-requisitos

Antes de começar, tenha:

- servidor CentOS / CentOS Stream com acesso `sudo`
- DNS do domínio apontando para o IP do servidor
- portas liberadas no firewall:
  - `80/tcp`
  - `443/tcp`

Exemplo de domínio usado neste tutorial:

- `seu-dominio.com`

Exemplo de diretório da aplicação:

- `/opt/product_lab`

Exemplo de usuário de execução:

- `productlab`

---

## 3. Atualizar o sistema operacional

```bash
sudo dnf update -y
```

### Resultado esperado

- Pacotes do sistema atualizados sem erro.
- Ao final, algo semelhante a:

```text
Complete!
```

---

## 4. Instalar pacotes básicos

```bash
sudo dnf install -y git curl wget vim unzip tar policycoreutils-python-utils firewalld
```

### Resultado esperado

```text
Installed:
  git
  curl
  wget
  vim
  ...
Complete!
```

---

## 5. Habilitar e iniciar firewall

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Resultado esperado

Para os comandos de inclusão e reload, o esperado é:

```text
success
success
```

Verificação:

```bash
sudo firewall-cmd --list-services
```

### Resultado esperado

Após executar os comandos abaixo com sucesso:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

a saída deve conter `http` e `https`, por exemplo:

```text
cockpit dhcpv6-client http https ssh
```

> Se o resultado exibido for apenas:
>
> ```text
> cockpit dhcpv6-client ssh
> ```
>
> isso indica que as regras de `http` e `https` ainda não foram aplicadas na zona ativa do firewalld. Nesse caso, repetir:
>
> ```bash
> sudo firewall-cmd --permanent --add-service=http
> sudo firewall-cmd --permanent --add-service=https
> sudo firewall-cmd --reload
> sudo firewall-cmd --list-services
> ```
>
> Resultado esperado após a correção:
>
> ```text
> cockpit dhcpv6-client http https ssh
> ```

---

## 6. Instalar Nginx

```bash
sudo dnf install -y nginx
sudo systemctl enable --now nginx
```

### Resultado esperado

```text
Created symlink ...
```

Verificação:

```bash
systemctl status nginx --no-pager
```

### Resultado esperado

```text
Active: active (running)
```

> **Conclusão sobre Apache**
>
> **Apache não é necessário** para esta arquitetura.
> O **Nginx sozinho** atende:
>
> - frontend estático
> - proxy reverso para FastAPI
> - terminação TLS/HTTPS
> - renovação de certificado Let's Encrypt

---

## 7. Instalar Node.js para build do frontend

Para Vite/React, recomenda-se uma versão moderna do Node.js.

### Opção recomendada: Node.js 22 via NodeSource

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs
```

Verificação:

```bash
node -v
npm -v
```

### Resultado esperado

Algo semelhante a:

```text
v22.x.x
10.x.x
```

> Se a política do ambiente proibir repositórios externos, usar o Node fornecido internamente pela empresa, desde que compatível com Vite 8.

---

## 8. Instalar Python e dependências de compilação

```bash
sudo dnf install -y python3 python3-pip python3-devel gcc gcc-c++ make libffi-devel openssl-devel
```

Verificação:

```bash
python3 --version
pip3 --version
```

### Resultado esperado

```text
Python 3.x.x
pip x.x from ...
```

---

## 9. Instalar PostgreSQL

Para este ambiente (**CentOS Stream 10**), recomenda-se **PostgreSQL 18 + pgvector**.

Motivos:
- está disponível nativamente no `appstream` em ambientes compatíveis
- é mais atual que PostgreSQL 16
- já possui pacote `postgresql18-pgvector`
- atende melhor a uma evolução futura com **IA + RAG + embeddings**

### 9.1 Verificar se os repositórios já oferecem PostgreSQL 18

Antes de instalar, confirmar se os pacotes estão disponíveis:

```bash
dnf repolist
dnf list available "postgresql18*" "postgresql18-pgvector"
```

### Resultado esperado

Saída contendo pacotes como:

```text
postgresql18.x86_64
postgresql18-server.x86_64
postgresql18-contrib.x86_64
postgresql18-pgvector.x86_64
```

### 9.2 Se os pacotes não aparecerem, ajustar os repositórios antes da instalação

Atualizar metadados e conferir se os repositórios base do sistema estão habilitados:

```bash
sudo dnf clean all
sudo dnf makecache
sudo dnf repolist all | grep -Ei "appstream|baseos|crb"
```

Se `appstream` ou `baseos` estiverem desabilitados, habilitar:

```bash
sudo dnf install -y 'dnf-command(config-manager)'
sudo dnf config-manager --set-enabled appstream
sudo dnf config-manager --set-enabled baseos
sudo dnf makecache
```

Depois repetir a verificação:

```bash
dnf list available "postgresql18*" "postgresql18-pgvector"
```

### Resultado esperado

Os pacotes devem passar a aparecer na listagem.  
Se ainda assim não aparecerem, validar com o administrador do ambiente se os repositórios corporativos/espelhos internos do CentOS Stream 10 estão completos antes de prosseguir.

### 9.3 Instalar PostgreSQL 18 e pgvector

```bash
sudo dnf install -y postgresql18 postgresql18-server postgresql18-contrib postgresql18-pgvector
```

### Resultado esperado

```text
Installed:
  postgresql18
  postgresql18-server
  postgresql18-contrib
  postgresql18-pgvector
  ...
Complete!
```

### 9.4 Inicializar banco

```bash
sudo /usr/bin/postgresql-setup --initdb --unit postgresql
sudo systemctl enable --now postgresql
```

Verificação:

```bash
systemctl status postgresql --no-pager
```

### Resultado esperado

```text
Active: active (running)
```

### 9.5 Backup e restauração do PostgreSQL

Antes de criar a base da aplicação, é recomendável registrar os comandos de backup e restauração.

#### 9.5.1 Backup lógico de um banco específico

```bash
pg_dump -h localhost -U productlab -d product_lab -F c -f /opt/backups/product_lab_$(date +%Y%m%d_%H%M%S).dump
```

### Resultado esperado

Geração de um arquivo `.dump` no diretório de backup, sem erro na execução.

#### 9.5.2 Backup de todos os bancos/roles (ambiente completo)

```bash
sudo -u postgres pg_dumpall -f /opt/backups/postgres_full_$(date +%Y%m%d_%H%M%S).sql
```

### Resultado esperado

Geração de um arquivo `.sql` contendo roles, databases e objetos do cluster.

#### 9.5.3 Restauração de backup lógico customizado

```bash
pg_restore -h localhost -U productlab -d product_lab -c /opt/backups/SEU_BACKUP.dump
```

### Resultado esperado

Saídas com recriação de objetos, por exemplo:

```text
CREATE TABLE
ALTER TABLE
CREATE INDEX
```

#### 9.5.4 Restauração de backup SQL completo

```bash
sudo -u postgres psql -f /opt/backups/SEU_BACKUP.sql
```

### Resultado esperado

Execução sequencial dos comandos SQL do backup, sem erro crítico.

> Recomendação:
>
> - criar o diretório de backup antes do uso:
>
> ```bash
> sudo mkdir -p /opt/backups
> sudo chown postgres:postgres /opt/backups
> ```
>
> - manter cópia externa dos backups
> - testar restauração periodicamente em ambiente de homologação

### 9.6 Criar banco, usuário e permissões do Product Lab

Entrar no PostgreSQL:

```bash
sudo -u postgres psql
```

No prompt do PostgreSQL, executar:

```sql
CREATE USER productlab WITH PASSWORD 'prdctmngr@2026';
CREATE DATABASE product_lab OWNER productlab;
GRANT ALL PRIVILEGES ON DATABASE product_lab TO productlab;
\q
```

### Resultado esperado

```text
CREATE ROLE
CREATE DATABASE
GRANT
```

### 9.7 Ajustar autenticação local do PostgreSQL para uso com senha

Em alguns ambientes CentOS, o PostgreSQL vem configurado com autenticação `ident` ou `peer` no arquivo `pg_hba.conf`.  
Nesses casos, ao tentar conectar com:

```bash
psql -h localhost -U productlab -d product_lab
```

pode ocorrer erro como:

```text
FATAL:  Ident authentication failed for user "productlab"
```

#### 9.7.1 Descobrir o caminho do `pg_hba.conf`

```bash
sudo -u postgres psql -c "SHOW hba_file;"
```

### Resultado esperado

Saída semelhante a:

```text
               hba_file
---------------------------------------
 /var/lib/pgsql/data/pg_hba.conf
```

#### 9.7.2 Verificar as regras ativas

```bash
sudo grep -v '^#' /CAMINHO/DO/pg_hba.conf | grep -v '^$'
```

Se houver linhas com `ident` ou `peer`, por exemplo como neste caso real:

```text
local   all             all                                     peer
host    all             all             127.0.0.1/32            ident
host    all             all             ::1/128                 ident
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            ident
host    replication     all             ::1/128                 ident
```

isso indica que conexões locais e TCP loopback ainda estão usando autenticação por identidade do sistema operacional, e não por senha.

#### 9.7.3 Fazer backup do `pg_hba.conf` e editar o arquivo

Criar uma cópia de segurança:

```bash
sudo cp /CAMINHO/DO/pg_hba.conf /CAMINHO/DO/pg_hba.conf.bak
```

Abrir o arquivo para edição:

```bash
sudo vim /CAMINHO/DO/pg_hba.conf
```

Para o Product Lab, o mais seguro é **manter o usuário administrativo `postgres` com acesso local via `peer`** e exigir senha para os demais usuários.  
Assim, substituir estas linhas:

```text
local   all             all                                     peer
host    all             all             127.0.0.1/32            ident
host    all             all             ::1/128                 ident
```

por:

```text
local   all             postgres                                peer
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
```

> A ordem das linhas importa. A linha do `postgres` deve ficar **antes** da regra geral `local all all`.

Se quiser padronizar também replicação local com senha, pode substituir o bloco inteiro:

```text
local   all             all                                     peer
host    all             all             127.0.0.1/32            ident
host    all             all             ::1/128                 ident
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            ident
host    replication     all             ::1/128                 ident
```

por:

```text
local   all             postgres                                peer
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
local   replication     all                                     scram-sha-256
host    replication     all             127.0.0.1/32            scram-sha-256
host    replication     all             ::1/128                 scram-sha-256
```

Salvar o arquivo no `vim` com:

```text
:wq
```

> Se o ambiente ainda usar `md5`, também funciona, mas a recomendação atual é `scram-sha-256`.

#### 9.7.4 Reiniciar o PostgreSQL

```bash
sudo systemctl restart postgresql
```

### Resultado esperado

```text
Active: active (running)
```

### 9.8 Validar a autenticação por senha

Antes de habilitar a extensão, testar a conexão:

```bash
psql -h localhost -U productlab -d product_lab -c "SELECT current_user, current_database();"
```

### Resultado esperado

```text
 current_user | current_database
--------------+------------------
 productlab   | product_lab
(1 row)
```

> O comando solicitará a senha `prdctmngr@2026`.

### 9.9 Habilitar a extensão pgvector no banco

A extensão `vector` normalmente exige privilégios de **superuser** no PostgreSQL.  
Por isso, mesmo que o usuário `productlab` consiga conectar no banco, é esperado ocorrer erro como:

```text
ERROR:  permission denied to create extension "vector"
HINT:  Must be superuser to create this extension.
```

Portanto, criar a extensão com o usuário administrativo `postgres`:

```bash
sudo -u postgres psql -d product_lab -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Se esse comando retornar erro como:

```text
FATAL:  password authentication failed for user "postgres"
```

isso indica que a regra `local all all scram-sha-256` passou a valer também para o usuário `postgres`.  
Nesse caso, revisar o `pg_hba.conf` e garantir que exista **antes** da regra geral a linha:

```text
local   all             postgres                                peer
```

Depois reiniciar o PostgreSQL novamente:

```bash
sudo systemctl restart postgresql
```

e repetir o comando de criação da extensão.

### Resultado esperado

```text
CREATE EXTENSION
```

Verificação opcional:

```bash
psql -h localhost -U productlab -d product_lab -W -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

### Resultado esperado

```text
 extname
---------
 vector
(1 row)
```

---

## 10. Testar conexão com o banco `product_lab`

Após a criação do banco, do usuário e da extensão, validar a conectividade:

```bash
psql -h localhost -U productlab -d product_lab -c "SELECT current_database();"
```

### Resultado esperado

```text
 current_database
------------------
 product_lab
(1 row)
```

> O comando solicitará a senha do usuário `productlab`.

---

## 11. Criar usuário de sistema para a aplicação

```bash
sudo useradd --system --create-home --shell /bin/bash productlab
```

### Resultado esperado

Sem saída de erro.

Verificação:

```bash
id productlab
```

### Resultado esperado

```text
uid=... (productlab) gid=... (productlab) groups=...
```

---

## 12. Publicar o código da aplicação

> **Importante:** Toda a sessão 12 segue esta ordem:
>
> 1. Preparar a versão no **ambiente de desenvolvimento** (12.1)
> 2. Publicar no **GitHub** a partir do desenvolvimento (12.2)
> 3. Executar as etapas restantes no **servidor de produção** (12.3 em diante)

### 12.1 Preparar a versão no ambiente de desenvolvimento
> Esta seção é executada no **ambiente de desenvolvimento**, no seu computador local.

Antes de qualquer ação no servidor, preparar e validar a versão no ambiente de desenvolvimento.

Fluxo recomendado no desenvolvimento:

1. abrir a raiz do projeto local
2. garantir que o repositório Git local está íntegro
3. revisar arquivos `.env` e variáveis necessárias
4. validar backend e frontend
5. confirmar que a versão está estável
6. enviar a versão para o GitHub antes do deploy em produção

Exemplos no ambiente de desenvolvimento na sua estação Windows, usando PowerShell e partindo da raiz do repositório local:

```powershell
cd C:\Users\luciano.tanaka\Projects\product_lab
git status
```

Se você fez alterações no ambiente de desenvolvimento e quer que elas sigam para produção, deve executar os comandos **em sequência**, nesta ordem:

1. `git add .` — preparar os arquivos alterados da pasta atual para o commit
2. `git commit -m "docs: ajusta tutorial de deploy no CentOS"` — registrar localmente a alteração com uma mensagem de commit clara e objetiva
3. `git push` — enviar a alteração para o GitHub

Use `git pull origin main` **apenas se precisar primeiro trazer para sua máquina local o que já está no GitHub**, antes de publicar novas alterações:

```powershell
cd C:\Users\luciano.tanaka\Projects\product_lab
git pull origin main
```

> Se a branch principal do repositório não for `main`, ajustar para `master` ou para o nome correto da branch.

Se o ambiente virtual Python ainda não existir no desenvolvimento, criar **dentro da pasta `backend/` do projeto**:

```bash
cd product_lab/backend
python -m venv .venv
```

Ativar o ambiente virtual a partir da pasta `backend/`:

```bash
source .venv/bin/activate
```

> Em Windows PowerShell, o equivalente costuma ser:
>
> ```powershell
> .\.venv\Scripts\Activate.ps1
> ```

Confirmar que o arquivo esperado existe no desenvolvimento:

```text
product_lab/backend/requirements.txt
```

Se ele tiver sido removido localmente por engano, recuperar do repositório:

```bash
cd product_lab
git checkout -- backend/requirements.txt
```

Instalar dependências do backend no desenvolvimento:

```bash
cd product_lab/backend
python -m pip install -r requirements.txt
```

Validar também o frontend no desenvolvimento:

```bash
cd product_lab/frontend
npm install
npm run build
```

> Publicar diretamente no servidor sem validar antes em desenvolvimento aumenta o risco de levar código incompleto, dependências quebradas ou scripts de banco desatualizados.

### 12.2 Publicar a versão validada no GitHub

Depois de validar localmente, enviar a versão que será implantada para o repositório remoto.

> Boa prática para a mensagem de commit:
>
> - começar com um verbo objetivo
> - resumir a alteração principal
> - opcionalmente usar um prefixo por contexto, por exemplo:
>   - `docs:` para documentação
>   - `feat:` para nova funcionalidade
>   - `fix:` para correção
>   - `refactor:` para reorganização sem mudança funcional
>
> Exemplo recomendado para este caso:
>
> ```powershell
> git commit -m "docs: ajusta tutorial de deploy no CentOS"
> ```

Exemplo no Windows PowerShell:

```powershell
cd C:\Users\luciano.tanaka\Projects\product_lab
git status
git add .
git commit -m "docs: ajusta tutorial de deploy no CentOS"
git push origin main
```

Fluxo recomendado na estação Windows para **mandar atualizações do desenvolvimento para o GitHub**:

```powershell
cd C:\Users\luciano.tanaka\Projects\product_lab
git status
git add .
git commit -m "docs: ajusta tutorial de deploy no CentOS"
git push origin main
```

Se precisar antes sincronizar sua cópia local com o que já existe no GitHub, executar adicionalmente:

```powershell
cd C:\Users\luciano.tanaka\Projects\product_lab
git pull origin main
```

### Resultado esperado

O `git commit` deve retornar algo como:

```text
[main abc1234] docs: ajusta tutorial de deploy no CentOS
 1 file changed, ...
```

e o `git push` deve retornar algo semelhante a:

```text
To https://github.com/lucianotanaka/product_lab.git
   <hash>..<hash>  main -> main
```

> Ajustar o nome da branch (`main`, `master` ou outra) conforme o fluxo do projeto.
>
> Se o Git pedir autenticação no Windows, poderá ser necessário informar usuário GitHub e token de acesso pessoal (PAT), já que o remoto está configurado via HTTPS.

### 12.3 Ajustar acesso ao GitHub no servidor de produção

Antes de restaurar o código no servidor, garantir que o acesso ao GitHub está funcional no ambiente de produção.

Para este projeto, como o repositório está público, o fluxo mais simples é usar HTTPS:

```bash
git --version
```

### Resultado esperado

Saída semelhante a:

```text
git version 2.x.x
```

Testar acesso ao repositório remoto:

```bash
git ls-remote https://github.com/lucianotanaka/product_lab.git
```

### Resultado esperado

Saída com hashes e refs do repositório, por exemplo:

```text
<hash>	HEAD
<hash>	refs/heads/main
```

> Se esse teste falhar por proxy, DNS, firewall corporativo ou bloqueio de saída HTTPS, corrigir o acesso de rede ao GitHub antes de continuar.
>
> Se no futuro o repositório deixar de ser público, será necessário configurar autenticação no servidor via SSH key ou token antes do clone/pull.

### 12.4 Restaurar o código do GitHub no servidor de produção

Somente depois que a versão estiver publicada no GitHub, restaurar o código no servidor.

Se for a primeira vez no servidor:

```bash
sudo rm -rf /opt/product_lab
sudo mkdir -p /opt/product_lab
sudo chown -R productlab:productlab /opt/product_lab
sudo -u productlab git clone https://github.com/lucianotanaka/product_lab.git /opt/product_lab
```

### Resultado esperado

```text
Cloning into '/opt/product_lab'...
```

Depois do clone, validar:

```bash
cd /opt/product_lab
ls -la
```

A listagem deve conter pelo menos:

```text
.git
backend
frontend
database
docs
```

### 12.5 Atualizar o código no servidor quando o clone já existir

Se o diretório `/opt/product_lab` já contiver um clone Git válido do Product Lab, atualizar assim.

> **Importante:** no servidor, prefira executar os comandos Git com o mesmo usuário dono do diretório, que neste tutorial é `productlab`.  
> Isso evita erro de **dubious ownership** quando o clone foi criado por outro usuário.

Verificar o proprietário do diretório:

```bash
ls -ld /opt/product_lab
```

### Resultado esperado

Saída semelhante a:

```text
drwxr-xr-x. ... productlab productlab ... /opt/product_lab
```

Atualizar usando o usuário correto:

```bash
sudo -u productlab git -C /opt/product_lab status
sudo -u productlab git -C /opt/product_lab pull
```

### Resultado esperado

O `git status` deve funcionar sem erro e o `git pull` deve retornar algo como:

```text
Already up to date.
```

ou trazer novos commits do remoto.

#### Se aparecer erro de dubious ownership

Exemplo do erro:

```text
fatal: detected dubious ownership in repository at '/opt/product_lab'
To add an exception for this directory, call:

        git config --global --add safe.directory /opt/product_lab
```

Isso acontece quando o usuário atual não é o dono esperado do repositório ou quando o clone foi criado com outro usuário.

#### Correção recomendada

Primeiro confirmar e corrigir a posse do diretório para o usuário de execução da aplicação:

```bash
sudo chown -R productlab:productlab /opt/product_lab
```

Depois executar os comandos Git com esse mesmo usuário:

```bash
sudo -u productlab git -C /opt/product_lab status
sudo -u productlab git -C /opt/product_lab pull
```

#### Correção alternativa

Se houver necessidade operacional de usar outro usuário no servidor, adicionar explicitamente o diretório como seguro para esse usuário:

```bash
git config --global --add safe.directory /opt/product_lab
```

> Usar essa alternativa apenas se realmente fizer sentido operar o repositório com outro usuário.  
> Para este tutorial, a prática preferencial continua sendo: **clone, pull e manutenção Git com o usuário `productlab`**.

Se `git status` ou `git pull` retornarem erro como:

```text
fatal: not a git repository (or any of the parent directories): .git
```

isso significa que o código ainda **não foi restaurado corretamente do GitHub** nesse diretório.  
Nesse caso, voltar ao passo **12.4 Restaurar o código do GitHub no servidor de produção** e executar o `git clone`.

---

## 13. Configurar backend Python

### 13.1 Criar ambiente virtual

Criar o ambiente virtual **somente depois do clone** e **dentro da pasta do backend**:

```bash
sudo -u productlab python3 -m venv /opt/product_lab/backend/.venv
```

Alternativa equivalente:

```bash
sudo -u productlab bash -lc "cd /opt/product_lab/backend && python3 -m venv .venv"
```

> Não criar o venv na raiz `/opt/product_lab/.venv`.
> O local correto para este projeto é:
>
> ```text
> /opt/product_lab/backend/.venv
> ```

### 13.2 Instalar dependências

```bash
sudo -u productlab /opt/product_lab/backend/.venv/bin/pip install --upgrade pip
sudo -u productlab /opt/product_lab/backend/.venv/bin/pip install -r /opt/product_lab/backend/requirements.txt
```

### Resultado esperado

```text
Successfully installed fastapi uvicorn sqlalchemy ...
```

---

## 14. Configurar variáveis de ambiente do backend

Criar o arquivo:

```bash
sudo -u productlab cp /opt/product_lab/backend/env.example /opt/product_lab/backend/.env
sudo -u productlab vim /opt/product_lab/backend/.env
```

Ao abrir o arquivo copiado de `env.example`, ele virá com valores de exemplo.  
Para produção, **alterar exatamente os campos abaixo**.

### 14.1 Campos que devem ser alterados no `.env`

#### `DATABASE_URL`

Se a senha do PostgreSQL criada para o usuário `productlab` for:

```text
prdctmngr@2026
```

então o caractere `@` deve ser codificado como `%40` dentro da URL.  
Portanto, a linha correta deve ficar:

```dotenv
DATABASE_URL=postgresql://productlab:prdctmngr%402026@localhost:5432/product_lab
```

> Se no banco a senha real for outra, usar a senha real correspondente nessa URL.

#### `SECRET_KEY`

Trocar esta linha de exemplo:

```dotenv
SECRET_KEY=troque-por-uma-chave-secreta-aleatoria-de-64-chars
```

por uma chave real gerada no servidor.

Gerar com:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Exemplo de resultado:

```text
6b7b9d0d6f3a0d7a5b5d9e0a9d31a4a2b97f9d7d0e9a6c7b5f4a3d2c1b0e8f7
```

Depois substituir no `.env`, por exemplo:

```dotenv
SECRET_KEY=6b7b9d0d6f3a0d7a5b5d9e0a9d31a4a2b97f9d7d0e9a6c7b5f4a3d2c1b0e8f7
```

#### `ALLOWED_ORIGINS`

Trocar a linha de exemplo que inclui `localhost` e domínio fictício por apenas o domínio HTTPS real de produção.

Exemplo:

```dotenv
ALLOWED_ORIGINS=https://seu-dominio.com
```

Se também quiser aceitar `www`:

```dotenv
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
```

> Em produção, não é recomendável manter `http://localhost:5173` e `http://localhost:3000`, a menos que exista uma necessidade operacional específica.

#### `OPENAI_API_KEY`

Se a funcionalidade com OpenAI for usada em produção, preencher com a chave real:

```dotenv
OPENAI_API_KEY=sk-sua-chave-real
```

Se não for usar agora, deixar vazio:

```dotenv
OPENAI_API_KEY=
```

### 14.2 Campos que podem permanecer como estão

Se o ambiente seguir o padrão deste tutorial, estes campos podem permanecer assim:

```dotenv
APP_ENV=production
DEBUG=false
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
OPENAI_MODEL=gpt-4o-mini
```

### 14.3 Exemplo de como o `.env` deve ficar em produção

```dotenv
DATABASE_URL=postgresql://productlab:prdctmngr%402026@localhost:5432/product_lab
APP_ENV=production
DEBUG=false
SECRET_KEY=COLE_AQUI_A_CHAVE_GERADA_NO_SERVIDOR
ALLOWED_ORIGINS=https://seu-dominio.com
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

> Observações:
>
> - `SECRET_KEY` é obrigatória.
> - `DATABASE_URL` é obrigatória.
> - `ALLOWED_ORIGINS` deve conter o domínio HTTPS final.
> - `OPENAI_API_KEY` é opcional. Só é necessária para recursos que usam OpenAI.
> - Se a senha do PostgreSQL contiver `@`, usar `%40` dentro da `DATABASE_URL`.

---

## 15. Estrutura do banco do Product Lab

O backend aplica parte das migrações automaticamente no startup, mas o banco precisa ter a estrutura base disponível.

### Ordem recomendada

1. aplicar DDL principal
2. aplicar DDLs incrementais
3. aplicar DML/seed opcional
4. iniciar backend para executar migrações complementares do próprio app

### 15.1 Aplicar DDL principal

```bash
export PGPASSWORD='prdctmngr@2026'
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/product_lab_ddl.sql
```

### Resultado esperado

Saídas do tipo:

```text
CREATE TABLE
CREATE INDEX
ALTER TABLE
```

### 15.2 Aplicar DDLs incrementais

Executar em sequência:

```bash
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/003_research_templates.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/004_research_questions_t5_t9.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/005_research_questions_t10_t14.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/006_research_questions_t15_t18.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/007_integration_connections.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/007b_webhook_method_fix.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/007c_webhook_missing_fields.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/008_research_followups.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/009_research_session_status.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/010_meetings.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/011_attachments.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/012_raci.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/013_followups_universal.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/014_raci_approval.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/015_raci_soft_delete_history.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/016_requirement_change_management.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/017_business_domains.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/018_discovery_business_case_project_charter.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/019_openai_field_schemas.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/ddl/020_research_answers_session_questions.sql
```

### Resultado esperado

Para cada arquivo:

```text
CREATE TABLE
ALTER TABLE
INSERT 0 n
CREATE INDEX
```

### 15.3 Seed opcional

```bash
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/dml/001_seed_initial_knowledge.sql
```

Opcionalmente:

```bash
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/dml/002_cisco_lci_business_domain.sql
psql -h localhost -U productlab -d product_lab -f /opt/product_lab/database/dml/003_cisco_lci_rules_rewrite.sql
```

### Resultado esperado

```text
INSERT 0 n
```

---

## 16. Testar backend manualmente

Executar o backend uma vez antes de criar o serviço:

```bash
sudo -u productlab bash -lc "cd /opt/product_lab/backend && ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000"
```

### Resultado esperado

Saída semelhante a:

```text
INFO:     Started server process [...]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Em outro terminal, testar:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

### Resultado esperado

JSON semelhante a:

```json
{
  "application": "Product Lab API",
  "version": "1.0.0",
  "status": "running",
  "env": "production",
  "database": "connected",
  "_code_version": "v2-direct-jsonresponse"
}
```

Se funcionou, interromper com `Ctrl+C`.

---

## 17. Criar serviço systemd do backend

Criar o arquivo:

```bash
sudo vim /etc/systemd/system/productlab-backend.service
```

Conteúdo:

```ini
[Unit]
Description=Product Lab Backend (FastAPI/Uvicorn)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=productlab
Group=productlab
WorkingDirectory=/opt/product_lab/backend
Environment=ENV_FILE=/opt/product_lab/backend/.env
ExecStart=/opt/product_lab/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Ativar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now productlab-backend
```

Verificação:

```bash
systemctl status productlab-backend --no-pager
```

### Resultado esperado

```text
Active: active (running)
```

Teste:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

### Resultado esperado

Mesmo JSON do passo anterior.

---

## 18. Gerar build do frontend

O projeto usa **Vite** e está configurado com:

- base pública: `/productlab/`
- proxy local de desenvolvimento para `/api`

Em produção, vamos servir o build estático com Nginx.

### 18.1 Instalar dependências do frontend

```bash
sudo -u productlab bash -lc "cd /opt/product_lab/frontend && npm install"
```

### Resultado esperado

```text
added ... packages
audited ... packages
```

### 18.2 Build de produção

```bash
sudo -u productlab bash -lc "cd /opt/product_lab/frontend && npm run build"
```

### Resultado esperado

Saída semelhante a:

```text
vite v8.x.x building for production...
✓ built in ...
```

### 18.3 Publicar artefatos estáticos

```bash
sudo mkdir -p /var/www/productlab
sudo rsync -av --delete /opt/product_lab/frontend/dist/ /var/www/productlab/
```

### Resultado esperado

Arquivos como:

```text
index.html
assets/...
favicon.svg
```

> Como a base do Vite está configurada como `/productlab/`, o acesso público esperado será:
>
> - `https://seu-dominio.com/productlab/`

---

## 19. Configuração temporária do Nginx para emissão do certificado

> **Importante**
>
> O bloco abaixo em **HTTP/porta 80** é apenas uma etapa **temporária** para:
>
> - validar o proxy reverso
> - validar o frontend estático
> - permitir a emissão do certificado Let's Encrypt
>
> **Não** deve ser o estado final de produção.  
> O estado final correto será:
>
> - **porta 80** apenas para redirecionar para HTTPS
> - **porta 443** para servir o Product Lab com TLS

Criar arquivo:

```bash
sudo vim /etc/nginx/conf.d/productlab.conf
```

Conteúdo temporário inicial:

```nginx
server {
    listen 80;
    server_name seu-dominio.com localhost 127.0.0.1;

    location = /productlab {
        return 301 /productlab/;
    }

    location = /productlab/ {
        root /var/www;
        index index.html;
        try_files /productlab/index.html =404;
    }

    location /productlab/assets/ {
        root /var/www;
        try_files $uri =404;
    }

    location /productlab/ {
        root /var/www;
        try_files $uri $uri/ /productlab/index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Testar sintaxe:

```bash
sudo nginx -t
```

### Resultado esperado

```text
syntax is ok
test is successful
```

Recarregar:

```bash
sudo systemctl reload nginx
```

### Testes temporários esperados

#### Teste do frontend em HTTP temporário

```bash
curl -I http://seu-dominio.com/productlab/
```

Resultado esperado:

```text
HTTP/1.1 200 OK
```

#### Teste da API via Nginx em HTTP temporário

```bash
curl http://seu-dominio.com/api/v1/health
```

Resultado esperado:

```json
{
  "application": "Product Lab API",
  "status": "running",
  "database": "connected"
}
```

> Se esses testes funcionarem, prosseguir imediatamente para a emissão do certificado no passo seguinte, para então colocar o ambiente em HTTPS.
>
> **Importante sobre SELinux em CentOS**
>
> Depois de publicar os arquivos do frontend em `/var/www/productlab`, pode ser necessário ajustar o contexto SELinux para que o Nginx consiga servir o conteúdo estático corretamente.
>
> Verificar contexto:
>
> ```bash
> ls -lZ /var/www/productlab
> ls -lZ /var/www/productlab/index.html
> ```
>
> Se os arquivos estiverem com contexto `var_t`, ajustar para `httpd_sys_content_t`:
>
> ```bash
> sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/productlab(/.*)?"
> sudo restorecon -Rv /var/www/productlab
> ```
>
> Resultado esperado:
>
> ```text
> Relabeled /var/www/productlab/index.html from ...:var_t:... to ...:httpd_sys_content_t:...
> ```
>
> Verificação final:
>
> ```bash
> ls -lZ /var/www/productlab/index.html
> ```
>
> O esperado é conter:
>
> ```text
> httpd_sys_content_t
> ```
>
> Como o Nginx também fará proxy para o backend local em `127.0.0.1:8000`, habilitar também:
>
> ```bash
> sudo setsebool -P httpd_can_network_connect 1
> ```

---

## 20. Habilitar HTTPS gratuito com Let's Encrypt

Como não existe certificado pago disponível, a recomendação é usar **Let's Encrypt**, que é gratuito.

### 20.1 Instalar Certbot

```bash
sudo dnf install -y certbot python3-certbot-nginx
```

### Resultado esperado

```text
Installed:
  certbot
  python3-certbot-nginx
Complete!
```

### 20.2 Emitir certificado

```bash
sudo certbot --nginx -d seu-dominio.com
```

> **Atenção sobre domínios internos**
>
> Let's Encrypt público normalmente **não emite certificado para hosts internos**, por exemplo:
>
> - `servidor.local`
> - `brcghmdb02.na.didata.local`
>
> Para esses casos, usar uma destas alternativas:
>
> 1. publicar o Product Lab com um **domínio público real**
> 2. usar **certificado corporativo/interno**
> 3. usar uma **CA interna** da empresa
>
> Portanto, o fluxo com Certbot deste tutorial vale para **FQDN público válido**, acessível para validação do Let's Encrypt.
>
> Se o ambiente usar host interno `.local`, o Product Lab pode funcionar normalmente em HTTP ou HTTPS com certificado interno, mas **não** com Let's Encrypt público.

O assistente solicitará:

- e-mail de contato
- aceite dos termos
- opção de redirecionar HTTP para HTTPS

Escolher **redirecionar para HTTPS**.

### Resultado esperado

Saída semelhante a:

```text
Successfully received certificate.
Congratulations! You have successfully enabled HTTPS
```

### 20.3 Testar renovação automática

```bash
sudo certbot renew --dry-run
```

### Resultado esperado

```text
Congratulations, all simulated renewals succeeded
```

---

## 21. Ajustar Nginx final para HTTPS

Após o Certbot, o arquivo tende a ser ajustado automaticamente.  
Esse é o **estado final correto de produção**.

O comportamento esperado é:

- `http://seu-dominio.com` redireciona para HTTPS
- `https://seu-dominio.com/productlab/` serve o frontend
- `https://seu-dominio.com/api/` encaminha para o backend

Exemplo típico final:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    location = /productlab {
        return 301 /productlab/;
    }

    location = /productlab/ {
        root /var/www;
        index index.html;
        try_files /productlab/index.html =404;
    }

    location /productlab/assets/ {
        root /var/www;
        try_files $uri =404;
    }

    location /productlab/ {
        root /var/www;
        try_files $uri $uri/ /productlab/index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Testar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Resultado esperado

```text
syntax is ok
test is successful
```

---

## 22. Testes finais de produção

### 22.1 Backend via HTTPS

```bash
curl https://seu-dominio.com/api/v1/health
```

### Resultado esperado

```json
{
  "application": "Product Lab API",
  "version": "1.0.0",
  "status": "running",
  "env": "production",
  "database": "connected"
}
```

### 22.2 Frontend via HTTPS

Abrir no navegador:

```text
https://seu-dominio.com/productlab/
```

### Resultado esperado

- tela inicial do Product Lab carregando
- assets CSS/JS carregando sem erro 404
- chamadas para `/api/v1/...` retornando normalmente

### 22.3 Certificado TLS

```bash
curl -I https://seu-dominio.com/productlab/
```

### Resultado esperado

```text
HTTP/2 200
server: nginx
```

---

## 23. Comandos úteis de operação

### Ver logs do backend

```bash
journalctl -u productlab-backend -f
```

### Reiniciar backend

```bash
sudo systemctl restart productlab-backend
```

### Reiniciar Nginx

```bash
sudo systemctl restart nginx
```

### Status dos serviços

```bash
systemctl status productlab-backend --no-pager
systemctl status nginx --no-pager
systemctl status postgresql --no-pager
```

### Testar banco

```bash
psql -h localhost -U productlab -d product_lab -c "SELECT 1;"
```

---

## 24. Problemas comuns

### 1. Frontend abre, mas API falha

Verificar:

- se o backend está ativo:
  ```bash
  systemctl status productlab-backend --no-pager
  ```
- se a API local responde:
  ```bash
  curl http://127.0.0.1:8000/api/v1/health
  ```
- se o Nginx está encaminhando `/api/` corretamente

### 2. Erro de CORS

Verificar `ALLOWED_ORIGINS` no arquivo:

- `/opt/product_lab/backend/.env`

Valor recomendado em produção:

```dotenv
ALLOWED_ORIGINS=https://seu-dominio.com
```

Depois reiniciar backend:

```bash
sudo systemctl restart productlab-backend
```

### 3. Erro de conexão com PostgreSQL

Verificar:

```bash
systemctl status postgresql --no-pager
```

Testar manualmente:

```bash
psql -h localhost -U productlab -d product_lab -c "SELECT current_database();"
```

Se aparecer erro como:

```text
FATAL:  Ident authentication failed for user "productlab"
```

isso indica que o `pg_hba.conf` ainda está configurado com `ident` ou `peer` em vez de autenticação por senha.  
Nesse caso:

1. descobrir o arquivo:
   ```bash
   sudo -u postgres psql -c "SHOW hba_file;"
   ```
2. ajustar as entradas locais/host para `scram-sha-256`
3. reiniciar:
   ```bash
   sudo systemctl restart postgresql
   ```

Como solução temporária administrativa, também é possível executar comandos no banco com:

```bash
sudo -u postgres psql -d product_lab
```

### 4. Erro 404 no frontend

Como o Vite está com `base: '/productlab/'`, o endereço correto é:

```text
https://seu-dominio.com/productlab/
```

Não usar `/` como raiz do app, a menos que o build/configuração seja alterado.

### 5. Certificado não emitido

Verificar:

- DNS apontando para o servidor
- portas 80 e 443 liberadas
- Nginx ativo
- domínio acessível publicamente

Se o host for interno, por exemplo `*.local`, lembrar que o Let's Encrypt público não emite certificado para esse tipo de nome. Nesse caso, usar domínio público real ou certificado corporativo/interno.

### 6. Frontend retorna 404 ou 403 no Nginx, mesmo com build pronto

Validar se os arquivos existem:

```bash
ls -la /var/www/productlab
ls -la /var/www/productlab/assets
```

O esperado é conter:

```text
index.html
assets
favicon.svg
icons.svg
```

Validar diretamente no servidor:

```bash
curl -I http://127.0.0.1/productlab/index.html
```

Se isso retornar `200 OK`, o build foi publicado corretamente.

Se `/productlab/index.html` funcionar mas `/productlab/` falhar, revisar o bloco do Nginx para usar o tratamento explícito de:

- `location = /productlab`
- `location = /productlab/`
- `location /productlab/assets/`
- `location /productlab/`

Também validar contexto SELinux:

```bash
ls -lZ /var/www/productlab/index.html
```

O esperado é conter:

```text
httpd_sys_content_t
```

Se estiver como `var_t`, aplicar:

```bash
sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/productlab(/.*)?"
sudo restorecon -Rv /var/www/productlab
```

---

## 25. Resumo executivo

### O que instalar

- `nginx`
- `nodejs`
- `python3`, `python3-pip`, `python3-devel`
- `postgresql18`, `postgresql18-server`, `postgresql18-pgvector`
- `certbot`, `python3-certbot-nginx`
- compiladores e libs auxiliares

### O que **não** é necessário

- **Apache**

### Como expor o Product Lab corretamente

- **não deixar somente em HTTP**
- **usar HTTPS como acesso final oficial**
- manter a **porta 80** apenas para:
  - desafio/acme do Let's Encrypt
  - redirecionamento para `https://`

### Como servir o Product Lab

- **Frontend React/Vite**:
  - build estático com `npm run build`
  - publicar em `/var/www/productlab`
  - acesso em `/productlab/`
- **Backend FastAPI**:
  - rodar com `uvicorn`
  - porta local `127.0.0.1:8000`
  - gerenciado por `systemd`
- **Banco**:
  - PostgreSQL local
- **HTTPS**:
  - Nginx + Let's Encrypt + Certbot

---

## 26. Checklist final

- [ ] Sistema operacional atualizado
- [ ] Nginx instalado e ativo
- [ ] Node.js instalado
- [ ] Python e venv configurados
- [ ] PostgreSQL instalado e ativo
- [ ] Banco `product_lab` criado
- [ ] Usuário `productlab` criado no PostgreSQL
- [ ] Backend configurado com `.env`
- [ ] DDL/DML aplicados
- [ ] Backend respondendo em `127.0.0.1:8000`
- [ ] Serviço `productlab-backend` ativo
- [ ] Frontend buildado e copiado para `/var/www/productlab`
- [ ] Nginx servindo `/productlab/`
- [ ] Nginx encaminhando `/api/`
- [ ] HTTPS emitido com Let's Encrypt
- [ ] `https://seu-dominio.com/productlab/` acessível
- [ ] `https://seu-dominio.com/api/v1/health` retornando `database: connected`
