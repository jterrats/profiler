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
 * Type color mapping for HTML badges
 */
const TYPE_COLORS: Record<string, string> = {
  fls: '#0176d3',
  apex: '#04844b',
  flows: '#ff6b35',
  tabs: '#9b59b6',
  recordtype: '#e67e22',
  objectaccess: '#3498db',
  connectedapps: '#1abc9c',
  custompermissions: '#f39c12',
  userpermissions: '#e74c3c',
  visualforce: '#34495e',
  custommetadatatypes: '#16a085',
  externalcredentials: '#8e44ad',
  dataspaces: '#27ae60',
  applications: '#c0392b',
  customsettings: '#7f8c8d',
};

/**
 * Groups permissions by type, including empty requested types
 */
function groupPermissionsByType(
  permissions: ExtractedPermission[],
  requestedTypes: string[]
): Record<string, ExtractedPermission[]> {
  const byType: Record<string, ExtractedPermission[]> = {};

  // Initialize all requested types (even if empty)
  for (const type of requestedTypes) {
    if (!byType[type]) {
      byType[type] = [];
    }
  }

  // Group actual permissions
  for (const perm of permissions) {
    if (!byType[perm.type]) {
      byType[perm.type] = [];
    }
    byType[perm.type].push(perm);
  }

  return byType;
}

/**
 * Generates HTML for type badges
 */
function generateTypeBadgesHtml(byType: Record<string, ExtractedPermission[]>): string[] {
  const html: string[] = [];
  html.push('    <div class="type-summary">');
  html.push('      <strong>Permission Types:</strong>');
  for (const [type, perms] of Object.entries(byType)) {
    const color = TYPE_COLORS[type] || '#666';
    html.push(
      `      <span class="type-badge active" style="background: ${color}; color: white;" data-type="${type}" onclick="filterByType('${type}')">${type.toUpperCase()} (${
        perms.length
      })</span>`
    );
  }
  html.push(
    '      <span class="type-badge active" style="background: #666; color: white;" onclick="filterByType(\'all\')">ALL</span>'
  );
  html.push('    </div>');
  return html;
}

/**
 * Generates HTML for filter controls
 */
function generateFilterControlsHtml(byType: Record<string, ExtractedPermission[]>): string[] {
  const html: string[] = [];
  html.push('    <div class="filter-controls">');
  html.push('      <label>Filter by Type:</label>');
  html.push('      <select id="typeFilter" onchange="filterByType(this.value)">');
  html.push('        <option value="all">All Types</option>');
  for (const type of Object.keys(byType)) {
    html.push(`        <option value="${type}">${type.toUpperCase()} (${byType[type].length})</option>`);
  }
  html.push('      </select>');
  html.push('      <label style="margin-left: 20px;">Rows per page:</label>');
  html.push('      <select id="rowsPerPage" onchange="changeRowsPerPage()">');
  html.push('        <option value="50">50</option>');
  html.push('        <option value="100" selected>100</option>');
  html.push('        <option value="200">200</option>');
  html.push('        <option value="500">500</option>');
  html.push('        <option value="all">All</option>');
  html.push('      </select>');
  html.push('    </div>');
  return html;
}

/**
 * Generates HTML table rows for permissions
 */
function generatePermissionRowsHtml(byType: Record<string, ExtractedPermission[]>, includeDetails: boolean): string[] {
  const html: string[] = [];
  let rowIndex = 0;
  for (const [type, perms] of Object.entries(byType)) {
    for (const perm of perms) {
      const color = TYPE_COLORS[type] || '#666';
      html.push(`        <tr data-type="${type}" data-index="${rowIndex}">`);
      html.push(
        `          <td><span class="badge badge-info" style="background: ${color};">${type.toUpperCase()}</span></td>`
      );
      html.push(`          <td>${perm.name}</td>`);
      html.push(
        `          <td><span class="badge badge-success">${perm.enabled ? '✅ Enabled' : '❌ Disabled'}</span></td>`
      );
      if (includeDetails && perm.metadata) {
        const metadataStr = JSON.stringify(perm.metadata, null, 2).replace(/\n/g, '<br>');
        html.push(`          <td><small>${metadataStr}</small></td>`);
      }
      html.push('        </tr>');
      rowIndex++;
    }
  }
  return html;
}

