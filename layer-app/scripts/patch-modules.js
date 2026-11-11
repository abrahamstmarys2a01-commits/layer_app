const fs = require('fs');
const path = require('path');

// 1. Patch @react-native-community/datetimepicker
const datetimepickerGradle = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native-community',
  'datetimepicker',
  'android',
  'build.gradle'
);

if (fs.existsSync(datetimepickerGradle)) {
  let content = fs.readFileSync(datetimepickerGradle, 'utf8');
  if (content.includes('    kotlinOptions {') && !content.includes('if (shouldApplyKotlinPlugin()) {\n        kotlinOptions {')) {
    content = content.replace(
      '    kotlinOptions {\n        jvmTarget = \'17\'\n    }',
      '    if (shouldApplyKotlinPlugin()) {\n        kotlinOptions {\n            jvmTarget = \'17\'\n        }\n    }'
    );
    fs.writeFileSync(datetimepickerGradle, content, 'utf8');
    console.log('[patch-modules] Successfully patched @react-native-community/datetimepicker for AGP 9+ compatibility.');
  }
}

// 2. Patch @react-native-async-storage/async-storage
// In AGP 9+, built-in Kotlin compiles all .kt files in src/main/java.
// The experimental 'next' Room implementation in src/main/java must be relocated to src/kotlinPackage
// so it is not erroneously compiled when useNextStorage=false.
const asyncStorageMainNext = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native-async-storage',
  'async-storage',
  'android',
  'src',
  'main',
  'java',
  'com',
  'reactnativecommunity',
  'asyncstorage',
  'next'
);

const asyncStorageKotlinNext = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native-async-storage',
  'async-storage',
  'android',
  'src',
  'kotlinPackage',
  'java',
  'com',
  'reactnativecommunity',
  'asyncstorage',
  'next'
);

if (fs.existsSync(asyncStorageMainNext) && !fs.existsSync(asyncStorageKotlinNext)) {
  fs.renameSync(asyncStorageMainNext, asyncStorageKotlinNext);
  console.log('[patch-modules] Successfully moved async-storage next to kotlinPackage for AGP 9+ compatibility.');
}
