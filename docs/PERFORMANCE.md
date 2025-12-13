# Performance & Safety Guide

The profiler plugin includes built-in safety guardrails to prevent excessive API usage and protect your Salesforce org. This guide explains the performance flags and warnings you may encounter.

## 🚀 Performance Flags

Override default safety limits when working with large orgs or complex operations.

### Available Flags

```bash
# Increase max profiles per operation (default: 50)
sf profiler retrieve --max-profiles 100

# Increase API calls per minute (default: 100)
sf profiler retrieve --max-api-calls 200

# Increase memory limit in MB (default: 512)
sf profiler retrieve --max-memory 1024

# Increase operation timeout in ms (default: 300000 = 5 min)
sf profiler retrieve --operation-timeout 600000

# Override auto-detected worker count
sf profiler retrieve --concurrent-workers 10

# Show detailed performance metrics
sf profiler retrieve --verbose-performance
```

### Example: Large Org Retrieve

```bash
# Retrieving 80 profiles from a large org
sf profiler retrieve \
  --max-profiles 100 \
  --max-api-calls 200 \
  --operation-timeout 600000 \
  --verbose-performance
```

## ⚠️ Understanding Warnings

### Profile Count Warnings

**WARNING (>20 profiles)**

```
Processing 35 profiles may take significant time and API calls
💡 Consider filtering to specific profiles with --name flag
```

**CRITICAL (>50 profiles)**

```
Too many profiles (75). Maximum allowed: 50
💡 Split into multiple operations or use --max-profiles flag
❌ Cannot continue
```

### API Rate Warnings

**High Concurrency**

```
Using 15 workers (high concurrency)
💡 Salesforce allows max 25 concurrent requests
⚡ Monitor for API throttling
```

**Rate Limit Exceeded**

```
Rate limit exceeded: 105 API calls in the last minute
Please wait before retrying
```

### Memory Warnings

**High Usage (>80%)**

```
Memory usage at 450MB (80% of limit)
💡 Monitor memory usage, may need to reduce batch size
```

**Critical (>100%)**

```
High memory usage: 600MB (threshold: 512MB)
💡 Consider processing fewer items at once
❌ Cannot continue
```

### Circuit Breaker

**Circuit Open**

```
🔴 Circuit breaker OPEN - Too many failures (5)
Waiting 60000ms before retry...
```

**Circuit Recovering**

```
🟡 Circuit breaker HALF_OPEN - Testing recovery...
```

**Circuit Closed**

```
✅ Circuit breaker CLOSED - Service recovered
```

## 🛡️ Salesforce API Limits

The plugin respects Salesforce's API limits, which **scale with your license count**.

**Official Documentation:**

- [API Request Limits](https://help.salesforce.com/s/articleView?id=sf.integrate_api_rate_limiting.htm)
- [API Limits Cheat Sheet](https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta)

**Key Hard Limits (Cannot Override):**

- Max concurrent API requests: **25**
- API timeout: **120 seconds**
- Max retrieve size: **39 MB** (uncompressed)

**Daily API Limits (Scale with Licenses):**

- Developer/Sandbox: **15,000/day** (fixed)
- Enterprise: **1,000 per license/day**
- Unlimited: **5,000 per license/day**

💡 Check your org's current API usage: Setup → System Overview → API Usage

## 🚨 Troubleshooting

### "Rate limit exceeded"

**Cause:** Too many API calls in a short time.

**Solutions:**

1. Wait 60 seconds and retry
2. Reduce `--max-api-calls` value
3. Use `--exclude-managed` to reduce metadata retrieved
4. Process fewer profiles at once

### "Circuit breaker is OPEN"

**Cause:** Too many consecutive failures (5+) calling Salesforce API.

**Solutions:**

1. Wait 60 seconds for automatic recovery
2. Check org connectivity: `sf org display --target-org YOUR_ORG`
3. Verify permissions: `sf org display user --target-org YOUR_ORG`
4. Check Salesforce status: https://status.salesforce.com

### "Too many profiles"

**Cause:** Trying to process more than 50 profiles at once.

**Solutions:**

1. Split into multiple operations
2. Use `--name` flag to filter specific profiles
3. Use `--max-profiles` flag to override limit (if appropriate)

### "Operation timeout"

**Cause:** Operation took longer than 5 minutes.

**Solutions:**

1. Increase timeout: `--operation-timeout 600000` (10 min)
2. Process fewer profiles
3. Use `--exclude-managed` to reduce metadata
4. Check org performance (Salesforce status)

## 💡 Best Practices

### ✅ Do's

- **Use caching**: Operations automatically cache metadata for 5 minutes
- **Filter profiles**: Use `--name` to retrieve only what you need
- **Exclude managed**: Use `--exclude-managed` to reduce API calls by 50-80%
- **Monitor warnings**: Adjust your approach when warnings appear
- **Check API usage**: Monitor your org's API consumption regularly

### ❌ Don'ts

- **Don't ignore warnings**: They prevent hitting hard Salesforce limits
- **Don't run multiple operations simultaneously**: Share the same API limits
- **Don't set `--max-api-calls` higher than your org allows**: Check your license type
- **Don't override `--concurrent-workers` above 10**: Risk hitting Salesforce's 25 concurrent limit
- **Don't bypass guardrails unnecessarily**: They exist to protect your org

### Production Orgs

For production orgs, be extra conservative:

```bash
# Safe production retrieve
sf profiler retrieve \
  --exclude-managed \
  --name "Sales Profile,Support Profile" \
  --verbose-performance
```

### Large Development Orgs

For dev orgs with many profiles:

```bash
# Large dev org retrieve
sf profiler retrieve \
  --max-profiles 80 \
  --max-api-calls 150 \
  --operation-timeout 600000 \
  --exclude-managed
```

## 📊 Performance Metrics

Use `--verbose-performance` to see detailed metrics:

```
📊 Performance Summary:
   Total Time: 45.2s
   API Calls: 87 (1.9/s)
   Operations:
      - listMetadata: 42x (avg: 850ms)
      - retrieve: 1x (avg: 12500ms)

📦 Cache Statistics:
   Hits: 15
   Misses: 3
   Hit Rate: 83.3%
```

## 🔗 Related Documentation

- [Error Catalog](development/ERROR_CATALOG.md) - Complete error reference
- [Development Guide](./DEVELOPMENT.md) - Contributing guidelines
- [Salesforce API Docs](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/)
