const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- DineFlow Monorepo Unified Build ---');

try {
  // 1. Compile the React frontend
  console.log('Step 1: Compiling React frontend...');
  execSync('npm run build --prefix frontend', { stdio: 'inherit' });

  // 2. Resolve source and destination directories
  const src = path.join(__dirname, '../frontend/dist');
  const dest = path.join(__dirname, '../dist');

  // 3. Clear existing root dist folder
  if (fs.existsSync(dest)) {
    console.log('Cleaning existing root dist directory...');
    fs.rmSync(dest, { recursive: true, force: true });
  }

  // 4. Copy recursively
  console.log(`Step 2: Copying compiled static files from ${src} to ${dest}...`);
  copyDir(src, dest);
  console.log('✔ Build completed successfully!');

} catch (err) {
  console.error('❌ Build failed with error:', err.message);
  process.exit(1);
}

// Helper function to recursively copy files
function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
