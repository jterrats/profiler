# Cache Design Decision - Default Behavior

## Pregunta
¿Debería el cache estar habilitado por defecto o requerir un flag explícito para activarlo?

## Decisión: Cache Habilitado por Defecto ✅

### Razones

1. **Mejor Rendimiento por Defecto**
   - Mejora de 5s en operaciones repetidas (Issue #3)
   - Los usuarios obtienen mejor rendimiento sin configuración adicional
   - Primera llamada: normal, siguientes: más rápidas

2. **Consistencia con Herramientas CLI Modernas**
   - `npm`, `yarn`: Cache habilitado por defecto
   - `git`: Cache habilitado por defecto
   - `sfdx`: Cache habilitado por defecto
   - Los usuarios esperan este comportamiento

3. **Graceful Degradation**
   - Si el cache falla, la operación continúa normalmente
   - No hay riesgo de romper operaciones por problemas de cache
   - Los errores de cache son no-fatal

4. **UX Superior**
   - Los usuarios no necesitan recordar activar el cache
   - Funciona "out of the box"
   - Solo necesitan `--no-cache` cuando quieren datos frescos

### Comportamiento Actual

```bash
# Cache habilitado automáticamente (default)
sf profiler retrieve --target-org myOrg --name Admin

# Deshabilitar cache explícitamente
sf profiler retrieve --target-org myOrg --name Admin --no-cache

# Limpiar cache antes de operación
sf profiler retrieve --target-org myOrg --name Admin --clear-cache
```

### Alternativa Considerada: Cache Deshabilitado por Defecto

**Pros:**
- Más conservador
- Los usuarios siempre obtienen datos frescos
- Más explícito sobre qué está pasando

**Contras:**
- Peor rendimiento por defecto
- Los usuarios deben recordar usar `--use-cache`
- Inconsistente con otras herramientas CLI
- No aprovecha la mejora de rendimiento automáticamente

### Conclusión

**Cache habilitado por defecto** es la mejor opción porque:
1. Mejora el rendimiento automáticamente
2. Es consistente con herramientas CLI modernas
3. Tiene graceful degradation (no rompe operaciones)
4. Mejor UX (funciona sin configuración)

Los usuarios que necesitan datos frescos pueden usar `--no-cache` cuando lo requieran.


