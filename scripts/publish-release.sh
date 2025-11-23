#!/bin/bash

# Script para publicar una nueva versión del plugin
# Este script crea un tag de Git y un GitHub Release que activa la publicación automática a npm

set -e

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  @jterrats/profiler - Publicación de Release${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Obtener la versión actual de package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✓${NC} Versión actual: ${GREEN}v${VERSION}${NC}"
echo ""

# Verificar que no haya cambios sin commitear
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}✗${NC} Hay cambios sin commitear. Por favor, haz commit de todos los cambios antes de continuar."
    echo ""
    echo "Cambios pendientes:"
    git status -s
    exit 1
fi

echo -e "${GREEN}✓${NC} No hay cambios sin commitear"
echo ""

# Verificar que estamos en main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo -e "${YELLOW}⚠${NC}  No estás en la rama 'main'. Estás en: ${YELLOW}${CURRENT_BRANCH}${NC}"
    read -p "¿Deseas continuar de todas formas? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verificar si el tag ya existe
if git rev-parse "v${VERSION}" >/dev/null 2>&1; then
    echo -e "${RED}✗${NC} El tag v${VERSION} ya existe."
    echo "   Actualiza la versión en package.json antes de continuar."
    exit 1
fi

# Confirmar publicación
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  ¿Listo para publicar v${VERSION}?${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Este script realizará:"
echo "  1. Crear tag v${VERSION}"
echo "  2. Push del tag a GitHub"
echo "  3. Crear un GitHub Release"
echo "  4. GitHub Actions publicará automáticamente a npm con provenance"
echo ""
read -p "¿Continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelado."
    exit 0
fi

echo ""
echo -e "${BLUE}Paso 1: Creando tag v${VERSION}...${NC}"
git tag -a "v${VERSION}" -m "Release v${VERSION}"
echo -e "${GREEN}✓${NC} Tag creado"

echo ""
echo -e "${BLUE}Paso 2: Pushing tag a GitHub...${NC}"
git push origin "v${VERSION}"
echo -e "${GREEN}✓${NC} Tag pushed"

echo ""
echo -e "${BLUE}Paso 3: Creando GitHub Release...${NC}"

# Verificar si gh CLI está instalado
if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗${NC} GitHub CLI (gh) no está instalado."
    echo ""
    echo "Opciones:"
    echo "  1. Instalar: brew install gh"
    echo "  2. Crear el release manualmente en: https://github.com/jterrats/profiler/releases/new"
    echo ""
    echo "Para crear el release manualmente:"
    echo "  - Tag: v${VERSION}"
    echo "  - Title: v${VERSION}"
    echo "  - Description: Ver CHANGELOG.md"
    exit 1
fi

# Obtener notas del CHANGELOG para esta versión
CHANGELOG_NOTES=""
if [[ -f "CHANGELOG.md" ]]; then
    # Extraer las notas entre ## [VERSION] y la siguiente ##
    CHANGELOG_NOTES=$(sed -n "/## \[${VERSION}\]/,/## \[/p" CHANGELOG.md | sed '$d' | tail -n +2)
fi

# Si no hay notas en el CHANGELOG, usar un mensaje genérico
if [[ -z "$CHANGELOG_NOTES" ]]; then
    CHANGELOG_NOTES="Release v${VERSION}

See [CHANGELOG.md](./CHANGELOG.md) for details."
fi

# Crear el release
gh release create "v${VERSION}" \
    --title "v${VERSION}" \
    --notes "$CHANGELOG_NOTES" \
    --verify-tag

echo -e "${GREEN}✓${NC} GitHub Release creado"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Publicación iniciada exitosamente${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "GitHub Actions está publicando el paquete a npm..."
echo ""
echo "Monitorea el progreso en:"
echo "  ${BLUE}https://github.com/jterrats/profiler/actions${NC}"
echo ""
echo "Una vez completado, el paquete estará disponible en:"
echo "  ${BLUE}https://www.npmjs.com/package/@jterrats/profiler${NC}"
echo ""
echo "Para instalar:"
echo "  ${GREEN}sf plugins install @jterrats/profiler@${VERSION}${NC}"
echo ""

