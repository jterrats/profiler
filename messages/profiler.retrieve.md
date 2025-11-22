# summary

Retrieve Profile metadata with all required dependencies.

# description

The profiler retrieve command safely retrieves Profile metadata along with all its dependencies from the target org, including Apex Classes, Custom Applications, Custom Objects, Custom Permissions, Custom Tabs, Flows, and Layouts. Use the --all-fields flag to include Field Level Security (FLS) permissions.

IMPORTANT: This command uses a temporary directory for all retrieval operations, ensuring your local uncommitted changes are NEVER overwritten. Only profile files are copied to your project - all other metadata remains untouched. No git operations are required.

# flags.target-org.summary

The target org to retrieve profiles from.

# flags.name.summary

The name of a specific profile or comma-separated list of profiles to retrieve.

# flags.name.description

When specified, only retrieves the named profile(s) instead of all profiles. You can specify a single profile or multiple profiles separated by commas. Profile names should match exactly (e.g., "Admin", "Standard User", "Admin,Custom Profile,Sales").

# flags.all-fields.summary

Include Field Level Security (FLS) in the retrieved profiles.

# flags.all-fields.description

When enabled, retrieves complete profile metadata including Field Level Security settings for all objects and fields.

# flags.api-version.summary

Override the API version used for metadata operations.

# flags.api-version.description

Specify the API version to use for the retrieve operation. Defaults to the org's API version.

# flags.from-project.summary

Use local project metadata to build the package.xml instead of listing from org.

# flags.from-project.description

When enabled, reads metadata component names from the local project directories (classes, objects, flows, etc.) to build the package.xml, instead of querying the org. This is faster and useful when you want to retrieve only what exists in your project.

# examples

- Retrieve all profiles with metadata (without FLS):

  <%= config.bin %> <%= command.id %> --target-org myOrg

- Retrieve a specific profile:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name Admin

- Retrieve multiple profiles:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name "Admin,Custom Profile,Sales Profile"

- Retrieve all profiles with all fields including FLS:

  <%= config.bin %> <%= command.id %> --target-org myOrg --all-fields

- Retrieve specific profiles with FLS:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name "Admin,Standard User" --all-fields

- Retrieve profiles with a specific API version:

  <%= config.bin %> <%= command.id %> --target-org myOrg --all-fields --api-version 60.0

- Retrieve profiles using local project metadata:

  <%= config.bin %> <%= command.id %> --target-org myOrg --from-project

- Retrieve specific profiles using local metadata:

  <%= config.bin %> <%= command.id %> --target-org myOrg --name "Admin,Sales Profile" --from-project

# info.starting

Starting profile retrieval for org: %s

# info.starting-with-name

Starting retrieval of profile "%s" for org: %s

# info.starting-with-names

Starting retrieval of %s profiles (%s) for org: %s

# info.listing-metadata

Listing metadata type: %s

# info.building-package

Building package.xml with %s metadata types

# info.retrieving

Retrieving metadata from org...

# info.cleaning

Cleaning up temporary files...

# info.success

Successfully retrieved profiles and dependencies!

# info.total-components

Total components retrieved: %s

# error.retrieve-failed

Failed to retrieve metadata: %s

# error.org-required

A target org must be specified. Use --target-org flag.

# error.metadata-list-failed

Failed to list metadata for type %s: %s

# warn.profile-not-found

Profile "%s" not found in org. Skipping profile retrieval.

# warn.profiles-not-found

None of the specified profiles (%s) were found in org. Skipping profile retrieval.

# warn.some-profiles-not-found

Some profiles not found in org: %s
