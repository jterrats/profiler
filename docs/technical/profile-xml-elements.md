# Salesforce Profile XML Elements - Complete Reference

## Overview

This document provides a comprehensive analysis of all XML elements found in Salesforce Profile metadata files (`.profile-meta.xml`). This analysis is based on real profile files from multiple Salesforce projects.

## Profile XML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- All profile elements listed below -->
</Profile>
```

## Complete List of Profile Elements

Based on analysis of profile files in `~/dev`, the following elements are found in Salesforce Profiles:

### 1. **applicationVisibilities**
**Purpose**: Controls which applications are visible and default for the profile.

**Structure**:
```xml
<applicationVisibilities>
    <application>Standard__LightningService</application>
    <default>false</default>
    <visible>true</visible>
</applicationVisibilities>
```

**Fields**:
- `application` - API name of the application
- `default` - Boolean, whether this is the default application
- `visible` - Boolean, whether the application is visible to users

**Count**: Multiple entries (one per application)

---

### 2. **classAccesses**
**Purpose**: Controls access to Apex Classes.

**Structure**:
```xml
<classAccesses>
    <apexClass>MyApexClass</apexClass>
    <enabled>true</enabled>
</classAccesses>
```

**Fields**:
- `apexClass` - Name of the Apex class
- `enabled` - Boolean, whether access is granted

**Count**: Multiple entries (one per Apex class)

---

### 3. **custom**
**Purpose**: Indicates whether this is a custom profile.

**Structure**:
```xml
<custom>true</custom>
```

**Fields**:
- Boolean value (true/false)

**Count**: Single entry

---

### 4. **customMetadataTypeAccesses**
**Purpose**: Controls access to Custom Metadata Types.

**Structure**:
```xml
<customMetadataTypeAccesses>
    <enabled>true</enabled>
    <name>MyCustomMetadata__mdt</name>
</customMetadataTypeAccesses>
```

**Fields**:
- `enabled` - Boolean, whether access is granted
- `name` - API name of the custom metadata type

**Count**: Multiple entries (one per custom metadata type)

---

### 5. **customPermissions**
**Purpose**: Controls which custom permissions are enabled for the profile.

**Structure**:
```xml
<customPermissions>
    <enabled>true</enabled>
    <name>MyCustomPermission</name>
</customPermissions>
```

**Fields**:
- `enabled` - Boolean, whether the permission is enabled
- `name` - API name of the custom permission

**Count**: Multiple entries (one per custom permission)

---

### 6. **customSettingAccesses**
**Purpose**: Controls access to custom settings.

**Structure**:
```xml
<customSettingAccesses>
    <enabled>true</enabled>
    <name>MyCustomSetting__c</name>
</customSettingAccesses>
```

**Fields**:
- `enabled` - Boolean, whether access is granted
- `name` - API name of the custom setting

**Count**: Multiple entries (one per custom setting)

---

### 7. **description**
**Purpose**: Provides a description of the profile.

**Structure**:
```xml
<description>Profile description text</description>
```

**Fields**:
- Text content

**Count**: Single entry (optional)

---

### 8. **fieldPermissions**
**Purpose**: Controls read/edit access to specific fields (Field Level Security - FLS).

**Structure**:
```xml
<fieldPermissions>
    <editable>true</editable>
    <field>Account.CustomField__c</field>
    <readable>true</readable>
</fieldPermissions>
```

**Fields**:
- `editable` - Boolean, whether the field can be edited
- `field` - Field API name in format: `ObjectName.FieldName`
- `readable` - Boolean, whether the field can be read

**Count**: Multiple entries (potentially thousands)

**Note**: This is typically the largest section in profile files.

---

### 9. **layoutAssignments**
**Purpose**: Assigns page layouts to record types for the profile.

**Structure**:
```xml
<layoutAssignments>
    <layout>Account-Account Layout</layout>
    <recordType>Account.PersonAccount</recordType>
</layoutAssignments>
```

**Fields**:
- `layout` - Name of the page layout
- `recordType` - Record type API name (optional, for default layout if omitted)

**Count**: Multiple entries (one per object/record type combination)

---

### 10. **loginIpRanges**
**Purpose**: Restricts login to specific IP ranges.

**Structure**:
```xml
<loginIpRanges>
    <startAddress>192.168.1.1</startAddress>
    <endAddress>192.168.1.255</endAddress>
