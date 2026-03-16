/* global __dirname */
const fs = require('fs');
const path = require('path');

const moduleDir = path.join(__dirname, '..', 'node_modules', 'expo-module-scripts');
const sourcePath = path.join(moduleDir, 'tsconfig.base.json');
const compatPath = path.join(moduleDir, 'tsconfig.base');
const nodeModulesDir = path.join(__dirname, '..', 'node_modules');

const ensurePackageLocalCompat = (packageName) => {
  const localCompatDir = path.join(
    nodeModulesDir,
    packageName,
    'node_modules',
    'expo-module-scripts'
  );

  fs.mkdirSync(localCompatDir, { recursive: true });
  fs.copyFileSync(sourcePath, path.join(localCompatDir, 'tsconfig.base'));
  fs.copyFileSync(sourcePath, path.join(localCompatDir, 'tsconfig.base.json'));
};

const patchExpoPackageTsconfig = () => {
  if (!fs.existsSync(nodeModulesDir)) return;

  const packageNames = fs.readdirSync(nodeModulesDir);
  for (const packageName of packageNames) {
    if (!packageName.startsWith('expo-')) continue;

    const tsconfigPath = path.join(nodeModulesDir, packageName, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) continue;

    ensurePackageLocalCompat(packageName);

    const original = fs.readFileSync(tsconfigPath, 'utf8');
    let patched = original.replace(
      /"extends"\s*:\s*"(?:\.\.\/)?expo-module-scripts\/tsconfig\.base(?:\.json)?"/,
      '"extends": "../expo-module-scripts/tsconfig.base.json"'
    );

    if (packageName === 'expo-modules-core' && !patched.includes('"declaration": true')) {
      patched = patched.replace(
        /"outDir"\s*:\s*"\.\/build",\s*\n\s*"emitDeclarationOnly"\s*:\s*true/,
        '"outDir": "./build",\n    "declaration": true,\n    "emitDeclarationOnly": true'
      );
    }

    if (patched !== original) {
      fs.writeFileSync(tsconfigPath, patched, 'utf8');
      console.log(`[postinstall] normalized ${packageName}/tsconfig.json extends path to relative file.`);
    }
  }
};

if (!fs.existsSync(moduleDir)) {
  process.exit(0);
}

if (!fs.existsSync(sourcePath)) {
  console.warn('[postinstall] expo-module-scripts tsconfig.base.json not found; skipping compatibility fix.');
  process.exit(0);
}

if (!fs.existsSync(compatPath)) {
  fs.copyFileSync(sourcePath, compatPath);
  console.log('[postinstall] created expo-module-scripts/tsconfig.base compatibility file.');
}

patchExpoPackageTsconfig();
