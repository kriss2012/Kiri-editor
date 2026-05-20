const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tempDir = path.join(__dirname, 'temp-pack');
const targetAsar = path.join(__dirname, 'dist', 'win-unpacked', 'resources', 'app.asar');

console.log('📦 [Kiri Pack] Starting native Electron ASAR pack...');

// 1. Clean and create temp-pack folder
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

// Helper to copy directory recursively with exclusions
function copyDir(src, dest, excludes = []) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    if (excludes.includes(entry.name)) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' && src === __dirname) {
        continue;
      }
      if (entry.name === 'temp-pack' || entry.name === 'dist' || entry.name === 'frontend' || entry.name === '.git') {
        continue;
      }
      copyDir(srcPath, destPath, excludes);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Copy main.js and package.json
fs.copyFileSync(path.join(__dirname, 'main.js'), path.join(tempDir, 'main.js'));
fs.copyFileSync(path.join(__dirname, 'package.json'), path.join(tempDir, 'package.json'));

// 3. Copy server and frontend/dist
console.log('⚡ [Kiri Pack] Copying Express server assets...');
copyDir(path.join(__dirname, 'server'), path.join(tempDir, 'server'));

console.log('⚡ [Kiri Pack] Copying Vite compiled client assets...');
copyDir(path.join(__dirname, 'frontend', 'dist'), path.join(tempDir, 'frontend', 'dist'));

// 4. Copy build/icon.png if it exists
if (fs.existsSync(path.join(__dirname, 'build'))) {
  console.log('⚡ [Kiri Pack] Copying logo assets...');
  copyDir(path.join(__dirname, 'build'), path.join(tempDir, 'build'));
}

// 5. Install production dependencies in staging environment offline (extremely fast & lightweight!)
console.log('⚡ [Kiri Pack] Staging production dependencies offline...');
try {
  execSync('npm install --omit=dev --no-audit --no-fund --offline', { cwd: tempDir, stdio: 'inherit' });
  console.log('✅ [Kiri Pack] Production dependencies staged successfully!');
} catch (err) {
  console.error('❌ [Kiri Pack] Staging installation failed:', err);
}

// 6. Run asar pack
console.log('⚡ [Kiri Pack] Compiling resources into app.asar...');
try {
  execSync(`npx asar pack "${tempDir}" "${targetAsar}"`, { stdio: 'inherit' });
  console.log('✅ [Kiri Pack] app.asar compiled and written successfully!');
} catch (err) {
  console.error('❌ [Kiri Pack] Failed to pack app.asar:', err);
}

// 7. Cleanup temp folder
fs.rmSync(tempDir, { recursive: true, force: true });
console.log('🧹 [Kiri Pack] Staging cleanup completed successfully!');
