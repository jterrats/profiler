# author: jaime terrats
TARGET_ORG="$(node -p 'JSON.parse(process.argv[1]).result.alias' "$(sfdx force:org:display --json)")"

API_VERSION="echo $(sfdx config:list --json | jq '.result[0].value')"

PROJECT_PATH="$(pwd)"

# project profiles
profiles="$(basename -s .profile-meta.xml ./force-app/main/default/profiles/* | awk -F/ '{print $NF}')"

mkdir temp
cd temp

# package.xml
echo '<?xml version="1.0" encoding="UTF-8"?>' > package.xml
echo '<Package xmlns="http://soap.sforce.com/2006/04/metadata">' >> package.xml

# Apex Classes
sfdx force:mdapi:listmetadata -m ApexClass -u $TARGET_ORG -f ApexClasses.json
echo "<types>" > ApexClasses.txt
cat ApexClasses.json | jq '[.[].fullName] | sort | .[] | "<members>" + . + "</members>"' -r >> ApexClasses.txt
echo "<name>ApexClass</name></types>" >> ApexClasses.txt
cat ApexClasses.txt >> package.xml

# Custom Aplications
sfdx force:mdapi:listmetadata -m CustomApplication -u $TARGET_ORG -f CustomApplications.json
echo "<types>" > CustomApplications.txt
cat CustomApplications.json | jq '[.[].fullName] | sort | .[] | "<members>" + . + "</members>"' -r >> CustomApplications.txt
echo "<name>CustomApplication</name></types>" >> CustomApplications.txt
cat CustomApplications.txt >> package.xml

# Custom Objects
sfdx force:mdapi:listmetadata -m CustomObject -u $TARGET_ORG -f CustomObjects.json
echo "<types>" > CustomObjects.txt
cat CustomObjects.json | jq '[.[].fullName] | sort | .[] | "<members>" + . + "</members>"' -r >> CustomObjects.txt
echo "<name>CustomObject</name></types>" >> CustomObjects.txt
cat CustomObjects.txt >> package.xml

# Custom Permissions
sfdx force:mdapi:listmetadata -m CustomPermission -u $TARGET_ORG -f CustomPermissions.json
echo "<types>" > CustomPermissions.txt
cat CustomPermissions.json | jq '[.[].fullName] | sort | .[] | "<members>" + . + "</members>"' -r >> CustomPermissions.txt
echo "<name>CustomPermission</name></types>" >> CustomPermissions.txt
cat CustomPermissions.txt >> package.xml

# Custom Tabs
sfdx force:mdapi:listmetadata -m CustomTab -u $TARGET_ORG -f CustomTabs.json
echo "<types>" > CustomTabs.txt
cat CustomTabs.json | jq '[.[].fullName] | sort | .[] | "<members>" + . + "</members>"' -r >> CustomTabs.txt
echo "<name>CustomTab</name></types>" >> CustomTabs.txt
cat CustomTabs.txt >> package.xml

# Flows
sfdx force:mdapi:listmetadata -m Flow -u $TARGET_ORG -f Flows.json
echo "<types>" > Flows.txt
cat Flows.json | jq '[.[].fullName] | sort | .[] | "<members>" + . + "</members>"' -r >> Flows.txt
echo "<name>Flow</name></types>" >> Flows.txt
cat Flows.txt >> package.xml

# Layouts
sfdx force:mdapi:listmetadata -m Layout -u $TARGET_ORG -f Layouts.json
echo "<types>" > Layouts.txt
cat Layouts.json | jq '[.[].fullName] | sort | .[] | "<members>" + . + "</members>"' -r >> Layouts.txt
echo "<name>Layout</name></types>" >> Layouts.txt
cat Layouts.txt >> package.xml

# Profiles
sfdx force:mdapi:listmetadata -m Profile -u $TARGET_ORG -f Profiles.json
echo "<types>" > Profiles.txt
cat Profiles.json | jq '[.[].fullName] | sort | .[] | "<members>" + . + "</members>"' -r >> Profiles.txt
echo "<name>Profile</name></types>" >> Profiles.txt
cat Profiles.txt >> package.xml

echo '<version>56.0</version>' >> package.xml
echo '</Package>' >> package.xml

# retrieve metadata
cd ../
sfdx force:source:retrieve -x temp/package.xml -u $TARGET_ORG
git clean -f force-app/
git checkout -- force-app/main/default/applications/
git checkout -- force-app/main/default/classes/
git checkout -- force-app/main/default/flows/
git checkout -- force-app/main/default/layouts/
git checkout -- force-app/main/default/objects/
rm -rf temp
