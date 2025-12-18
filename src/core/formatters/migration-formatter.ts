/**
 * Migration Formatter - Output formatting for Profile to Permission Set migration
 *
 * Provides multiple output formats for migration previews:
 * - Table (ASCII): Human-readable terminal output
 * - JSON: Machine-readable structured data
 * - HTML: Web-friendly formatted output
 * - Markdown: Documentation-friendly format
 * - CSV: Excel-compatible format
 * - YAML: Structured data format
 *
 * @author Jaime Terrats
 * @license MIT
 */

import type { MigrateResult, ExtractedPermission } from '../../operations/migrate-operation.js';

/**
 * Format options for migration output
 */
export type MigrationFormatOptions = {
  /** Output format */
  format: 'table' | 'json' | 'html' | 'markdown' | 'csv' | 'yaml';
  /** Include detailed permission metadata */
  includeDetails?: boolean;
};

/**
 * Formatted migration output
 */
export type FormattedMigrationOutput = {
  /** Format type */
  format: string;
  /** Formatted content */
  content: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Format migration preview
 *
 * Main entry point for formatting migration results.
 * Delegates to specific formatters based on format option.
 *
 * @param result - Migration result
 * @param options - Format options
 * @returns Formatted output
 */
export function formatMigrationPreview(
  result: MigrateResult,
  options: MigrationFormatOptions = { format: 'table' }
): FormattedMigrationOutput {
  switch (options.format) {
    case 'json':
      return formatAsJson(result);
    case 'html':
      return formatAsHtml(result, options);
    case 'markdown':
      return formatAsMarkdown(result);
    case 'csv':
      return formatAsCsv(result);
    case 'yaml':
      return formatAsYaml(result);
    case 'table':
    default:
      return formatAsTable(result);
  }
}

/**
 * Format as ASCII table for terminal output
 */
function formatAsTable(result: MigrateResult): FormattedMigrationOutput {
  const lines: string[] = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║      Profile to Permission Set Migration Preview          ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');

  // Summary
  lines.push(`📋 Profile: ${result.profileName}`);
  lines.push(`🎯 Permission Set: ${result.permissionSetName}`);
  if (result.permissionSetExists) {
    lines.push('ℹ️  Permission Set exists: Will merge permissions');
  } else {
    lines.push('✨ Permission Set: Will be created');
  }
  lines.push(`📊 Permissions to Migrate: ${result.permissionsMigrated}`);
  if (result.comparison) {
    lines.push(`   └─ New permissions: ${result.comparison.newCount}`);
    lines.push(`   └─ Existing (skipped): ${result.comparison.existingCount}`);
  }
  lines.push(`🔧 Permission Types: ${result.permissionTypes.join(', ')}`);
  lines.push(`🔍 Mode: ${result.dryRun ? 'Preview (Dry Run)' : 'Migration'}`);
  lines.push('');

  if (result.permissions.length === 0) {
    if (result.comparison && result.comparison.existingCount > 0) {
      lines.push(`⚠️  All permissions already exist in Permission Set (${result.comparison.existingCount} skipped).`);
      lines.push('   No new permissions to migrate.');
    } else {
      lines.push('⚠️  No permissions found to migrate.');
    }
    lines.push('');
    return {
      format: 'table',
      content: lines.join('\n'),
    };
  }

  // Group by type
  const byType: Record<string, ExtractedPermission[]> = {};
  for (const perm of result.permissions) {
    if (!byType[perm.type]) {
      byType[perm.type] = [];
    }
    byType[perm.type].push(perm);
  }

  // Show existing permissions info if available
  if (result.comparison && result.comparison.existingCount > 0) {
    lines.push(
      `ℹ️  Note: ${result.comparison.existingCount} permission(s) already exist in Permission Set and will be skipped.`
    );
    lines.push('');
  }

  // Table header
  lines.push('─'.repeat(80));
  lines.push('Permission Type'.padEnd(20) + 'Permission Name'.padEnd(50) + 'Status');
  lines.push('─'.repeat(80));

  // Permissions by type
  for (const [type, perms] of Object.entries(byType)) {
    const typeLabel = type.toUpperCase().padEnd(20);
    for (const perm of perms) {
      const name = perm.name.padEnd(50);
      const status = perm.enabled ? '✅ Enabled' : '❌ Disabled';
      lines.push(`${typeLabel}${name}${status}`);
    }
  }

  lines.push('─'.repeat(80));
  lines.push('');

  return {
    format: 'table',
    content: lines.join('\n'),
  };
}

/**
 * Format as JSON
 */
function formatAsJson(result: MigrateResult): FormattedMigrationOutput {
  const jsonData = {
    profileName: result.profileName,
    permissionSetName: result.permissionSetName,
    permissionsMigrated: result.permissionsMigrated,
    permissionTypes: result.permissionTypes,
    dryRun: result.dryRun,
    permissionSetExists: result.permissionSetExists,
    comparison: result.comparison
      ? {
          newCount: result.comparison.newCount,
          existingCount: result.comparison.existingCount,
        }
      : undefined,
    permissions: result.permissions.map((p) => ({
      type: p.type,
      name: p.name,
      enabled: p.enabled,
      metadata: p.metadata,
    })),
  };

  return {
    format: 'json',
    content: JSON.stringify(jsonData, null, 2),
    metadata: jsonData,
  };
}

/**
 * Format as HTML
 */
function formatAsHtml(result: MigrateResult, options: MigrationFormatOptions): FormattedMigrationOutput {
  const html: string[] = [];

  html.push('<!DOCTYPE html>');
  html.push('<html lang="en">');
  html.push('<head>');
  html.push('  <meta charset="UTF-8">');
  html.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  html.push(`  <title>Migration Preview: ${result.profileName} → ${result.permissionSetName}</title>`);
  html.push('  <style>');
  html.push('    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }');
  html.push(
    '    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }'
  );
  html.push('    h1 { color: #0176d3; }');
  html.push('    .summary { background: #f3f3f3; padding: 15px; border-radius: 4px; margin: 20px 0; }');
  html.push('    .summary-item { margin: 5px 0; }');
  html.push('    table { width: 100%; border-collapse: collapse; margin: 20px 0; }');
  html.push('    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }');
  html.push('    th { background: #0176d3; color: white; }');
  html.push('    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }');
  html.push('    .badge-success { background: #04844b; color: white; }');
  html.push('    .badge-info { background: #0176d3; color: white; }');
  html.push('  </style>');
  html.push('</head>');
  html.push('<body>');
  html.push('  <div class="container">');
  html.push(`    <h1>📋 Migration Preview: ${result.profileName} → ${result.permissionSetName}</h1>`);

  // Summary
  html.push('    <div class="summary">');
  html.push(`      <div class="summary-item"><strong>Profile:</strong> ${result.profileName}</div>`);
  html.push(`      <div class="summary-item"><strong>Permission Set:</strong> ${result.permissionSetName}</div>`);
  html.push(`      <div class="summary-item"><strong>Permissions:</strong> ${result.permissionsMigrated}</div>`);
  html.push(`      <div class="summary-item"><strong>Types:</strong> ${result.permissionTypes.join(', ')}</div>`);
  html.push(`      <div class="summary-item"><strong>Mode:</strong> ${result.dryRun ? 'Preview (Dry Run)' : 'Migration'}</div>`);
  html.push('    </div>');

  if (result.permissions.length > 0) {
    // Group by type
    const byType: Record<string, ExtractedPermission[]> = {};
    for (const perm of result.permissions) {
      if (!byType[perm.type]) {
        byType[perm.type] = [];
      }
      byType[perm.type].push(perm);
    }

    // Table
    html.push('    <table>');
    html.push('      <thead>');
    html.push('        <tr>');
    html.push('          <th>Permission Type</th>');
    html.push('          <th>Permission Name</th>');
    html.push('          <th>Status</th>');
    if (options.includeDetails) {
      html.push('          <th>Details</th>');
    }
    html.push('        </tr>');
    html.push('      </thead>');
    html.push('      <tbody>');

    for (const [type, perms] of Object.entries(byType)) {
      for (const perm of perms) {
        html.push('        <tr>');
        html.push(`          <td><span class="badge badge-info">${type.toUpperCase()}</span></td>`);
        html.push(`          <td>${perm.name}</td>`);
        html.push(
          `          <td><span class="badge badge-success">${perm.enabled ? '✅ Enabled' : '❌ Disabled'}</span></td>`
        );
        if (options.includeDetails && perm.metadata) {
          html.push(`          <td>${JSON.stringify(perm.metadata)}</td>`);
        }
        html.push('        </tr>');
      }
    }

    html.push('      </tbody>');
    html.push('    </table>');
  } else {
    html.push('    <p>⚠️  No permissions found to migrate.</p>');
  }

  html.push('  </div>');
  html.push('</body>');
  html.push('</html>');

  return {
    format: 'html',
    content: html.join('\n'),
  };
}

/**
 * Format as Markdown
 */
function formatAsMarkdown(result: MigrateResult): FormattedMigrationOutput {
  const lines: string[] = [];

  lines.push(`# Migration Preview: ${result.profileName} → ${result.permissionSetName}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Profile:** ${result.profileName}`);
  lines.push(`- **Permission Set:** ${result.permissionSetName}`);
  lines.push(`- **Permissions:** ${result.permissionsMigrated}`);
  lines.push(`- **Types:** ${result.permissionTypes.join(', ')}`);
  lines.push(`- **Mode:** ${result.dryRun ? 'Preview (Dry Run)' : 'Migration'}`);
  lines.push('');

  if (result.permissions.length === 0) {
    lines.push('⚠️  No permissions found to migrate.');
    lines.push('');
    return {
      format: 'markdown',
      content: lines.join('\n'),
    };
  }

  // Group by type
  const byType: Record<string, ExtractedPermission[]> = {};
  for (const perm of result.permissions) {
    if (!byType[perm.type]) {
      byType[perm.type] = [];
    }
    byType[perm.type].push(perm);
  }

  lines.push('## Permissions');
  lines.push('');
  lines.push('| Type | Permission Name | Status |');
  lines.push('|------|----------------|--------|');

  for (const [type, perms] of Object.entries(byType)) {
    for (const perm of perms) {
      const status = perm.enabled ? '✅ Enabled' : '❌ Disabled';
      lines.push(`| ${type.toUpperCase()} | ${perm.name} | ${status} |`);
    }
  }

  lines.push('');

  return {
    format: 'markdown',
    content: lines.join('\n'),
  };
}

/**
 * Format as CSV
 */
function formatAsCsv(result: MigrateResult): FormattedMigrationOutput {
  const lines: string[] = [];

  // Header
  lines.push('Type,Permission Name,Enabled');

  // Data rows
  for (const perm of result.permissions) {
    lines.push(`${perm.type.toUpperCase()},${perm.name},${perm.enabled ? 'Yes' : 'No'}`);
  }

  return {
    format: 'csv',
    content: lines.join('\n'),
  };
}

/**
 * Format as YAML
 */
function formatAsYaml(result: MigrateResult): FormattedMigrationOutput {
  const lines: string[] = [];

  lines.push(`profileName: ${result.profileName}`);
  lines.push(`permissionSetName: ${result.permissionSetName}`);
  lines.push(`permissionsMigrated: ${result.permissionsMigrated}`);
  lines.push('permissionTypes:');
  for (const type of result.permissionTypes) {
    lines.push(`  - ${type}`);
  }
  lines.push(`dryRun: ${result.dryRun}`);
  lines.push('permissions:');

  for (const perm of result.permissions) {
    lines.push(`  - type: ${perm.type}`);
    lines.push(`    name: ${perm.name}`);
    lines.push(`    enabled: ${perm.enabled}`);
    if (perm.metadata) {
      lines.push(`    metadata: ${JSON.stringify(perm.metadata)}`);
    }
  }

  return {
    format: 'yaml',
    content: lines.join('\n'),
  };
}

/**
 * Export migration preview to a file
 *
 * @param result - Migration result
 * @param filePath - Output file path
 * @param options - Format options
 * @returns Promise<void>
 */
export async function exportMigrationPreview(
  result: MigrateResult,
  filePath: string,
  options: MigrationFormatOptions
): Promise<void> {
  const formatted = formatMigrationPreview(result, options);
  const fs = await import('node:fs/promises');
  await fs.writeFile(filePath, formatted.content, 'utf-8');
}

