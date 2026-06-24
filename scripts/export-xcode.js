#!/usr/bin/env node
/**
 * Export Vagus Planner to Xcode via Capacitor.
 *
 * Flow:
 *   1. npm run build — Next.js production build (NiskBuild shell)
 *   2. npm run build — Vagus Planner Vite app (builder source → dist/)
 *   3. Copy dist into mobile/vagus-planner/www and cap sync ios
 *   4. Open ios/App/App.xcworkspace in Xcode
 *
 * Usage:
 *   node scripts/export-xcode.js
 *   node scripts/export-xcode.js --skip-open   # skip opening Xcode
 *
 * Requires macOS + Xcode for the final open step.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VP_APP = path.join(ROOT, 'apps', 'vagus-planner');
const VP_DIST = path.join(VP_APP, 'dist');
const CAP_DIR = path.join(ROOT, 'mobile', 'vagus-planner');
const WWW_DIR = path.join(CAP_DIR, 'www');
const IOS_WORKSPACE = path.join(CAP_DIR, 'ios', 'App', 'App.xcworkspace');

const skipOpen = process.argv.includes('--skip-open');

function log(step, message) {
  console.log(`\n[${step}] ${message}`);
}

function run(cmd, cwd = ROOT, env = {}) {
  console.log(`  → ${cmd}`);
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
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
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
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
      scripts: {
        sync: 'cap sync ios',
        open: 'cap open ios',
      },
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
    server: {
      androidScheme: 'https',
    },
  });

  if (!fs.existsSync(path.join(CAP_DIR, 'node_modules'))) {
    run('npm install', CAP_DIR);
  }
}

function openXcode() {
  if (skipOpen) {
    log('4/4', 'Skipping Xcode open (--skip-open).');
    return;
  }

  if (process.platform !== 'darwin') {
    console.warn('\n⚠️  Not on macOS — skipping Xcode open.');
    console.warn(`   Open manually: ${IOS_WORKSPACE}`);
    return;
  }

  if (fs.existsSync(IOS_WORKSPACE)) {
    execSync(`open "${IOS_WORKSPACE}"`, { stdio: 'inherit' });
    return;
  }

  run('npx cap open ios', CAP_DIR);
}

function main() {
  log('1/4', 'Building Next.js app (npm run build)…');
  run('npm run build', ROOT);

  log('2/4', 'Building Vagus Planner Vite app for Capacitor…');
  run('npm run build', VP_APP, { CAPACITOR_BUILD: '1' });

  if (!fs.existsSync(path.join(VP_DIST, 'index.html'))) {
    throw new Error(`Vite build did not produce index.html at ${VP_DIST}`);
  }

  log('3/4', 'Copying web assets into Capacitor project…');
  ensureCapacitorProject();
  rmrf(WWW_DIR);
  copyDir(VP_DIST, WWW_DIR);

  const iosDir = path.join(CAP_DIR, 'ios');
  if (!fs.existsSync(iosDir)) {
    log('3/4', 'Creating iOS platform (first run)…');
    run('npx cap add ios', CAP_DIR);
  }

  run('npx cap sync ios', CAP_DIR);

  log('4/4', 'Opening Xcode…');
  openXcode();

  console.log('\n✅ Vagus Planner Xcode export complete.');
  console.log(`   Web assets:  ${WWW_DIR}`);
  console.log(`   iOS project: ${IOS_WORKSPACE}`);
  console.log('\nNext steps in Xcode:');
  console.log('   • Select your Team under Signing & Capabilities');
  console.log('   • Product → Archive when ready for App Store submission');
}

try {
  main();
} catch (error) {
  console.error('\n❌ Export failed:', error.message || error);
  process.exit(1);
}
