/**
 * Interactive UI Module
 *
 * Provides interactive prompts for merge operations using inquirer.
 * Gracefully degrades in non-TTY environments.
 *
 * @module core/ui/interactive
 */

import inquirer from 'inquirer';
import type { MergeConflict } from '../../operations/index.js';

/**
 * Check if running in interactive terminal
 */
export function isInteractiveTerminal(): boolean {
  return process.stdout.isTTY && !process.env.CI;
}

/**
 * Change information for interactive selection
 */
export type ChangeInfo = {
  /** Unique identifier for the change */
  id: string;
  /** Display name for the change */
  name: string;
  /** Type of change: add, remove, modify */
  type: 'add' | 'remove' | 'modify';
  /** Element path (e.g., "fieldPermissions.Account.Name") */
  element: string;
  /** Local value (for modify/remove) */
  localValue?: string;
  /** Org value (for modify/add) */
  orgValue?: string;
  /** Description of the change */
  description: string;
};

/**
 * Convert merge conflicts to change information
 */
export function conflictsToChanges(conflicts: MergeConflict[]): ChangeInfo[] {
  return conflicts.map((conflict, index) => {
    const isModify = conflict.localValue && conflict.orgValue;
    const isAdd = !conflict.localValue && conflict.orgValue;
    const isRemove = conflict.localValue && !conflict.orgValue;

    let type: 'add' | 'remove' | 'modify' = 'modify';
    if (isAdd) type = 'add';
    else if (isRemove) type = 'remove';

    return {
      id: `change-${index}`,
      name: conflict.element,
      type,
      element: conflict.element,
      localValue: conflict.localValue,
      orgValue: conflict.orgValue,
      description: isModify
        ? `Modify ${conflict.element}: ${conflict.localValue} → ${conflict.orgValue}`
        : isAdd
        ? `Add ${conflict.element}: ${conflict.orgValue}`
        : `Remove ${conflict.element}: ${conflict.localValue}`,
    };
  });
}

/**
 * Format change for display in prompt
 */
function formatChangeForDisplay(change: ChangeInfo): string {
  const icon = change.type === 'add' ? '+' : change.type === 'remove' ? '-' : '~';
  return `${icon} ${change.element}`;
}

/**
 * Format detailed diff for preview
 */
export function formatChangeDiff(change: ChangeInfo): string {
  const lines: string[] = [];
  lines.push(`\n${'='.repeat(60)}`);
  lines.push(`Element: ${change.element}`);
  lines.push(`Type: ${change.type.toUpperCase()}`);

  if (change.type === 'modify') {
    lines.push('\nLocal Value:');
    lines.push(`  ${change.localValue ?? 'N/A'}`);
    lines.push('\nOrg Value:');
    lines.push(`  ${change.orgValue ?? 'N/A'}`);
  } else if (change.type === 'add') {
    lines.push('\nNew Value:');
    lines.push(`  ${change.orgValue ?? 'N/A'}`);
  } else if (change.type === 'remove') {
    lines.push('\nValue to Remove:');
    lines.push(`  ${change.localValue ?? 'N/A'}`);
  }

  lines.push(`${'='.repeat(60)}\n`);
  return lines.join('\n');
}

/**
 * Prompt user to select changes to apply
 *
 * @param changes - List of changes to select from
 * @returns Selected change IDs
 */
export async function promptForChanges(changes: ChangeInfo[]): Promise<string[]> {
  if (!isInteractiveTerminal()) {
    throw new Error('Interactive mode requires a TTY. Use a non-interactive strategy instead.');
  }

  if (changes.length === 0) {
    return [];
  }

  const choices = changes.map((change) => ({
    name: formatChangeForDisplay(change),
    value: change.id,
    short: change.element,
  }));

  const answers = await inquirer.prompt<{ selectedChanges: string[] }>([
    {
      type: 'checkbox',
      name: 'selectedChanges',
      message: 'Select changes to apply (Press space to select, Enter to confirm):',
      choices,
      pageSize: 15,
      validate: (input: string[]): boolean | string => {
        if (input.length === 0) {
          return 'Please select at least one change to apply.';
        }
        return true;
      },
    },
  ]);

  return answers.selectedChanges;
}

/**
 * Prompt user to preview changes before applying
 *
 * @param selectedChanges - Changes that will be applied
 * @param allChanges - All available changes
 * @returns true if user confirms, false otherwise
 */
export async function promptForPreview(selectedChanges: string[], allChanges: ChangeInfo[]): Promise<boolean> {
  if (!isInteractiveTerminal()) {
    return true; // Auto-confirm in non-interactive mode
  }

  const selected = allChanges.filter((c) => selectedChanges.includes(c.id));

  // eslint-disable-next-line no-console
  console.log('\n📋 Preview of changes to apply:');
  // eslint-disable-next-line no-console
  console.log('─'.repeat(60));
  for (const change of selected) {
    // eslint-disable-next-line no-console
    console.log(formatChangeDiff(change));
  }
  // eslint-disable-next-line no-console
  console.log(`\nTotal: ${selected.length} change(s) will be applied.`);

  const answers = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Apply these changes?',
      default: true,
    },
  ]);

  return answers.confirm;
}

/**
 * Prompt user for conflict resolution
 *
 * @param conflict - Conflict to resolve
 * @returns 'local' | 'org' | 'skip'
 */
export async function promptForConflictResolution(conflict: MergeConflict): Promise<'local' | 'org' | 'skip'> {
  if (!isInteractiveTerminal()) {
    throw new Error('Interactive mode requires a TTY.');
  }

  const answers = await inquirer.prompt<{ resolution: 'local' | 'org' | 'skip' }>([
    {
      type: 'list',
      name: 'resolution',
      message: `How to resolve conflict for ${conflict.element}?`,
      choices: [
        { name: `Keep local: ${conflict.localValue}`, value: 'local' as const },
        { name: `Use org: ${conflict.orgValue}`, value: 'org' as const },
        { name: 'Skip this conflict', value: 'skip' as const },
      ],
      default: 'local',
    },
  ]);

  return answers.resolution;
}
