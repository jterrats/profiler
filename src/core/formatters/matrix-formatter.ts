/**
 * Matrix Formatter - Output formatting for multi-source comparison matrices
 *
 * Provides multiple output formats for comparison matrices:
 * - Table (ASCII): Human-readable terminal output
 * - JSON: Machine-readable structured data
 * - HTML: Web-friendly formatted output
 *
 * @author Jaime Terrats
 * @license MIT
 */

import type { MultiSourceCompareResult } from '../../operations/index.js';

/**
 * Format options for matrix output
 */
export type MatrixFormatOptions = {
  /** Output format */
  format: 'table' | 'json' | 'html';
  /** Include profile XML details */
  includeDetails?: boolean;
  /** Compact mode (minimal output) */
  compact?: boolean;
};

/**
 * Formatted matrix output
 */
export type FormattedOutput = {
  /** Format type */
  format: string;
  /** Formatted content */
  content: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Format multi-source comparison results
 *
 * Main entry point for formatting comparison matrices.
 * Delegates to specific formatters based on format option.
 *
 * @param result - Multi-source comparison result
 * @param options - Format options
 * @returns Formatted output
 */
export function formatComparisonMatrix(
  result: MultiSourceCompareResult,
  options: MatrixFormatOptions = { format: 'table' }
): FormattedOutput {
  switch (options.format) {
    case 'json':
      return formatAsJson(result, options);
    case 'html':
      return formatAsHtml(result, options);
    case 'table':
    default:
      return formatAsTable(result, options);
  }
}

/**
 * Format as ASCII table for terminal output
 *
 * Creates a human-readable table showing:
 * - Profile names as rows
 * - Org aliases as columns
 * - Success/failure status in cells
 *
 * @param result - Multi-source comparison result
 * @param options - Format options
 * @returns Formatted table output
 */
function formatAsTable(
  result: MultiSourceCompareResult,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: MatrixFormatOptions
): FormattedOutput {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║      Multi-Source Profile Comparison Matrix                 ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');

  // Summary
  lines.push(`📊 Profiles Compared: ${result.profilesCompared}`);
  lines.push(`🌍 Environments: ${result.orgsInvolved}`);
  lines.push(`✅ Successful: ${result.successfulOrgs.join(', ')}`);

  if (result.failedOrgs.length > 0) {
    lines.push(`❌ Failed: ${result.failedOrgs.map((f) => f.orgAlias).join(', ')}`);
  }

  lines.push('');
  lines.push('─'.repeat(80));
  lines.push('');

  // Matrix for each profile
  for (const matrix of result.matrices) {
    lines.push(`Profile: ${matrix.profileName}`);
    lines.push('');

    // Create table header
    const maxOrgLength = Math.max(...matrix.successfulOrgs.map((org) => org.length), 10);
    const cellWidth = maxOrgLength + 2;

    // Header row
    const headerRow = `  ${'Org'.padEnd(cellWidth)}  Status`;
    lines.push(headerRow);
    lines.push('  ' + '─'.repeat(cellWidth + 10));

    // Data rows - successful orgs
    for (const orgAlias of matrix.successfulOrgs) {
      const status = '✅ Retrieved';
      lines.push(`  ${orgAlias.padEnd(cellWidth)}  ${status}`);
    }

    // Data rows - failed orgs
    for (const failed of matrix.failedOrgs) {
      const status = `❌ ${failed.error.message.substring(0, 40)}`;
      lines.push(`  ${failed.orgAlias.padEnd(cellWidth)}  ${status}`);
    }

    lines.push('');
    lines.push('─'.repeat(80));
    lines.push('');
  }

  // Footer summary
  if (result.allOrgsSucceeded) {
    lines.push('✨ All environments retrieved successfully!');
  } else {
    lines.push(`⚠️  ${result.failedOrgs.length} environment(s) failed - showing partial results`);
  }

  lines.push('');

  return {
    format: 'table',
    content: lines.join('\n'),
    metadata: {
      profilesCompared: result.profilesCompared,
      orgsInvolved: result.orgsInvolved,
      successfulOrgs: result.successfulOrgs,
      failedOrgs: result.failedOrgs.length,
    },
  };
}

/**
 * Format as JSON for machine consumption
 *
 * Returns structured JSON containing:
 * - Complete comparison matrices
 * - Org success/failure status
 * - Profile metadata (if includeDetails is true)
 *
 * @param result - Multi-source comparison result
 * @param options - Format options
 * @returns Formatted JSON output
 */
function formatAsJson(result: MultiSourceCompareResult, options: MatrixFormatOptions): FormattedOutput {
  const jsonData: Record<string, unknown> = {
    status: 'success',
    profilesCompared: result.profilesCompared,
    orgsInvolved: result.orgsInvolved,
    allOrgsSucceeded: result.allOrgsSucceeded,
    successfulOrgs: result.successfulOrgs,
    failedOrgs: result.failedOrgs.map((f) => ({
      orgAlias: f.orgAlias,
      error: f.error.message,
    })),
    matrices: result.matrices.map((matrix) => ({
      profileName: matrix.profileName,
      successfulOrgs: matrix.successfulOrgs,
      failedOrgs: matrix.failedOrgs.map((f) => ({
        orgAlias: f.orgAlias,
        error: f.error.message,
      })),
      orgCount: matrix.successfulOrgs.length,
    })),
  };

  // Include profile details if requested
  if (options.includeDetails) {
    jsonData.profiles = result.matrices.map((matrix) => ({
      profileName: matrix.profileName,
      orgProfiles: Object.fromEntries(Array.from(matrix.orgProfiles.entries()).map(([org, profile]) => [org, profile])),
    }));
  }

  const content = options.compact ? JSON.stringify(jsonData) : JSON.stringify(jsonData, null, 2);

  return {
    format: 'json',
    content,
    metadata: jsonData,
  };
}

/**
 * Format as HTML for web display
 *
 * Creates an HTML table with:
 * - Bootstrap-style formatting
 * - Color-coded success/failure indicators
 * - Expandable profile details
 *
 * @param result - Multi-source comparison result
 * @param options - Format options
 * @returns Formatted HTML output
 */
function formatAsHtml(
  result: MultiSourceCompareResult,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: MatrixFormatOptions
): FormattedOutput {
  const html: string[] = [];

  // HTML header
  html.push('<!DOCTYPE html>');
  html.push('<html lang="en">');
  html.push('<head>');
  html.push('  <meta charset="UTF-8">');
  html.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  html.push('  <title>Multi-Source Profile Comparison</title>');
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
  html.push('    .success { color: #04844b; }');
  html.push('    .failure { color: #c23934; }');
  html.push('    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }');
  html.push('    .badge-success { background: #04844b; color: white; }');
  html.push('    .badge-failure { background: #c23934; color: white; }');
  html.push('  </style>');
  html.push('</head>');
  html.push('<body>');
  html.push('  <div class="container">');
  html.push('    <h1>🌍 Multi-Source Profile Comparison</h1>');

  // Summary section
  html.push('    <div class="summary">');
  html.push(`      <div class="summary-item"><strong>Profiles Compared:</strong> ${result.profilesCompared}</div>`);
  html.push(`      <div class="summary-item"><strong>Environments:</strong> ${result.orgsInvolved}</div>`);
  html.push(
    `      <div class="summary-item"><strong>Successful:</strong> <span class="success">${result.successfulOrgs.join(
      ', '
    )}</span></div>`
  );

  if (result.failedOrgs.length > 0) {
    html.push(
      `      <div class="summary-item"><strong>Failed:</strong> <span class="failure">${result.failedOrgs
        .map((f) => f.orgAlias)
        .join(', ')}</span></div>`
    );
  }

  html.push('    </div>');

  // Matrix tables
  for (const matrix of result.matrices) {
    html.push(`    <h2>Profile: ${matrix.profileName}</h2>`);
    html.push('    <table>');
    html.push('      <thead>');
    html.push('        <tr>');
    html.push('          <th>Environment</th>');
    html.push('          <th>Status</th>');
    html.push('        </tr>');
    html.push('      </thead>');
    html.push('      <tbody>');

    // Successful orgs
    for (const orgAlias of matrix.successfulOrgs) {
      html.push('        <tr>');
      html.push(`          <td>${orgAlias}</td>`);
      html.push('          <td><span class="badge badge-success">✅ Retrieved</span></td>');
      html.push('        </tr>');
    }

    // Failed orgs
    for (const failed of matrix.failedOrgs) {
      html.push('        <tr>');
      html.push(`          <td>${failed.orgAlias}</td>`);
      html.push(`          <td><span class="badge badge-failure">❌ ${failed.error.message}</span></td>`);
      html.push('        </tr>');
    }

    html.push('      </tbody>');
    html.push('    </table>');
  }

  // Footer
  html.push('    <hr>');
  if (result.allOrgsSucceeded) {
    html.push('    <p class="success">✨ All environments retrieved successfully!</p>');
  } else {
    html.push(
      `    <p class="failure">⚠️ ${result.failedOrgs.length} environment(s) failed - showing partial results</p>`
    );
  }

  html.push('  </div>');
  html.push('</body>');
  html.push('</html>');

  return {
    format: 'html',
    content: html.join('\n'),
    metadata: {
      profilesCompared: result.profilesCompared,
      orgsInvolved: result.orgsInvolved,
    },
  };
}

/**
 * Export a comparison matrix to a file
 *
 * Utility function to write formatted output to disk.
 *
 * @param result - Multi-source comparison result
 * @param filePath - Output file path
 * @param options - Format options
 * @returns Promise<void>
 */
export async function exportComparisonMatrix(
  result: MultiSourceCompareResult,
  filePath: string,
  options: MatrixFormatOptions
): Promise<void> {
  const formatted = formatComparisonMatrix(result, options);
  const fs = await import('node:fs/promises');
  await fs.writeFile(filePath, formatted.content, 'utf-8');
}
