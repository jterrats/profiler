#!/bin/bash

# Script de ayuda rápida para publicar @jterrats/profiler
# Este es un wrapper interactivo del proceso de publicación

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Guía de Publicación: @jterrats/profiler${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar si el NPM_TOKEN está configurado en GitHub
echo -e "${YELLOW}PASO 1: Verificar configuración de npm token en GitHub${NC}"
echo ""
echo "1. Ve a: https://github.com/jterrats/profiler/settings/secrets/actions"
echo "2. Verifica que existe el secreto 'NPM_TOKEN'"
echo ""
read -p "¿El secreto NPM_TOKEN está configurado en GitHub? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  Cómo crear y configurar el NPM_TOKEN:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "A. Crear token en npm:"
    echo "   1. Ve a: https://www.npmjs.com/"
    echo "   2. Inicia sesión"
    echo "   3. Haz clic en tu avatar → 'Access Tokens'"
    echo "   4. Click 'Generate New Token' → 'Classic Token'"
    echo "   5. Selecciona tipo: 'Automation'"
    echo "   6. Copia el token generado"
    echo ""
    echo "B. Agregar a GitHub:"
    echo "   1. Ve a: https://github.com/jterrats/profiler/settings/secrets/actions"
    echo "   2. Click 'New repository secret'"
    echo "   3. Name: NPM_TOKEN"
    echo "   4. Value: pega el token"
    echo "   5. Click 'Add secret'"
    echo ""
    echo "C. Ejecuta este script nuevamente"
    echo ""
    exit 0
fi

# Verificar que gh CLI está instalado
echo ""
echo -e "${YELLOW}PASO 2: Verificar GitHub CLI${NC}"
echo ""
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI (gh) no está instalado.${NC}"
    echo ""
    echo "Instalar:"
    echo "  brew install gh"
    echo ""
    echo "Luego autenticar:"
    echo "  gh auth login"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} GitHub CLI instalado"

# Verificar autenticación
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}No estás autenticado en GitHub CLI${NC}"
    echo ""
    echo "Ejecuta:"
    echo "  gh auth login"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} GitHub CLI autenticado"

# Verificar versión actual
VERSION=$(node -p "require('./package.json').version")
echo ""
echo -e "${YELLOW}PASO 3: Versión actual${NC}"
echo ""
echo -e "Versión en package.json: ${GREEN}v${VERSION}${NC}"
echo ""

# Verificar si hay cambios sin commitear
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}Hay cambios sin commitear:${NC}"
    echo ""
    git status -s
    echo ""
    read -p "¿Deseas hacer commit de estos cambios antes de continuar? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        read -p "Mensaje del commit: " COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
        git push
        echo -e "${GREEN}✓${NC} Cambios commiteados y pusheados"
    else
        echo ""
        echo -e "${YELLOW}⚠${NC}  Debes commitear los cambios antes de publicar."
        echo ""
        echo "Ejecuta:"
        echo "  git add ."
        echo "  git commit -m 'chore: prepare release'"
        echo "  git push"
        echo ""
        echo "Luego ejecuta este script nuevamente."
        exit 1
    fi
fi

# Listo para publicar
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Listo para publicar v${VERSION}${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Ejecuta el script de publicación:"
echo ""
echo -e "  ${BLUE}./scripts/publish-release.sh${NC}"
echo ""
echo "Esto hará:"
echo "  1. Crear tag v${VERSION}"
echo "  2. Push del tag a GitHub"
echo "  3. Crear GitHub Release"
echo "  4. GitHub Actions publicará automáticamente a npm"
echo ""
read -p "¿Ejecutar ahora? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    ./scripts/publish-release.sh
else
    echo ""
    echo "Puedes ejecutar manualmente cuando estés listo:"
    echo "  ./scripts/publish-release.sh"
    echo ""
fi