</loginIpRanges>
```

**Fields**:
- `startAddress` - Starting IP address
- `endAddress` - Ending IP address

**Count**: Multiple entries (optional)

---

### 11. **objectPermissions**
**Purpose**: Controls CRUD permissions for objects.

**Structure**:
```xml
<objectPermissions>
    <allowCreate>true</allowCreate>
    <allowDelete>true</allowDelete>
    <allowEdit>true</allowEdit>
    <allowRead>true</allowRead>
    <modifyAllRecords>false</modifyAllRecords>
    <object>Account</object>
    <viewAllRecords>false</viewAllRecords>
</objectPermissions>
```

**Fields**:
- `allowCreate` - Boolean, create permission
- `allowDelete` - Boolean, delete permission
- `allowEdit` - Boolean, edit permission
- `allowRead` - Boolean, read permission
- `modifyAllRecords` - Boolean, modify all records permission
- `object` - Object API name
- `viewAllRecords` - Boolean, view all records permission

**Count**: Multiple entries (one per object)

---

### 12. **recordTypeVisibilities**
**Purpose**: Controls visibility of record types.

**Structure**:
```xml
<recordTypeVisibilities>
    <default>false</default>
    <recordType>Account.PersonAccount</recordType>
    <visible>true</visible>
</recordTypeVisibilities>
```

**Fields**:
- `default` - Boolean, whether this is the default record type
- `recordType` - Record type API name
- `visible` - Boolean, whether the record type is visible

**Count**: Multiple entries (one per record type)

---

### 13. **tabVisibilities**
**Purpose**: Controls visibility of tabs in the application.

**Structure**:
```xml
<tabVisibilities>
    <tab>standard-Account</tab>
    <visibility>DefaultOn</visibility>
</tabVisibilities>
```

**Fields**:
- `tab` - Tab API name
- `visibility` - Values: `DefaultOn`, `DefaultOff`, `Hidden`

**Count**: Multiple entries (one per tab)

---

### 14. **userLicense**
**Purpose**: Specifies the user license associated with the profile.

**Structure**:
```xml
<userLicense>Salesforce</userLicense>
```

**Fields**:
- Text content (license name)

**Count**: Single entry

**Common Values**:
- `Salesforce`
- `Salesforce Platform`
- `Identity`
- `Community`

---

### 15. **userPermissions**
**Purpose**: Controls system-wide user permissions.

**Structure**:
```xml
<userPermissions>
    <enabled>true</enabled>
    <name>ViewSetup</name>
</userPermissions>
```

**Fields**:
- `enabled` - Boolean, whether the permission is enabled
- `name` - System permission name

**Count**: Multiple entries (potentially 100+)

**Common Examples**:
- `ViewSetup` - Access Setup
- `ModifyAllData` - Modify All Data
- `ViewAllData` - View All Data
- `ManageUsers` - Manage Users
- `EditTask` - Edit Tasks
- `ApiEnabled` - API Enabled

---

## Element Frequency Analysis

Based on typical profile files:

| Element | Typical Count | Size Impact |
|---------|--------------|-------------|
| `fieldPermissions` | 2,000-10,000+ | **LARGEST** |
| `objectPermissions` | 100-500 | Large |
| `userPermissions` | 100-200 | Medium |
| `classAccesses` | 50-500 | Medium |
| `applicationVisibilities` | 20-50 | Small |
| `tabVisibilities` | 20-50 | Small |
| `layoutAssignments` | 20-100 | Small |
| `recordTypeVisibilities` | 10-50 | Small |
| `customPermissions` | 0-50 | Small |
| `customSettingAccesses` | 0-20 | Small |
| `customMetadataTypeAccesses` | 0-20 | Small |
| `loginIpRanges` | 0-5 | Small |
| `userLicense` | 1 | Tiny |
| `custom` | 1 | Tiny |
| `description` | 0-1 | Tiny |

---

## Critical Elements for Profile Functionality

### **Must-Have Elements**:
1. `userLicense` - Defines the license type
2. `custom` - Identifies if it's a custom profile
3. `userPermissions` - Core system permissions
4. `objectPermissions` - CRUD access to objects

### **Important for Functionality**:
5. `fieldPermissions` - Field-level security (FLS)
6. `classAccesses` - Apex class access
7. `tabVisibilities` - UI navigation
8. `applicationVisibilities` - Application access

### **Nice-to-Have**:
9. `layoutAssignments` - Page layout assignments
10. `recordTypeVisibilities` - Record type access
11. `customPermissions` - Custom permission access

### **Optional/Security**:
12. `loginIpRanges` - IP restrictions
13. `description` - Documentation

---

## Recommendations for Plugin Enhancement

### 1. **Field Level Security (FLS) Handling**

**Current Implementation**:
- `--all-fields` flag controls FLS retrieval
- Without flag: FLS elements are removed

**Recommendation**: ✅ Current implementation is optimal

---

### 2. **Element Priority for Comparison**

When comparing profiles, prioritize differences in:

**High Priority** (Security & Access):
- `userPermissions`
- `objectPermissions`
- `customPermissions`

**Medium Priority** (Configuration):
- `classAccesses`
- `applicationVisibilities`
- `tabVisibilities`

**Low Priority** (UI/Layout):
- `layoutAssignments`
- `recordTypeVisibilities`

**Very Low Priority** (Detailed FLS):
- `fieldPermissions` (only when `--all-fields` is used)

---

### 3. **Suggested New Features**

#### A. **Element-Specific Comparison**
Add flag to compare specific element types:

```bash
sf profiler compare --target-org myOrg --elements userPermissions,objectPermissions
```

#### B. **Permission Analysis**
Add command to analyze permissions:

```bash
sf profiler analyze --target-org myOrg --name "Admin"
```

Output would show:
- Total permissions enabled
- Critical permissions (ModifyAllData, ViewAllData)
- Object access summary
- Missing FLS

#### C. **Diff by Element Type**
Group comparison output by element type:

```bash
sf profiler compare --target-org myOrg --group-by element
```

Output:
```
userPermissions: 5 differences
objectPermissions: 12 differences
classAccesses: 0 differences
```

---

## XML Element Dependencies

Some elements depend on others:

```
userLicense (must exist)
    └─> userPermissions (restricted by license)
    └─> objectPermissions (restricted by license)
        └─> fieldPermissions (restricted by object permissions)
