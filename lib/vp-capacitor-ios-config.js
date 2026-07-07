/**
 * Shared Capacitor iOS shell config for Vagus Planner exports.
 * Used by export-app-store.js, export-xcode.js, and builder-export pipelines.
 */

const fs = require('fs');
const path = require('path');

const VP_CAPACITOR_APP_ID = 'com.niskbuild.vagusplanner';
const VP_CAPACITOR_APP_NAME = 'Vagus Planner';

/** npm deps for mobile/vagus-planner — keep in sync with cap sync requirements */
function getVpCapacitorMobileDependencies() {
  return {
    '@capacitor/core': '^7.2.0',
    '@capacitor/cli': '^7.2.0',
    '@capacitor/ios': '^7.2.0',
    '@capacitor/push-notifications': '^7.0.6',
    '@capacitor/status-bar': '^7.0.1',
    '@capacitor/local-notifications': '^7.0.1',
  };
}

/** capacitor.config.json — export scripts must write this (not a minimal stub). */
function getVpCapacitorConfig() {
  return {
    appId: VP_CAPACITOR_APP_ID,
    appName: VP_CAPACITOR_APP_NAME,
    webDir: 'www',
    server: { androidScheme: 'https' },
    plugins: {
      StatusBar: {
        overlaysWebView: false,
      },
    },
  };
}

/** iOS Info.plist usage-description keys required for native features */
const IOS_PLIST_USAGE_STRINGS = {
  NSLocationWhenInUseUsageDescription:
    'Vagus Planner uses your location to show nearby mosques, calculate accurate prayer times, and find halal restaurants near you.',
  NSMicrophoneUsageDescription:
    'Vagus Planner uses your microphone for voice journaling and voice commands.',
};

function escapePlistString(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Idempotently merge required usage strings into ios/App/App/Info.plist.
 * @param {string} plistPath
 * @returns {boolean} true if file was modified
 */
function patchVpIosInfoPlist(plistPath) {
  if (!fs.existsSync(plistPath)) {
    return false;
  }

  let content = fs.readFileSync(plistPath, 'utf8');
  let changed = false;

  for (const [key, value] of Object.entries(IOS_PLIST_USAGE_STRINGS)) {
    if (content.includes(`<key>${key}</key>`)) {
      continue;
    }
    const insertion =
      `\t<key>${key}</key>\n\t<string>${escapePlistString(value)}</string>\n`;
    if (!content.includes('</dict>')) {
      throw new Error(`Invalid Info.plist (no closing </dict>): ${plistPath}`);
    }
    content = content.replace('</dict>', `${insertion}</dict>`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(plistPath, content, 'utf8');
  }

  return changed;
}

/**
 * Default Info.plist path under a Capacitor project root.
 * @param {string} capDir
 */
function getVpIosInfoPlistPath(capDir) {
  return path.join(capDir, 'ios', 'App', 'App', 'Info.plist');
}

/**
 * Ensure mobile/vagus-planner package.json includes required Capacitor plugins.
 * @param {string} capDir
 * @param {(cmd: string, cwd: string) => void} [runInstall]
 */
function ensureVpCapacitorMobilePackage(capDir, runInstall) {
  fs.mkdirSync(capDir, { recursive: true });

  const pkgPath = path.join(capDir, 'package.json');
  const requiredDeps = getVpCapacitorMobileDependencies();

  let pkg;
  if (fs.existsSync(pkgPath)) {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } else {
    pkg = {
      name: 'vagus-planner-mobile',
      private: true,
      version: '1.0.0',
      scripts: {
        sync: 'cap sync ios',
        open: 'cap open ios',
      },
      dependencies: {},
    };
  }

  const before = JSON.stringify(pkg.dependencies ?? {});
  pkg.dependencies = { ...(pkg.dependencies ?? {}), ...requiredDeps };
  const after = JSON.stringify(pkg.dependencies);

  fs.mkdirSync(capDir, { recursive: true });
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  const nodeModules = path.join(capDir, 'node_modules');
  const needsInstall = before !== after || !fs.existsSync(nodeModules);
  if (needsInstall && typeof runInstall === 'function') {
    runInstall('npm install', capDir);
  }
}

/**
 * Write capacitor.config.json and return the path written.
 * @param {string} capDir
 */
function writeVpCapacitorConfig(capDir) {
  const configPath = path.join(capDir, 'capacitor.config.json');
  fs.mkdirSync(capDir, { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(getVpCapacitorConfig(), null, 2)}\n`, 'utf8');
  return configPath;
}

/**
 * Post-sync: patch Info.plist with location/microphone usage strings.
 * @param {string} capDir
 */
function applyVpIosNativeConfig(capDir) {
  patchVpIosInfoPlist(getVpIosInfoPlistPath(capDir));
}

module.exports = {
  VP_CAPACITOR_APP_ID,
  VP_CAPACITOR_APP_NAME,
  IOS_PLIST_USAGE_STRINGS,
  getVpCapacitorMobileDependencies,
  getVpCapacitorConfig,
  patchVpIosInfoPlist,
  getVpIosInfoPlistPath,
  ensureVpCapacitorMobilePackage,
  writeVpCapacitorConfig,
  applyVpIosNativeConfig,
};
