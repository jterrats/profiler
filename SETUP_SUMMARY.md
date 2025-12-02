# Setup Summary - Plugin Signature & Branch Protection

## ✅ Completado

### 1. Plugin Signature Documentation
- **Actualizado** `README.md` con sección de instalación mejorada
- **Documentadas** las 3 opciones para evitar el prompt:
  - Opción 1: Aceptar prompt manualmente
  - Opción 2: Usar flag `--force`
  - Opción 3: Trust permanente con `sf plugins trust allow`

### 2. Branch Protection Setup
- **Creado** `.github/BRANCH_PROTECTION.md` con documentación completa
- **Creado** `scripts/setup-branch-protection.sh` script automatizado
- **Configurado** script como ejecutable

---

## 🚀 Próximos Pasos

### Paso 1: Revisar Cambios en README

El README ahora incluye una nota prominente sobre la instalación:

```bash
# Opción recomendada
sf plugins trust allow @jterrats/profiler
sf plugins install @jterrats/profiler
```

### Paso 2: Configurar Branch Protection (IMPORTANTE)

Tienes **2 opciones**:

#### Opción A: Script Automatizado (Recomendado) 🚀

```bash
# 1. Instalar GitHub CLI si no lo tienes
brew install gh  # macOS
# o ver: https://cli.github.com/

# 2. Ejecutar script
./scripts/setup-branch-protection.sh

# El script te pedirá confirmación antes de aplicar los cambios
```

#### Opción B: Configuración Manual via Web UI 🖱️

1. Ve a: https://github.com/jterrats/profiler/settings/branches
2. Click **"Add rule"** (o edita la regla existente para `main`)
3. Configurar:
   - ☑ Branch name pattern: `main`
   - ☑ Require a pull request before merging
     - ☑ Require approvals: **1**
     - ☑ Dismiss stale pull request approvals
   - ☑ Require status checks to pass before merging
     - ☑ Require branches to be up to date
     - Status checks: `Test Plugin on Push`
   - ☑ Require linear history
   - ☑ Restrict who can push to matching branches
     - Add: `jterrats` y cualquier otro usuario autorizado
   - ☑ Include administrators
   - ☑ Do not allow bypassing the above settings
4. Click **"Create"** o **"Save changes"**

### Paso 3: Verificar Protección

Después de configurar, prueba:

```bash
# Test 1: Intentar push directo (debe fallar)
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test"
git push origin main
# ❌ Debería rechazar el push

# Cleanup
git reset --hard HEAD~1
git push origin main --force  # Este también debería fallar
```

### Paso 4: Commit y Push Cambios

```bash
# Crear branch para estos cambios
git checkout -b docs/plugin-signature-and-protection

# Add changes
git add README.md
git add .github/BRANCH_PROTECTION.md
git add scripts/setup-branch-protection.sh
git add SETUP_SUMMARY.md

# Commit
git commit -m "docs: add plugin signature info and branch protection setup

- Updated README with unsigned plugin installation options
- Added branch protection documentation
- Added automated setup script for branch protection
- Documented both manual and automated setup methods"

# Push
git push origin docs/plugin-signature-and-protection

# Crear PR
gh pr create --title "docs: Plugin signature info and branch protection" \
  --body "This PR adds documentation for plugin signature handling and sets up branch protection for main."
```

---

## 📊 Resultados Esperados

### Plugin Signature
✅ Los usuarios sabrán que verán un prompt
✅ Los usuarios tendrán 3 opciones claras
✅ La documentación reduce fricción de instalación

### Branch Protection
✅ Solo tú (y usuarios autorizados) pueden push a `main`
✅ Todos los demás deben crear PRs
✅ PRs requieren 1 aprobación antes de merge
✅ Tests deben pasar antes de merge
✅ No se permiten force pushes ni delete del branch

---

## 🔐 Usuarios Autorizados Actuales

**Branch `main` protegido para:**
- ✅ `jterrats` (owner)

**Para agregar más usuarios:**

1. Editar `scripts/setup-branch-protection.sh`:
   ```bash
   AUTHORIZED_USERS=("jterrats" "otro_usuario")
   ```

2. Re-ejecutar el script

O editar manualmente en GitHub UI.

---

## 📚 Documentación Adicional

- **Branch Protection**: `.github/BRANCH_PROTECTION.md`
- **Setup Script**: `scripts/setup-branch-protection.sh`
- **GitHub Settings**: https://github.com/jterrats/profiler/settings/branches

---

## ⚠️ Notas Importantes

1. **Firma Oficial de Salesforce**: Si en el futuro quieres eliminar completamente el prompt, deberás aplicar al [Salesforce CLI Plugin Program](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_partner_program.htm)

2. **Branch Protection**: Una vez configurado, incluso tú necesitarás crear PRs para cambios en `main` (a menos que seas el único usuario autorizado y desactives temporalmente "Include administrators")

3. **Emergency Override**: Si necesitas hacer cambios de emergencia, ver `.github/BRANCH_PROTECTION.md` sección "Emergency Override"

---

Last updated: 2024-12-02