/**
 * Generates HTML for empty types warning
 */
function generateEmptyTypesWarningHtml(byType: Record<string, ExtractedPermission[]>): string[] {
  const html: string[] = [];
  const emptyTypes: string[] = [];
  for (const [type, perms] of Object.entries(byType)) {
    if (perms.length === 0) {
      emptyTypes.push(type);
    }
  }
  if (emptyTypes.length > 0) {
    html.push(
      '    <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">'
    );
    html.push(
      '      <strong>ℹ️  Note:</strong> The following permission types were requested but no permissions were found:'
    );
    html.push('      <ul style="margin: 10px 0 0 20px;">');
    for (const type of emptyTypes) {
      html.push(
        `        <li><strong>${type.toUpperCase()}</strong>: No permissions found in the profile. This may be normal if the profile has full access or no explicit permissions of this type.</li>`
      );
    }
    html.push('      </ul>');
    html.push('    </div>');
  }
  return html;
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
    '    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }'
  );
  html.push('    h1 { color: #0176d3; }');
  html.push('    h2 { color: #0176d3; margin-top: 30px; border-bottom: 2px solid #0176d3; padding-bottom: 10px; }');
  html.push('    .summary { background: #f3f3f3; padding: 15px; border-radius: 4px; margin: 20px 0; }');
  html.push('    .summary-item { margin: 5px 0; }');
  html.push('    .type-summary { display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; }');
  html.push('    .type-badge { padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; }');
  html.push('    .type-badge.active { opacity: 1; }');
  html.push('    .type-badge.inactive { opacity: 0.5; }');
  html.push('    .filter-controls { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 4px; }');
  html.push('    .filter-controls label { margin-right: 15px; font-weight: bold; }');
  html.push('    .filter-controls select { padding: 5px 10px; border-radius: 4px; border: 1px solid #ddd; }');
  html.push('    table { width: 100%; border-collapse: collapse; margin: 20px 0; }');
  html.push('    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }');
  html.push('    th { background: #0176d3; color: white; position: sticky; top: 0; }');
  html.push('    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }');
  html.push('    .badge-success { background: #04844b; color: white; }');
  html.push('    .badge-info { background: #0176d3; color: white; }');
  html.push('    .permission-section { margin: 30px 0; }');
  html.push('    .permission-section.hidden { display: none; }');
  html.push('    .pagination { margin: 20px 0; text-align: center; }');
  html.push(
    '    .pagination button { padding: 8px 16px; margin: 0 5px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; }'
  );
  html.push('    .pagination button:hover { background: #f0f0f0; }');
  html.push('    .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }');
  html.push('    .pagination-info { margin: 10px 0; color: #666; }');
  html.push('    tr[data-type] { display: table-row; }');
  html.push('    tr[data-type].hidden { display: none; }');
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
  html.push(
    `      <div class="summary-item"><strong>Mode:</strong> ${result.dryRun ? 'Preview (Dry Run)' : 'Migration'}</div>`
  );
  html.push('    </div>');

  // Group permissions by type (including empty requested types)
  const byType = groupPermissionsByType(result.permissions, result.permissionTypes);

  if (result.permissions.length > 0 || Object.keys(byType).length > 0) {
    // Type summary badges
    html.push(...generateTypeBadgesHtml(byType));

    // Filter controls
    html.push(...generateFilterControlsHtml(byType));

    // Table
    html.push('    <table id="permissionsTable">');
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
    html.push('      <tbody id="permissionsBody">');

    html.push(...generatePermissionRowsHtml(byType, options.includeDetails ?? false));

    html.push('      </tbody>');
    html.push('    </table>');

    // Show message for types with 0 permissions
    html.push(...generateEmptyTypesWarningHtml(byType));

    // Pagination
    html.push('    <div class="pagination">');
    html.push('      <div class="pagination-info">');
    html.push(
      `        Showing <span id="showingFrom">1</span>-<span id="showingTo">${Math.min(
        100,
        result.permissions.length
      )}</span> of <span id="totalRows">${result.permissions.length}</span> permissions`
    );
    html.push('      </div>');
    html.push('      <button id="prevBtn" onclick="changePage(-1)">Previous</button>');
    html.push('      <span id="pageInfo">Page 1</span>');
    html.push('      <button id="nextBtn" onclick="changePage(1)">Next</button>');
    html.push('    </div>');

    // JavaScript for filtering and pagination
    html.push('    <script>');
    html.push('      let currentFilter = "all";');
    html.push('      let currentPage = 1;');
    html.push('      let rowsPerPage = 100;');
    html.push('      const totalRows = ' + result.permissions.length + ';');
    html.push('');
    html.push('      function filterByType(type) {');
    html.push('        currentFilter = type;');
    html.push('        currentPage = 1;');
    html.push('        document.getElementById("typeFilter").value = type;');
    html.push('        updateDisplay();');
    html.push('      }');
    html.push('');
    html.push('      function changeRowsPerPage() {');
    html.push(
      '        rowsPerPage = document.getElementById("rowsPerPage").value === "all" ? Infinity : parseInt(document.getElementById("rowsPerPage").value);'
    );
    html.push('        currentPage = 1;');
    html.push('        updateDisplay();');
    html.push('      }');
    html.push('');
    html.push('      function changePage(delta) {');
    html.push('        const maxPage = Math.ceil(getVisibleRowCount() / rowsPerPage);');
    html.push('        currentPage = Math.max(1, Math.min(maxPage, currentPage + delta));');
    html.push('        updateDisplay();');
    html.push('      }');
    html.push('');
    html.push('      function getVisibleRowCount() {');
    html.push('        const rows = document.querySelectorAll("#permissionsBody tr");');
    html.push('        let count = 0;');
    html.push('        rows.forEach(row => {');
    html.push('          if (currentFilter === "all" || row.getAttribute("data-type") === currentFilter) {');
    html.push('            count++;');
    html.push('          }');
    html.push('        });');
    html.push('        return count;');
    html.push('      }');
    html.push('');
    html.push('      function updateDisplay() {');
    html.push('        const rows = document.querySelectorAll("#permissionsBody tr");');
    html.push('        let visibleCount = 0;');
    html.push('        let startIndex = (currentPage - 1) * rowsPerPage;');
    html.push('        let endIndex = startIndex + rowsPerPage;');
    html.push('');
    html.push('        rows.forEach((row, index) => {');
    html.push('          const rowType = row.getAttribute("data-type");');
    html.push('          const matchesFilter = currentFilter === "all" || rowType === currentFilter;');
    html.push('');
    html.push('          if (matchesFilter) {');
    html.push('            if (visibleCount >= startIndex && visibleCount < endIndex) {');
    html.push('              row.style.display = "table-row";');
    html.push('            } else {');
    html.push('              row.style.display = "none";');
    html.push('            }');
    html.push('            visibleCount++;');
    html.push('          } else {');
    html.push('            row.style.display = "none";');
    html.push('          }');
    html.push('        });');
    html.push('');
    html.push('        const maxPage = Math.ceil(visibleCount / rowsPerPage);');
    html.push('        document.getElementById("showingFrom").textContent = visibleCount === 0 ? 0 : startIndex + 1;');
    html.push('        document.getElementById("showingTo").textContent = Math.min(endIndex, visibleCount);');
    html.push('        document.getElementById("totalRows").textContent = visibleCount;');
    html.push('        document.getElementById("pageInfo").textContent = "Page " + currentPage + " of " + maxPage;');
    html.push('        document.getElementById("prevBtn").disabled = currentPage === 1;');
    html.push(
      '        document.getElementById("nextBtn").disabled = currentPage >= maxPage || rowsPerPage === Infinity;'
    );
    html.push('      }');
    html.push('');
    html.push('      // Initialize display');
    html.push('      updateDisplay();');
    html.push('    </script>');
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
