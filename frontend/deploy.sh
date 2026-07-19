#!/usr/bin/env bash

# Configuração de cores para o terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sem cor

echo -e "${YELLOW}[1/5] Iniciando o processo de build do React...${NC}"

# Coleta a versão do Git (tag mais próxima ou hash curto)
VITE_APP_VERSION=$(git -C /opt/product_lab describe --tags --always --dirty 2>/dev/null || echo "dev")
export VITE_APP_VERSION
echo -e "    Versão detectada: ${CYAN:-}${VITE_APP_VERSION}${NC:-}"

# 1. Executa a compilação do frontend
if npm run build; then
    echo -e "${GREEN}✔ Build compilado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro: Falha na compilação do TypeScript/Vite. O deploy foi abortado.${NC}"
    exit 1
fi

echo -e "${YELLOW}[2/5] Limpando o diretório de produção do Apache...${NC}"

# 2. Limpa com segurança a pasta antiga (apenas se o build passou)
if sudo rm -rf /var/www/product_lab/*; then
    echo -e "${GREEN}✔ Diretório antigo limpo!${NC}"
else
    echo -e "${RED}❌ Erro: Falha ao limpar a pasta /var/www/product_lab/. Verifique as permissões.${NC}"
    exit 1
fi

echo -e "${YELLOW}[3/5] Copiando novos arquivos para /var/www/product_lab/...${NC}"

# 3. Copia o novo build gerado na pasta dist
if sudo cp -r dist/* /var/www/product_lab/; then
    echo -e "${GREEN}✔ Arquivos copiados com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro: Falha ao copiar os arquivos da pasta 'dist' para a pasta de produção.${NC}"
    exit 1
fi

echo -e "${YELLOW}[4/5] Ajustando permissões para o usuário apache...${NC}"

# 4. Ajusta os privilégios de propriedade
if sudo chown -R apache:apache /var/www/product_lab; then
    echo -e "${GREEN}✔ Permissões atualizadas com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro: Falha ao alterar a propriedade dos arquivos para apache:apache.${NC}"
    exit 1
fi

echo -e "${YELLOW}[5/5] Testando e reiniciando o servidor Apache (httpd)...${NC}"

# 5. Valida as configurações do Apache antes de dar restart
if ! httpd -t &>/dev/null; then
    echo -e "${RED}❌ Erro crítico: O Apache detectou um erro de sintaxe nas configurações gerais. O serviço não foi reiniciado.${NC}"
    exit 1
fi

if sudo systemctl restart httpd; then
    echo -e "${GREEN}✔ Apache reiniciado com sucesso!${NC}"
    echo -e "\n${GREEN}====================================================${NC}"
    echo -e "${GREEN}🎉 DEPLOY CONCLUÍDO COM SUCESSO NO SUB-CAMINHO!${NC}"
    echo -e "${GREEN}====================================================${NC}"
else
    echo -e "${RED}❌ Erro: O build foi copiado, mas o Apache falhou ao reiniciar.${NC}"
    exit 1
fi
