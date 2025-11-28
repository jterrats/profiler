import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { parseStringPromise } from 'xml2js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@jterrats/profiler', 'profiler.docs');

type ProfilePermission = {
  application?: string;
  apexClass?: string;
  enabled?: string[];
  visible?: string[];
  default?: string[];
  field?: string;
  editable?: string[];
  readable?: string[];
  object?: string;
  allowCreate?: string[];
  allowDelete?: string[];
  allowEdit?: string[];
  allowRead?: string[];
  modifyAllRecords?: string[];
  viewAllRecords?: string[];
  apexPage?: string;
  name?: string[];
  recordType?: string;
  tab?: string;
  visibility?: string[];
  layout?: string[];
  recordTypeDefault?: string[];
};

type ProfileMetadata = {
  Profile: {
    applicationVisibilities?: ProfilePermission[];
    classAccesses?: ProfilePermission[];
    fieldPermissions?: ProfilePermission[];
    objectPermissions?: ProfilePermission[];
    pageAccesses?: ProfilePermission[];
    recordTypeVisibilities?: ProfilePermission[];
    tabVisibilities?: ProfilePermission[];
    userPermissions?: ProfilePermission[];
    layoutAssignments?: ProfilePermission[];
    description?: string[];
    custom?: string[];
  };
};

