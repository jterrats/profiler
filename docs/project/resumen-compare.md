# ✅ Comando Compare - Completado

## Resumen Ejecutivo

Se ha creado exitosamente el comando `sf profiler compare` que permite comparar perfiles locales con las versiones en Salesforce.

## 📦 Archivos Creados

### 1. Código Principal
- ✅ `src/commands/profiler/compare.ts` - Implementación completa del comando

### 2. Mensajes
- ✅ `messages/profiler.compare.md` - Mensajes de i18n

### 3. Tests
- ✅ `test/commands/profiler/compare.test.ts` - Tests unitarios (4 tests, todos pasan ✓)
- ✅ `test/commands/profiler/compare.nut.ts` - Tests de integración

### 4. Documentación
- ✅ `COMPARE_COMMAND.md` - Documentación completa del comando
- ✅ `README.md` - Actualizado con el nuevo comando
- ✅ `QUICK_START.md` - Actualizado con ejemplos
- ✅ `.gitignore` - Actualizado para ignorar `temp-compare/`

## 🎯 Funcionalidades del Comando

### Uso Básico

```bash
# Comparar un perfil específico
sf profiler compare --target-org myOrg --name "Admin"

# Comparar todos los perfiles
sf profiler compare --target-org myOrg

# Con versión de API específica
sf profiler compare --target-org myOrg --name "Sales" --api-version 60.0

# Salida JSON
sf profiler compare --target-org myOrg --json
```

### Flags Disponibles

| Flag | Alias | Descripción |
|------|-------|-------------|
| `--target-org` | | **(Requerido)** Org a comparar |
| `--name` | `-n` | Nombre del perfil específico |
| `--api-version` | | Versión de API a usar |
| `--json` | | Formato JSON de salida |

## 🔍 Cómo Funciona

1. **Lee el perfil local** desde `force-app/main/default/profiles/`
2. **Recupera el perfil del org** usando Metadata API (en directorio temporal)
3. **Compara línea por línea** ambos archivos
4. **Clasifica las diferencias** en tres tipos:
   - ➕ **Added** (en el org, no en local)
   - ➖ **Removed** (en local, no en org)
   - 🔄 **Changed** (existe en ambos pero con diferente contenido)
5. **Muestra el resultado** organizado por tipo
6. **Limpia archivos temporales** automáticamente

## 📊 Ejemplo de Salida

```
================================================================================
Profile: Admin
================================================================================
✗ Differences found for profile: Admin
Total differences: 15

+ Added (in org, not in local):
  Line 45: <userPermissions><enabled>true</enabled><name>ViewSetup</name></userPermissions>
  Line 67: <applicationVisibilities>...</applicationVisibilities>

- Removed (in local, not in org):
  Line 23: <userPermissions><enabled>false</enabled><name>OldPermission</name></userPermissions>

~ Changed:
  Line 102:
    Local:  <enabled>false</enabled>
    Org:    <enabled>true</enabled>

Total profiles compared: 3
Profiles with differences: 1
Profile comparison completed successfully!
```

## 💡 Casos de Uso

### 1. Pre-Commit
```bash
# Antes de hacer commit
sf profiler compare --target-org dev-sandbox
# Revisar diferencias
git add force-app/main/default/profiles/
git commit -m "Update profiles"
```

### 2. Detección de Drift
```bash
# Verificar si el org ha cambiado
sf profiler compare --target-org production --name "Admin"
```

### 3. CI/CD
```bash
# En pipeline
RESULT=$(sf profiler compare --target-org qa-org --json)
DIFFS=$(echo $RESULT | jq '.result.profilesWithDifferences')
if [ "$DIFFS" -gt 0 ]; then
  echo "⚠️ Differences detected!"
fi
```

### 4. Auditoría
```bash
# Comparar perfiles críticos
sf profiler compare --target-org production --name "System Administrator"
```

## 🚀 Optimizaciones Implementadas

1. ✅ **Comparación Paralela** - Múltiples perfiles se comparan en paralelo
2. ✅ **Métodos Estáticos** - Funciones de utilidad optimizadas
3. ✅ **Limpieza Automática** - Archivos temporales se eliminan siempre
4. ✅ **Manejo de Errores** - Errores claros y descriptivos

## 📝 Respuesta a tu Pregunta sobre el Checkout

### ¿Cómo funciona el checkout?

En el comando `retrieve`, el checkout **NO** usa archivos temporales para profiles. Funciona así:

```typescript
// 1. Retrieve va DIRECTAMENTE a force-app/
sf project retrieve start --manifest package.xml
// Esto actualiza: force-app/main/default/profiles/
//                  force-app/main/default/classes/
//                  force-app/main/default/objects/
//                  ... etc

// 2. DESPUÉS del retrieve, hace git checkout para RESTAURAR
git checkout -- force-app/main/default/classes/
git checkout -- force-app/main/default/objects/
// ... etc (todo EXCEPTO profiles)

// 3. RESULTADO: Solo los PROFILES quedan con cambios del org
```

**¿Por qué?** Porque solo queremos actualizar los profiles, no el resto del metadata.

### Flujo Visual

```
Antes del retrieve:
force-app/
  ├── profiles/ (versión local antigua)
  ├── classes/ (versión local)
  └── objects/ (versión local)

Después del retrieve:
force-app/
  ├── profiles/ (versión del org ✓)
  ├── classes/ (versión del org - NO QUEREMOS)
  └── objects/ (versión del org - NO QUEREMOS)

Después del git checkout:
force-app/
  ├── profiles/ (versión del org ✓✓✓)
  ├── classes/ (versión local restaurada ✓)
  └── objects/ (versión local restaurada ✓)
```

## 🆚 Diferencia entre Retrieve y Compare

### Retrieve
- **Descarga** metadata del org al proyecto local
- **Modifica** archivos locales
- **Restaura** metadata no deseado con git checkout
- **Uso**: Sincronizar perfiles desde el org

### Compare
- **No modifica** archivos locales
- **Descarga** a directorio temporal (`temp-compare/`)
- **Compara** línea por línea
- **Limpia** archivos temporales al final
- **Uso**: Ver diferencias sin modificar nada

## ✅ Estado del Proyecto

- ✅ Compilación exitosa
- ✅ Tests pasando (4/4)
- ✅ Linting sin errores
- ✅ Documentación completa
- ✅ Listo para usar

## 🎯 Próximos Pasos Sugeridos

1. **Probar el comando**:
   ```bash
   sf plugins link .
   sf profiler compare --target-org tu-org --name "Admin"
   ```

2. **Probar retrieve también**:
   ```bash
   sf profiler retrieve --target-org tu-org
   ```

3. **Ver el flujo completo**:
   ```bash
   # 1. Comparar
   sf profiler compare --target-org tu-org

   # 2. Si hay diferencias, retrieve
   sf profiler retrieve --target-org tu-org

   # 3. Verificar que ya no hay diferencias
   sf profiler compare --target-org tu-org
   ```

## 📚 Documentación Completa

- `COMPARE_COMMAND.md` - Guía completa del comando compare
- `QUICK_START.md` - Guía rápida actualizada
- `README.md` - Documentación general actualizada
- `PROJECT_SUMMARY.md` - Resumen del proyecto

## 🎉 ¡Listo!

El plugin ahora tiene **2 comandos completos**:
1. ✅ `sf profiler retrieve` - Recuperar perfiles con dependencias
2. ✅ `sf profiler compare` - Comparar perfiles local vs org

Ambos comandos están:
- ✅ Compilados sin errores
- ✅ Con tests pasando
- ✅ Completamente documentados
- ✅ Listos para usar

