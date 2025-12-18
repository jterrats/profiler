# summary

Migrate permissions from Profile to Permission Set.

# description

Migrates specific permission types (FLS, Apex, Flows, Tabs, Record Types) from a Profile to a Permission Set. Use --dry-run to preview changes before executing the migration.

# flags.from.summary

Source Profile name to migrate permissions from.

# flags.from.description

The name of the Profile that contains the permissions to migrate. This Profile must exist in your local project or in the target org.

# flags.section.summary

Permission sections to migrate (fls, apex, flows, tabs, recordtype, objectaccess, connectedapps, custompermissions, userpermissions, visualforce, custommetadatatypes, externalcredentials, dataspaces, applications, customsettings).

# flags.section.description

Comma-separated list of permission sections to migrate. Options: fls (Field Level Security), apex (Apex Class Access), flows (Flow Access), tabs (Tab Visibility), recordtype (Record Type Access), objectaccess (Object Permissions), connectedapps (Connected App Access), custompermissions (Custom Permissions), userpermissions (User Permissions), visualforce (Visualforce Page Access), custommetadatatypes (Custom Metadata Type Access), externalcredentials (External Credential Access), dataspaces (Data Space Access), applications (Application Visibilities), customsettings (Custom Setting Access). Example: "fls,apex,objectaccess,userpermissions,applications".

# flags.name.summary

Permission Set name (optional, generates name dynamically if not specified).

# flags.name.description

Name of the Permission Set to migrate permissions to. Can be an existing Permission Set or a new one. If not specified, a new Permission Set will be created with a generated name like "Migrated_From_{ProfileName}_{Date}".

# flags.dry-run.summary

Preview migration without executing changes.

# flags.dry-run.description

Shows what permissions would be migrated without actually creating or modifying the Permission Set. Use this to review changes before executing the migration.

# flags.format.summary

Output format for preview (table, json, html, markdown, csv, yaml).

# flags.format.description

Choose the output format for the migration preview. Options: table (ASCII table for terminal), json (machine-readable), html (web-friendly), markdown (documentation-friendly), csv (Excel-compatible), yaml (structured data). Default is "table".

# flags.output-file.summary

Export preview to file.

# flags.output-file.description

Save the migration preview to a file. The file format is determined by the --format flag. Example: "./migration-preview.html".

# flags.open.summary

Open HTML output in browser (deprecated - HTML files open automatically).

# flags.open.description

This flag is deprecated. HTML files are automatically opened in the browser when using --format html with --output-file. This flag is kept for backward compatibility but has no effect.

# flags.create-if-missing.summary

Create Permission Set if it doesn't exist.

# flags.create-if-missing.description

If the target Permission Set doesn't exist, create it automatically. If disabled and the Permission Set doesn't exist, the migration will fail.

# flags.target-org.summary

Target org for migration.

# flags.target-org.description

The Salesforce org where the Permission Set will be created or updated. Required for actual migration (not needed for --dry-run with local profiles).

# examples

- Preview migration (dry-run):

  <%= config.bin %> <%= command.id %> --from Admin --section fls,apex --dry-run

- Preview with HTML format:

  <%= config.bin %> <%= command.id %> --from Admin --section fls --dry-run --format html --output-file preview.html

- Preview with HTML format (opens automatically in browser):

  <%= config.bin %> <%= command.id %> --from Admin --section fls --dry-run --format html --output-file preview.html

- Migrate to existing Permission Set:

  <%= config.bin %> <%= command.id %> --from Admin --section fls,apex --name "Sales_Admin_Permissions" --target-org myOrg

- Migrate and create new Permission Set (auto-generated name):

  <%= config.bin %> <%= command.id %> --from Admin --section fls,flows,tabs --target-org myOrg

- Migrate with object permissions:

  <%= config.bin %> <%= command.id %> --from Admin --section fls,objectaccess --name "Custom_PS" --target-org myOrg

- Export preview as JSON:

  <%= config.bin %> <%= command.id %> --from Admin --section fls --dry-run --format json --output-file preview.json

# info.starting

Starting migration preview for Profile: %s

# info.migrating

Migrating permissions from Profile '%s' to Permission Set '%s'

# info.complete

Migrated %s permission(s) to Permission Set. File created: %s

# info.preview-generated

Preview generated: %s


