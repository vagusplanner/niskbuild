#!/usr/bin/env node
/**
 * Vagus Planner App Store export — builds web bundle, Capacitor iOS project,
 * optional .ipa, and Xcode project zip for download.
 *
 * Usage:
 *   node scripts/export-app-store.js
 *   node scripts/export-app-store.js --json --skip-open
 *   node scripts/export-app-store.js --build-ipa --zip-project
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VP_APP = path.join(ROOT, 'apps', 'vagus-planner');
const VP_DIST = path.join(VP_APP, 'dist');
const CAP_DIR = path.join(ROOT, 'mobile', 'vagus-planner');
const WWW_DIR = path.join(CAP_DIR, 'www');
const EXPORT_DIR = path.join(CAP_DIR, 'export');
const IOS_WORKSPACE = path.join(CAP_DIR, 'ios', 'App', 'App.xcworkspace');
const IOS_PROJECT = path.join(CAP_DIR, 'ios');
const MANIFEST_PATH = path.join(EXPORT_DIR, 'export-manifest.json');

const flags = {
  json: process.argv.includes('--json'),
  skipOpen: process.argv.includes('--skip-open'),
  buildIpa: process.argv.includes('--build-ipa'),
  zipProject: process.argv.includes('--zip-project'),
};

function log(step, message) {
  console.log(`\n[${step}] ${message}`);
}

function run(cmd, cwd = ROOT, env = {}) {
  console.log(`  → ${cmd}`);
  execSync(cmd, {
    cwd,
    stdio: flags.json ? 'pipe' : 'inherit',
    env: { ...process.env, ...env },
  });
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing build output: ${src}`);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function ensureCapacitorProject() {
  fs.mkdirSync(CAP_DIR, { recursive: true });

  const pkgPath = path.join(CAP_DIR, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    writeJson(pkgPath, {
      name: 'vagus-planner-mobile',
      private: true,
      version: '1.0.0',
      scripts: { sync: 'cap sync ios', open: 'cap open ios' },
      dependencies: {
        '@capacitor/core': '^7.2.0',
        '@capacitor/cli': '^7.2.0',
        '@capacitor/ios': '^7.2.0',
      },
    });
  }

  writeJson(path.join(CAP_DIR, 'capacitor.config.json'), {
    appId: 'com.niskbuild.vagusplanner',
    appName: 'Vagus Planner',
    webDir: 'www',
    server: { androidScheme: 'https' },
  });

  if (!fs.existsSync(path.join(CAP_DIR, 'node_modules'))) {
    run('npm install', CAP_DIR);
  }
}

function writeExportOptionsPlist(plistPath) {
  const method = process.env.VP_EXPORT_METHOD || 'development';
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>${method}</string>
  <key>signingStyle</key>
  <string>automatic</string>
</dict>
</plist>
`;
  fs.writeFileSync(plistPath, content, 'utf8');
}

function buildIpa() {
  if (process.platform !== 'darwin') {
    return { path: null, error: 'IPA export requires macOS with Xcode.' };
  }

  if (!fs.existsSync(IOS_WORKSPACE)) {
    return { path: null, error: 'Xcode workspace not found. Run cap sync first.' };
  }

  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const archivePath = path.join(EXPORT_DIR, 'App.xcarchive');
  const ipaStaging = path.join(EXPORT_DIR, 'ipa-staging');
  const plistPath = path.join(EXPORT_DIR, 'ExportOptions.plist');
  const finalIpa = path.join(EXPORT_DIR, 'vagus-planner.ipa');

  writeExportOptionsPlist(plistPath);

  const teamId = process.env.APPLE_TEAM_ID || process.env.DEVELOPMENT_TEAM || '';
  const scheme = process.env.VP_XCODE_SCHEME || 'App';
  const provisioning =
    process.env.VP_XCODE_ALLOW_PROVISIONING === '1' ? '-allowProvisioningUpdates' : '';

  try {
    rmrf(archivePath);
    rmrf(ipaStaging);
    rmrf(finalIpa);

    let archiveCmd =
      `xcodebuild -workspace "${IOS_WORKSPACE}" -scheme ${scheme} -configuration Release ` +
      `-archivePath "${archivePath}" archive CODE_SIGN_STYLE=Automatic`;
    if (teamId) archiveCmd += ` DEVELOPMENT_TEAM=${teamId}`;
    if (provisioning) archiveCmd += ` ${provisioning}`;

    execSync(archiveCmd, { stdio: flags.json ? 'pipe' : 'inherit' });

    fs.mkdirSync(ipaStaging, { recursive: true });
    let exportCmd =
      `xcodebuild -exportArchive -archivePath "${archivePath}" ` +
      `-exportPath "${ipaStaging}" -exportOptionsPlist "${plistPath}"`;
    if (provisioning) exportCmd += ` ${provisioning}`;

    execSync(exportCmd, { stdio: flags.json ? 'pipe' : 'inherit' });

    const ipaFile = fs.readdirSync(ipaStaging).find((f) => f.endsWith('.ipa'));
    if (!ipaFile) {
      return { path: null, error: 'xcodebuild export did not produce an .ipa file.' };
    }

    fs.copyFileSync(path.join(ipaStaging, ipaFile), finalIpa);
    return { path: finalIpa, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      path: null,
      error: `IPA build failed. Set APPLE_TEAM_ID and VP_XCODE_ALLOW_PROVISIONING=1, or archive in Xcode. ${message}`,
    };
  }
}

function zipXcodeProject() {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const zipPath = path.join(EXPORT_DIR, 'vagus-planner-ios.zip');
  rmrf(zipPath);

  if (!fs.existsSync(IOS_PROJECT)) {
    throw new Error('iOS project folder missing — cap sync may have failed.');
  }

  run(
    `zip -rq "${zipPath}" ios capacitor.config.json www package.json`,
    CAP_DIR
  );

  return zipPath;
}

function openXcode() {
  if (flags.skipOpen) return;

  if (process.platform !== 'darwin') {
    console.warn(`\n⚠️  Not on macOS — open manually: ${IOS_WORKSPACE}`);
    return;
  }

  if (fs.existsSync(IOS_WORKSPACE)) {
    execSync(`open "${IOS_WORKSPACE}"`, { stdio: 'inherit' });
    return;
  }

  run('npx cap open ios', CAP_DIR);
}

function main() {
  const startedAt = new Date().toISOString();
  const result = {
    success: false,
    startedAt,
    finishedAt: null,
    workspace: IOS_WORKSPACE,
    ipaPath: null,
    ipaAvailable: false,
    ipaError: null,
    xcodeZipPath: null,
    xcodeZipAvailable: false,
    manifestPath: MANIFEST_PATH,
  };

  log('1/5', 'Building Next.js app (npm run build)…');
  run('npm run build', ROOT);

  log('2/5', 'Building Vagus Planner Vite app for Capacitor…');
  run('npm run build', VP_APP, { CAPACITOR_BUILD: '1' });

  if (!fs.existsSync(path.join(VP_DIST, 'index.html'))) {
    throw new Error(`Vite build did not produce index.html at ${VP_DIST}`);
  }

  log('3/5', 'Creating Capacitor project and syncing iOS…');
  ensureCapacitorProject();
  rmrf(WWW_DIR);
  copyDir(VP_DIST, WWW_DIR);

  if (!fs.existsSync(IOS_PROJECT)) {
    run('npx cap add ios', CAP_DIR);
  }

  run('npx cap sync ios', CAP_DIR);

  log('4/5', 'Packaging Xcode project…');
  if (flags.zipProject || flags.json) {
    result.xcodeZipPath = zipXcodeProject();
    result.xcodeZipAvailable = fs.existsSync(result.xcodeZipPath);
  }

  if (flags.buildIpa) {
    log('5/5', 'Building .ipa for App Store / TestFlight…');
    const ipa = buildIpa();
    result.ipaPath = ipa.path;
    result.ipaAvailable = !!ipa.path;
    result.ipaError = ipa.error;
  } else {
    log('5/5', 'Skipping .ipa (pass --build-ipa to generate).');
  }

  if (!flags.skipOpen) openXcode();

  result.success = true;
  result.finishedAt = new Date().toISOString();
  writeJson(MANIFEST_PATH, result);

  if (flags.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log('\n✅ Vagus Planner App Store export complete.');
    console.log(`   Xcode workspace: ${IOS_WORKSPACE}`);
    if (result.xcodeZipAvailable) console.log(`   iOS zip:         ${result.xcodeZipPath}`);
    if (result.ipaAvailable) console.log(`   IPA:             ${result.ipaPath}`);
    else if (result.ipaError) console.warn(`   IPA skipped:     ${result.ipaError}`);
  }

  return result;
}

try {
  main();
} catch (error) {
  const payload = {
    success: false,
    error: error instanceof Error ? error.message : String(error),
    finishedAt: new Date().toISOString(),
  };
  if (flags.json) {
    console.log(JSON.stringify(payload));
  } else {
    console.error('\n❌ Export failed:', payload.error);
  }
  process.exit(1);
}