```

**Dependency Rules**:
1. `fieldPermissions` requires `objectPermissions` with `allowRead` or `allowEdit`
2. `layoutAssignments` requires `objectPermissions` with `allowRead`
3. `recordTypeVisibilities` requires `objectPermissions` with `allowRead`

---

## File Size Considerations

Profile files can be **extremely large**:

- **Without FLS**: 50 KB - 500 KB
- **With FLS**: 500 KB - 5 MB+
- **Admin Profile with FLS**: Often 5-10 MB

**Performance Impact**:
- Parsing: Negligible (Node.js handles XML well)
- Network Transfer: Significant (especially with FLS)
- Git Diff: Very slow with FLS (thousands of lines)

**Recommendation**: Default to excluding FLS (current implementation ✅)

---

## Best Practices for Profile Management

### 1. **Version Control**
- ✅ Store profiles without FLS
- ✅ Use `.gitignore` for large profiles with FLS
- ✅ Compare before committing

### 2. **Deployment**
- ✅ Retrieve with FLS only when needed
- ✅ Test in sandbox first
- ✅ Use permission sets instead of profiles when possible

### 3. **Comparison**
- ✅ Focus on structural changes (permissions, access)
- ⚠️ Ignore FLS unless specifically needed
- ✅ Use element-type grouping for clarity

---

## Element Naming Conventions

### Standard Elements
- Use `standard__` prefix: `standard__LightningService`

### Custom Elements
- Use namespace: `MyNamespace__CustomObject__c`
- No namespace for unmanaged: `CustomObject__c`

### Managed Package Elements
- Include namespace: `FinServ__BankingConsole`

---

## Security Implications

### High-Risk Permissions
Elements that contain sensitive permissions:

**userPermissions**:
- `ModifyAllData`
- `ViewAllData`
- `ManageUsers`
- `ViewSetup`
- `ModifyMetadata`

**objectPermissions**:
- `modifyAllRecords=true`
- `viewAllRecords=true`

**Recommendation**: Audit these in compare command

---

## Future API Changes

Salesforce regularly adds new elements:
- New permission types
- New metadata access types
- Enhanced security features

**Plugin Maintenance**:
- Monitor Salesforce API release notes
- Test with new API versions
- Update element list as needed

---

## Conclusion

The plugin should:
1. ✅ Handle all 15 element types
2. ✅ Provide FLS control (`--all-fields`)
3. ✅ Support element-specific operations
4. ✅ Prioritize security-relevant elements
5. ✅ Offer flexible comparison options

All current plugin functionality aligns with best practices for profile management.