export default class ProfilerDocs extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      description: messages.getMessage('flags.name.description'),
      required: false,
    }),
    'output-dir': Flags.string({
      char: 'd',
      summary: messages.getMessage('flags.output-dir.summary'),
      description: messages.getMessage('flags.output-dir.description'),
      default: 'profile-docs',
    }),
    'exclude-managed': Flags.boolean({
      summary: messages.getMessage('flags.exclude-managed.summary'),
      description: messages.getMessage('flags.exclude-managed.description'),
      default: false,
    }),
  };

  // Instance properties - must come before static methods
  private projectPath!: string;

  // Static methods
  private static buildMarkdownDocumentation(
    profileName: string,
    fileName: string,
    profile: ProfileMetadata['Profile'],
    excludeManaged = false
  ): string {
    let markdown = `# Profile Documentation: ${profileName}\n\n`;
    markdown += `**File Name:** \`${fileName}\`\n\n`;

    // Description
    if (profile.description && profile.description.length > 0) {
      markdown += `**Description:** ${profile.description[0]}\n\n`;
    } else {
      markdown += '**Description:** _No description available_\n\n';
    }

    // Custom profile indicator
    if (profile.custom && profile.custom.length > 0) {
      markdown += `**Custom Profile:** ${profile.custom[0]}\n\n`;
    }

    markdown += '---\n\n';

    // Generate sections for each permission type
    markdown += ProfilerDocs.buildUserPermissionsSection(profile.userPermissions, excludeManaged);
    markdown += ProfilerDocs.buildApplicationVisibilitiesSection(profile.applicationVisibilities, excludeManaged);
    markdown += ProfilerDocs.buildClassAccessesSection(profile.classAccesses, excludeManaged);
    markdown += ProfilerDocs.buildObjectPermissionsSection(profile.objectPermissions, excludeManaged);
    markdown += ProfilerDocs.buildFieldPermissionsSection(profile.fieldPermissions, excludeManaged);
    markdown += ProfilerDocs.buildRecordTypeVisibilitiesSection(profile.recordTypeVisibilities, excludeManaged);
    markdown += ProfilerDocs.buildPageAccessesSection(profile.pageAccesses, excludeManaged);
    markdown += ProfilerDocs.buildTabVisibilitiesSection(profile.tabVisibilities, excludeManaged);
    markdown += ProfilerDocs.buildLayoutAssignmentsSection(profile.layoutAssignments, excludeManaged);

    // Summary statistics
    markdown += ProfilerDocs.buildSummarySection(profile);

    return markdown;
  }

  private static buildUserPermissionsSection(permissions?: ProfilePermission[], excludeManaged = false): string {
    if (!permissions || permissions.length === 0) {
      return '';
    }

    // Filter managed packages if requested
    let filteredPermissions = permissions;
    if (excludeManaged) {
      filteredPermissions = permissions.filter((perm) => {
        const name = perm.name?.[0] ?? '';
        return !ProfilerDocs.isManaged(name);
      });
    }

    if (filteredPermissions.length === 0) {
      return '';
    }

    let section = '## User Permissions\n\n';
    section += `Total: **${filteredPermissions.length}** permissions\n\n`;
    section += '| Permission Name | Enabled |\n';
    section += '|-----------------|:-------:|\n';

    for (const perm of filteredPermissions) {
      const name = perm.name?.[0] ?? 'Unknown';
      const enabled = perm.enabled?.[0] ?? 'false';
      const enabledIcon = enabled === 'true' ? '✅' : '❌';
      section += `| ${name} | ${enabledIcon} |\n`;
    }

    section += '\n';
    return section;
  }

  private static buildApplicationVisibilitiesSection(apps?: ProfilePermission[], excludeManaged = false): string {
    if (!apps || apps.length === 0) {
      return '';
    }

    let filteredApps = apps;
    if (excludeManaged) {
      filteredApps = apps.filter((app) => !ProfilerDocs.isManaged(app.application ?? ''));
    }

    if (filteredApps.length === 0) {
      return '';
    }

    let section = '## Application Visibilities\n\n';
    section += `Total: **${filteredApps.length}** applications\n\n`;
    section += '| Application | Visible | Default |\n';
    section += '|-------------|:-------:|:-------:|\n';

    for (const app of filteredApps) {
      const name = app.application ?? 'Unknown';
      const visible = app.visible?.[0] ?? 'false';
      const isDefault = app.default?.[0] ?? 'false';
      const visibleIcon = visible === 'true' ? '✅' : '❌';
      const defaultIcon = isDefault === 'true' ? '✅' : '❌';
      section += `| ${name} | ${visibleIcon} | ${defaultIcon} |\n`;
    }

    section += '\n';
    return section;
  }

  private static buildClassAccessesSection(classes?: ProfilePermission[], excludeManaged = false): string {
    if (!classes || classes.length === 0) {
      return '';
    }

    let filteredClasses = classes;
    if (excludeManaged) {
      filteredClasses = classes.filter((cls) => !ProfilerDocs.isManaged(cls.apexClass ?? ''));
    }

    if (filteredClasses.length === 0) {
      return '';
    }

    let section = '## Apex Class Accesses\n\n';
    section += `Total: **${filteredClasses.length}** classes\n\n`;
    section += '| Apex Class | Enabled |\n';
    section += '|------------|:-------:|\n';

    for (const cls of filteredClasses) {
      const name = cls.apexClass ?? 'Unknown';
      const enabled = cls.enabled?.[0] ?? 'false';
      const enabledIcon = enabled === 'true' ? '✅' : '❌';
      section += `| ${name} | ${enabledIcon} |\n`;
    }

    section += '\n';
    return section;
  }

  private static buildObjectPermissionsSection(objects?: ProfilePermission[], excludeManaged = false): string {
    if (!objects || objects.length === 0) {
      return '';
    }

    let filteredObjects = objects;
    if (excludeManaged) {
      filteredObjects = objects.filter((obj) => !ProfilerDocs.isManaged(obj.object ?? ''));
    }

    if (filteredObjects.length === 0) {
      return '';
    }

    let section = '## Object Permissions\n\n';
    section += `Total: **${filteredObjects.length}** objects\n\n`;
    section += '| Object | Create | Read | Edit | Delete | View All | Modify All |\n';
    section += '|--------|:------:|:----:|:----:|:------:|:--------:|:----------:|\n';

    for (const obj of filteredObjects) {
      const name = obj.object ?? 'Unknown';
      const create = obj.allowCreate?.[0] ?? 'false';
      const read = obj.allowRead?.[0] ?? 'false';
      const edit = obj.allowEdit?.[0] ?? 'false';
      const del = obj.allowDelete?.[0] ?? 'false';
      const viewAll = obj.viewAllRecords?.[0] ?? 'false';
      const modifyAll = obj.modifyAllRecords?.[0] ?? 'false';

      section += `| ${name} | ${ProfilerDocs.getIcon(create)} | ${ProfilerDocs.getIcon(read)} | ${ProfilerDocs.getIcon(
        edit
      )} | ${ProfilerDocs.getIcon(del)} | ${ProfilerDocs.getIcon(viewAll)} | ${ProfilerDocs.getIcon(modifyAll)} |\n`;
    }

    section += '\n';
    return section;
  }

  private static buildFieldPermissionsSection(fields?: ProfilePermission[], excludeManaged = false): string {
    if (!fields || fields.length === 0) {
      return '';
    }

    let filteredFields = fields;
    if (excludeManaged) {
      filteredFields = fields.filter((field) => !ProfilerDocs.isManaged(field.field ?? ''));
    }

    if (filteredFields.length === 0) {
      return '';
    }

    let section = '## Field Level Security (FLS)\n\n';
    section += `Total: **${filteredFields.length}** field permissions\n\n`;
    section += '| Field | Readable | Editable |\n';
    section += '|-------|:--------:|:--------:|\n';

    for (const field of filteredFields) {
      const name = field.field ?? 'Unknown';
      const readable = field.readable?.[0] ?? 'false';
      const editable = field.editable?.[0] ?? 'false';
      section += `| ${name} | ${ProfilerDocs.getIcon(readable)} | ${ProfilerDocs.getIcon(editable)} |\n`;
    }

    section += '\n';
    return section;
  }

  private static buildRecordTypeVisibilitiesSection(recordTypes?: ProfilePermission[], excludeManaged = false): string {
    if (!recordTypes || recordTypes.length === 0) {
      return '';
    }

    let filteredRecordTypes = recordTypes;
    if (excludeManaged) {
      filteredRecordTypes = recordTypes.filter((rt) => !ProfilerDocs.isManaged(rt.recordType ?? ''));
    }

    if (filteredRecordTypes.length === 0) {
      return '';
    }

    let section = '## Record Type Visibilities\n\n';
    section += `Total: **${filteredRecordTypes.length}** record types\n\n`;
    section += '| Record Type | Visible | Default |\n';
    section += '|-------------|:-------:|:-------:|\n';

    for (const rt of filteredRecordTypes) {
      const name = rt.recordType ?? 'Unknown';
      const visible = rt.visible?.[0] ?? 'false';
      const isDefault = rt.default?.[0] ?? 'false';
      section += `| ${name} | ${ProfilerDocs.getIcon(visible)} | ${ProfilerDocs.getIcon(isDefault)} |\n`;
    }

    section += '\n';
    return section;
  }

  private static buildPageAccessesSection(pages?: ProfilePermission[], excludeManaged = false): string {
    if (!pages || pages.length === 0) {
      return '';
    }

    let filteredPages = pages;
    if (excludeManaged) {
      filteredPages = pages.filter((page) => !ProfilerDocs.isManaged(page.apexPage ?? ''));
    }

    if (filteredPages.length === 0) {
      return '';
    }

    let section = '## Visualforce Page Accesses\n\n';
    section += `Total: **${filteredPages.length}** pages\n\n`;
    section += '| Page | Enabled |\n';
    section += '|------|:-------:|\n';

    for (const page of filteredPages) {
      const name = page.apexPage ?? 'Unknown';
      const enabled = page.enabled?.[0] ?? 'false';
      section += `| ${name} | ${ProfilerDocs.getIcon(enabled)} |\n`;
    }

    section += '\n';
    return section;
  }

  private static buildTabVisibilitiesSection(tabs?: ProfilePermission[], excludeManaged = false): string {
    if (!tabs || tabs.length === 0) {
      return '';
    }

    let filteredTabs = tabs;
    if (excludeManaged) {
      filteredTabs = tabs.filter((tab) => !ProfilerDocs.isManaged(tab.tab ?? ''));
    }

    if (filteredTabs.length === 0) {
      return '';
    }

    let section = '## Tab Visibilities\n\n';
    section += `Total: **${filteredTabs.length}** tabs\n\n`;
    section += '| Tab | Visibility |\n';
    section += '|-----|:----------:|\n';

    for (const tab of filteredTabs) {
      const name = tab.tab ?? 'Unknown';
      const visibility = tab.visibility?.[0] ?? 'Unknown';
      section += `| ${name} | ${visibility} |\n`;
    }

    section += '\n';
    return section;
  }

  private static buildLayoutAssignmentsSection(layouts?: ProfilePermission[], excludeManaged = false): string {
    if (!layouts || layouts.length === 0) {
      return '';
    }

    let filteredLayouts = layouts;
    if (excludeManaged) {
      filteredLayouts = layouts.filter((layout) => !ProfilerDocs.isManaged(layout.layout?.[0] ?? ''));
    }

    if (filteredLayouts.length === 0) {
      return '';
    }

    let section = '## Layout Assignments\n\n';
    section += `Total: **${filteredLayouts.length}** layout assignments\n\n`;
    section += '| Layout | Record Type |\n';
    section += '|--------|-------------|\n';

    for (const layout of filteredLayouts) {
      const layoutName = layout.layout?.[0] ?? 'Unknown';
      const recordType = layout.recordType ?? '-';
      section += `| ${layoutName} | ${recordType} |\n`;
    }

    section += '\n';
    return section;
  }

  private static buildSummarySection(profile: ProfileMetadata['Profile']): string {
    let section = '---\n\n## Summary Statistics\n\n';
    section += '| Category | Count |\n';
    section += '|----------|------:|\n';

    const stats = [
      { name: 'User Permissions', count: profile.userPermissions?.length ?? 0 },
      { name: 'Applications', count: profile.applicationVisibilities?.length ?? 0 },
      { name: 'Apex Classes', count: profile.classAccesses?.length ?? 0 },
      { name: 'Objects', count: profile.objectPermissions?.length ?? 0 },
      { name: 'Fields (FLS)', count: profile.fieldPermissions?.length ?? 0 },
      { name: 'Record Types', count: profile.recordTypeVisibilities?.length ?? 0 },
      { name: 'Visualforce Pages', count: profile.pageAccesses?.length ?? 0 },
      { name: 'Tabs', count: profile.tabVisibilities?.length ?? 0 },
      { name: 'Layout Assignments', count: profile.layoutAssignments?.length ?? 0 },
    ];

    for (const stat of stats) {
      section += `| ${stat.name} | ${stat.count} |\n`;
    }

    const total = stats.reduce((sum, stat) => sum + stat.count, 0);
    section += `| **Total** | **${total}** |\n`;

    section += '\n---\n\n';
    section += `_Documentation generated on ${new Date().toISOString()}_\n`;

    return section;
  }

  private static isManaged(name: string): boolean {
    // Check if it's a managed package component (has namespace__ but doesn't end with __c)
    return name.includes('__') && !name.endsWith('__c');
  }

  private static getIcon(value: string): string {
    return value === 'true' ? '✅' : '❌';
  }

  // Public instance methods
  public async run(): Promise<void> {
    const { flags } = await this.parse(ProfilerDocs);

    this.projectPath = process.cwd();
    const profilesPath = path.join(this.projectPath, 'force-app', 'main', 'default', 'profiles');

    // Verify profiles directory exists
    try {
      await fs.access(profilesPath);
    } catch {
      this.error(`Profiles directory not found at: ${profilesPath}`);
    }

    // Get list of profiles to document
    const profilesToDocument = await this.getProfilesToDocument(profilesPath, flags.name);

    if (profilesToDocument.length === 0) {
      this.warn(flags.name ? `Profile "${flags.name}" not found.` : 'No profiles found to document.');
      return;
    }

    // Create output directory
    const outputDir = path.join(this.projectPath, flags['output-dir']);
    await fs.mkdir(outputDir, { recursive: true });

    this.log(`Generating documentation for ${profilesToDocument.length} profile(s)...\n`);

    // Generate documentation for each profile
    await Promise.all(
      profilesToDocument.map((profileFile) =>
        this.generateProfileDocumentation(profilesPath, profileFile, outputDir, flags['exclude-managed'])
      )
    );

    this.log(`\n✅ Documentation generated successfully in: ${outputDir}`);
  }

  // Private instance methods
  private async getProfilesToDocument(profilesPath: string, profileName?: string): Promise<string[]> {
    const allFiles = await fs.readdir(profilesPath);
    const profileFiles = allFiles.filter((file) => file.endsWith('.profile-meta.xml'));

    if (profileName) {
      // Parse profile names (comma-separated)
      const profileNames = profileName
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      // Find all matching profiles
      const matchingFiles: string[] = [];
      for (const name of profileNames) {
        const targetFile = `${name}.profile-meta.xml`;
        if (profileFiles.includes(targetFile)) {
          matchingFiles.push(targetFile);
        } else {
          this.warn(`Profile "${name}" not found, skipping...`);
        }
      }

      return matchingFiles;
    }

    this.log(`Found ${profileFiles.length} profile(s) to document`);
    return profileFiles;
  }

  private async generateProfileDocumentation(
    profilesPath: string,
    profileFile: string,
    outputDir: string,
    excludeManaged: boolean
  ): Promise<void> {
    const profilePath = path.join(profilesPath, profileFile);
    const profileName = profileFile.replace('.profile-meta.xml', '');

    this.log(`📄 Generating documentation for: ${profileName}`);

    // Read and parse profile XML
    const xmlContent = await fs.readFile(profilePath, 'utf-8');
    const parsedProfile = (await parseStringPromise(xmlContent)) as ProfileMetadata;
    const profile = parsedProfile.Profile;

    // Generate markdown documentation
    const markdown = ProfilerDocs.buildMarkdownDocumentation(profileName, profileFile, profile, excludeManaged);

    // Write documentation file
    const outputFile = path.join(outputDir, `${profileName}.md`);
    await fs.writeFile(outputFile, markdown, 'utf-8');

    this.log(`   ✓ Created: ${outputFile}`);
  }
}
