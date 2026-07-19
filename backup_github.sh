#!/usr/bin/env bash

# Uso:
#   ./backup_github.sh           → backup normal (commit + push)
#   ./backup_github.sh v1.2.3    → backup + cria tag v1.2.3 (nova versão)

# Configuração de cores para o terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # Sem cor

# Tag opcional passada como primeiro argumento
NEW_TAG="${1:-}"

# Garante que o script está rodando no diretório correto
REPO_DIR="/opt/product_lab"
cd "$REPO_DIR" || {
    echo -e "${RED}❌ Erro crítico: Não foi possível acessar o diretório $REPO_DIR${NC}"
    exit 1
}

echo -e "${YELLOW}[1/3] Iniciando o backup local do arquivo de configuração (.env)...${NC}"

# 1. Backup do .env (segurança fora do Git)
if [ -f "backend/.env" ]; then
    if cp "backend/.env" "backend/.env.bak"; then
        echo -e "${GREEN}✔ Cópia de segurança 'backend/.env.bak' gerada com sucesso!${NC}"
    else
        echo -e "${RED}❌ Erro: Falha ao copiar o arquivo backend/.env. Verifique as permissões de escrita.${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Erro: Arquivo backend/.env não encontrado. O backup de credenciais foi abortado.${NC}"
    exit 1
fi

echo -e "${YELLOW}[2/3] Adicionando e consolidando alterações no Git...${NC}"

# 2. Adiciona os arquivos modificados
if git add .; then
    # Verifica se há algo novo para commitar de fato (evita erro de commit vazio)
    if git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}⚠ Nenhuma alteração de código detectada desde o último backup.${NC}"
    else
        # Solicita automaticamente o carimbo de data/hora no commit de backup
        BACKUP_DATE=$(date "+%Y-%m-%d %H:%M:%S")
        if git commit -m "Backup automatizado: $BACKUP_DATE"; then
            echo -e "${GREEN}✔ Ponto de restauração criado com sucesso no Git!${NC}"
        else
            echo -e "${RED}❌ Erro: Falha ao executar o comando 'git commit'.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${RED}❌ Erro: Falha ao adicionar os arquivos ao índice do Git (git add).${NC}"
    exit 1
fi

echo -e "${YELLOW}[3/3] Enviando dados para o repositório remoto (GitHub)...${NC}"

# 3. Executa o envio para a nuvem
if git push origin main; then
    echo -e "${GREEN}✔ Push realizado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro crítico: Falha ao enviar os dados para o GitHub (git push).${NC}"
    echo -e "${RED}👉 Verifique sua conexão com a internet, credenciais ou o limite do proxy.${NC}"
    exit 1
fi

# 4. (Opcional) Cria e envia tag de versão
if [ -n "$NEW_TAG" ]; then
    echo -e "\n${CYAN}[VERSÃO] Criando tag '$NEW_TAG'...${NC}"

    # Valida formato da tag (deve começar com v e ter números)
    if [[ ! "$NEW_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+ ]]; then
        echo -e "${RED}⚠ Formato de tag inválido. Use: vMAJOR.MINOR.PATCH (ex: v1.2.0)${NC}"
        exit 1
    fi

    # Cria tag anotada
    if git tag -a "$NEW_TAG" -m "Release $NEW_TAG — $(date '+%Y-%m-%d')"; then
        echo -e "${GREEN}✔ Tag '$NEW_TAG' criada localmente!${NC}"
    else
        echo -e "${RED}❌ Erro ao criar a tag. Ela já pode existir.${NC}"
        exit 1
    fi

    # Envia tag ao GitHub
    if git push origin "$NEW_TAG"; then
        echo -e "${GREEN}✔ Tag '$NEW_TAG' publicada no GitHub!${NC}"
    else
        echo -e "${RED}❌ Erro ao enviar a tag para o GitHub.${NC}"
        exit 1
    fi

    echo -e "\n${CYAN}====================================================${NC}"
    echo -e "${CYAN}�  RELEASE $NEW_TAG PUBLICADO NO GITHUB!${NC}"
    echo -e "${CYAN}====================================================${NC}"
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}🎉 BACKUP CONCLUÍDO E ENVIADO COM SUCESSO AO GITHUB!${NC}"
echo -e "${GREEN}====================================================${NC}"
