# summary

Generate comprehensive documentation for Profile metadata in Markdown format.

# description

The profiler docs command generates detailed documentation for Salesforce Profile metadata files in Markdown format. It creates tables/matrices for all permission types including user permissions, object permissions, field-level security, application visibilities, and more.

Use the --name flag to generate documentation for a specific profile, or omit it to generate documentation for all profiles in the project.

The generated documentation includes:
- Profile description and metadata
- User permissions matrix
- Object permissions (CRUD + View/Modify All)
- Field-level security (FLS) permissions
- Application visibilities
- Apex class accesses
- Visualforce page accesses
- Tab visibilities
- Record type visibilities
- Layout assignments
- Summary statistics

# flags.name.summary

Name of the profile to generate documentation for.

# flags.name.description

Specify the name of a single profile to generate documentation for. If not provided, documentation will be generated for all profiles in the project.

# flags.output-dir.summary

Directory where the documentation files will be created.

# flags.output-dir.description

Specify the output directory for the generated Markdown documentation files. Defaults to 'profile-docs' in the project root.

# examples

- Generate documentation for all profiles in the project:

  <%= config.bin %> <%= command.id %>

- Generate documentation for a specific profile:

  <%= config.bin %> <%= command.id %> --name Admin

- Generate documentation with a custom output directory:

  <%= config.bin %> <%= command.id %> --output-dir docs/profiles

- Generate documentation for a specific profile in a custom directory:

  <%= config.bin %> <%= command.id %> --name "Sales User" --output-dir salesforce-docs

