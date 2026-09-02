import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, copyFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {delimiter, dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(projectRoot, 'android');
const buildToolsVersion = '33.0.0';

function firstExisting(candidates, childPath) {
  return candidates.find(
    candidate => candidate && existsSync(join(candidate, childPath)),
  );
}

function detectJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
    '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
  ];

  if (process.platform === 'darwin') {
    const result = spawnSync('/usr/libexec/java_home', ['-v', '17'], {
      encoding: 'utf8',
    });
    if (result.status === 0) {
      candidates.unshift(result.stdout.trim());
    }
  }

  return firstExisting(candidates, join('bin', 'java'));
}

function detectAndroidSdk() {
  return firstExisting(
    [
      process.env.ANDROID_HOME,
      process.env.ANDROID_SDK_ROOT,
      join(homedir(), 'Library', 'Android', 'sdk'),
      join(homedir(), 'Android', 'Sdk'),
    ],
    join('platforms', 'android-33'),
  );
}

function fail(message) {
  console.error(`\n[build:app] ${message}\n`);
  process.exit(1);
}

const javaHome = detectJavaHome();
if (!javaHome) {
  fail('JDK 17 not found. On macOS run: brew install openjdk@17');
}

const androidSdk = detectAndroidSdk();
if (!androidSdk) {
  fail(
    'Android SDK API 33 not found. Install it with sdkmanager before building.',
  );
}

const gradleCommand =
  process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const sourceApk = join(
  androidDir,
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);
const buildGradle = readFileSync(
  join(androidDir, 'app', 'build.gradle'),
  'utf8',
);
const versionName =
  buildGradle.match(/versionName\s+["']([^"']+)["']/)?.[1] ?? 'test';
const artifactDir = join(projectRoot, 'artifacts');
const artifactApk = join(artifactDir, `DeepTutor-${versionName}-android.apk`);
const apksigner = join(
  androidSdk,
  'build-tools',
  buildToolsVersion,
  process.platform === 'win32' ? 'apksigner.bat' : 'apksigner',
);

if (!existsSync(apksigner)) {
  fail(`Android Build Tools ${buildToolsVersion} not found at ${apksigner}`);
}

console.log(`[build:app] JAVA_HOME=${javaHome}`);
console.log(`[build:app] ANDROID_HOME=${androidSdk}`);
console.log('[build:app] Building standalone Android test APK...');

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidSdk,
  ANDROID_SDK_ROOT: androidSdk,
  PATH: `${join(javaHome, 'bin')}${delimiter}${process.env.PATH ?? ''}`,
};

const build = spawnSync(gradleCommand, ['assembleRelease'], {
  cwd: androidDir,
  env,
  stdio: 'inherit',
});

if (build.status !== 0) {
  fail(`Gradle failed with exit code ${build.status ?? 'unknown'}`);
}

if (!existsSync(sourceApk)) {
  fail(`Gradle completed but no APK was found at ${sourceApk}`);
}

mkdirSync(artifactDir, {recursive: true});
copyFileSync(sourceApk, artifactApk);

const verify = spawnSync(apksigner, ['verify', '--verbose', artifactApk], {
  env,
  encoding: 'utf8',
});

if (verify.status !== 0 || !verify.stdout.includes('Verifies')) {
  fail(`APK signature verification failed:\n${verify.stderr || verify.stdout}`);
}

const checksum = createHash('sha256')
  .update(readFileSync(artifactApk))
  .digest('hex');

console.log('\n[build:app] Build successful');
console.log(`[build:app] APK: ${artifactApk}`);
console.log(`[build:app] SHA-256: ${checksum}`);
console.log(
  '[build:app] Signing: Android debug certificate (internal testing only)',
);
