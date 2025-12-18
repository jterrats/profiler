# Cache Scenarios - Issue #3

## Escenarios que cubre el Metadata Cache

### 1. **Cache Hit (Happy Path)**
- **Cuando**: Cache existe, válido y no expirado
- **Comportamiento**: Retornar datos del cache sin API call
- **Resultado**: 5s más rápido (evita `listMetadata` API call)
- **Archivo**: `~/.sf/profiler-cache/{orgId}-{metadataType}-{apiVersion}.json`

### 2. **Cache Miss (Happy Path)**
- **Cuando**: Cache no existe o expirado
- **Comportamiento**: Hacer API call, guardar resultado en cache
- **Resultado**: Primera llamada normal, siguientes más rápidas
- **TTL**: 1 hora por defecto (configurable)

### 3. **Cache Corrupted (Error Recovery)**
- **Cuando**: Archivo existe pero JSON inválido
- **Comportamiento**:
  - Lanzar `CacheCorruptedError` (recoverable)
  - Auto-delete archivo corrupto
  - Fetch fresh desde API
  - Guardar nuevo resultado
- **Resultado**: Operación continúa sin cache, luego funciona normal
- **No fatal**: Operación no falla

### 4. **Cache Write Error (Error Recovery)**
- **Cuando**: No se puede escribir cache (permisos, disco lleno temporal)
- **Comportamiento**:
  - Lanzar `CacheWriteError` (recoverable)
  - Log warning
  - Continuar sin cache (operación funciona, solo más lenta)
- **Resultado**: Operación exitosa pero sin cache
- **No fatal**: Operación no falla

### 5. **Cache Read Error (Error Recovery)**
- **Cuando**: No se puede leer cache (permisos, archivo bloqueado)
- **Comportamiento**:
  - Lanzar `CacheReadError` (recoverable)
  - Log warning
  - Fetch desde API (fallback)
- **Resultado**: Operación exitosa, datos desde API
- **No fatal**: Operación no falla

### 6. **Cache Disk Full (Error Recovery)**
- **Cuando**: Disco lleno al intentar escribir
- **Comportamiento**:
  - Lanzar `CacheDiskFullError` (recoverable)
  - Limpiar entradas expiradas automáticamente
  - Retry write
  - Si sigue fallando: continuar sin cache
- **Resultado**: Operación exitosa, cache limpio si es posible
- **No fatal**: Operación no falla

### 7. **Cache Expired (Happy Path)**
- **Cuando**: Cache existe pero TTL expirado
- **Comportamiento**: Tratar como cache miss, fetch fresh
- **Resultado**: Datos frescos, cache actualizado
- **TTL Check**: En cada `get()`

### 8. **Multiple Orgs (Happy Path)**
- **Cuando**: Usuario trabaja con múltiples orgs
- **Comportamiento**: Cache separado por `orgId`
- **Archivo**: `{orgId}-{metadataType}-{apiVersion}.json`
- **Resultado**: Cache independiente por org

### 9. **Multiple Metadata Types (Happy Path)**
- **Cuando**: Cache para diferentes tipos (Profile, ApexClass, etc.)
- **Comportamiento**: Cache separado por `metadataType`
- **Archivo**: `{orgId}-Profile-{apiVersion}.json`, `{orgId}-ApexClass-{apiVersion}.json`
- **Resultado**: Cache granular por tipo

### 10. **API Version Changes (Happy Path)**
- **Cuando**: Usuario cambia API version
- **Comportamiento**: Cache separado por `apiVersion`
- **Archivo**: `{orgId}-{metadataType}-60.0.json`, `{orgId}-{metadataType}-61.0.json`
- **Resultado**: Cache correcto por versión

## Estrategias de Recuperación (Graceful Degradation)

**Principio**: **NUNCA fallar la operación por problemas de cache**

1. **CacheCorruptedError**: Auto-delete → Fetch fresh
2. **CacheWriteError**: Log warning → Continue without cache
3. **CacheReadError**: Log warning → Fetch from API
4. **CacheDiskFullError**: Clear old entries → Retry → Continue without cache if still fails

## Datos que se Cachean

- **Tipo**: Resultados de `connection.metadata.list({ type: metadataType })`
- **Formato**: Array de strings (nombres de miembros)
- **Ejemplo**: `["Admin", "Standard User", "Custom Profile"]`
- **Clave**: `{orgId}:{metadataType}:{apiVersion}`

## Estructura del Cache File

```json
{
  "data": ["Admin", "Standard User"],
  "timestamp": 1703123456789,
  "ttl": 3600000,
  "orgId": "00D1234567890ABC",
  "metadataType": "Profile",
  "apiVersion": "60.0"
}
```

## Flags de Control

- `--no-cache`: Bypass cache completamente
- `--clear-cache`: Limpiar todo el cache antes de operación
- `--cache-ttl`: Configurar TTL personalizado (default: 1 hora)


