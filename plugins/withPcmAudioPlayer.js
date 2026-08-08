const fs = require('fs');
const path = require('path');
const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');

const PACKAGE_IMPORT = 'import com.amogh.dlt.calling.PcmAudioPlayerPackage';
const PACKAGE_ADD_LINE = 'add(PcmAudioPlayerPackage())';

function copyNativeModuleSources(config) {
  return withDangerousMod(config, [
    'android',
    (modConfig) => {
      const sourceDir = path.join(modConfig.modRequest.projectRoot, 'plugins', 'android-src');
      const targetDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', 'com', 'amogh', 'dlt', 'calling'
      );
      fs.mkdirSync(targetDir, { recursive: true });
      for (const fileName of fs.readdirSync(sourceDir)) {
        fs.copyFileSync(path.join(sourceDir, fileName), path.join(targetDir, fileName));
      }
      return modConfig;
    },
  ]);
}

function registerPackageInMainApplication(config) {
  return withMainApplication(config, (modConfig) => {
    let { contents } = modConfig.modResults;

    if (!contents.includes(PACKAGE_IMPORT)) {
      contents = contents.replace(
        /(import com\.facebook\.react\.PackageList\n)/,
        `$1${PACKAGE_IMPORT}\n`
      );
    }

    if (!contents.includes(PACKAGE_ADD_LINE)) {
      contents = contents.replace(
        /(PackageList\(this\)\.packages\.apply\s*\{\n)/,
        `$1              ${PACKAGE_ADD_LINE}\n`
      );
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

module.exports = function withPcmAudioPlayer(config) {
  config = copyNativeModuleSources(config);
  config = registerPackageInMainApplication(config);
  return config;
};
