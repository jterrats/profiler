# E2E Test Logs

Este directorio contiene los logs y reportes generados por las pruebas E2E.

## Archivos Generados

- **`e2e-test_YYYYMMDD_HHMMSS.log`**: Log detallado de toda la ejecución de pruebas

  - Timestamps en cada línea
  - Salida completa de comandos
  - Información de debugging para tests fallidos
  - Duración de cada test

- **`e2e-report_YYYYMMDD_HHMMSS.txt`**: Reporte resumido de la ejecución
  - Resumen de tests (total, pasados, fallidos)
  - Lista de tests fallidos
  - Referencias a archivos de log

## Uso

Los logs se generan automáticamente cada vez que ejecutas:

```bash
bash scripts/e2e-test.sh
```

## Revisar Logs

Para revisar un log específico:

```bash
# Ver el log más reciente
ls -t test-logs/e2e-test_*.log | head -1 | xargs cat

# Buscar errores en el log más reciente
ls -t test-logs/e2e-test_*.log | head -1 | xargs grep -i "error\|failed\|timeout"

# Ver el reporte más reciente
ls -t test-logs/e2e-report_*.txt | head -1 | xargs cat
```

## Información en los Logs

Cada log incluye:

- **Timestamps**: Cada línea tiene timestamp para debugging
- **Niveles de log**: INFO, SUCCESS, WARNING, ERROR, COMMAND, DURATION, TIMEOUT
- **Salida de comandos**: Captura completa de stdout/stderr
- **Información de debugging**: Para tests fallidos, incluye:
  - Salida completa del comando
  - Estado del filesystem
  - Contenido de directorios
  - Exit codes

## Timeouts

Si un test excede el timeout (120s por defecto), el log incluirá:

- Mensaje de TIMEOUT
- Últimas 500 líneas de salida del comando
- Duración exacta antes del timeout
