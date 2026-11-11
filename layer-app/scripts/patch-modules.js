const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native-community',
  'datetimepicker',
  'android',
  'build.gradle'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes('    kotlinOptions {') && !content.includes('if (shouldApplyKotlinPlugin()) {\n        kotlinOptions {')) {
    content = content.replace(
      '    kotlinOptions {\n        jvmTarget = \'17\'\n    }',
      '    if (shouldApplyKotlinPlugin()) {\n        kotlinOptions {\n            jvmTarget = \'17\'\n        }\n    }'
    );
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[patch-modules] Successfully patched @react-native-community/datetimepicker for AGP 9+ compatibility.');
  }
}
