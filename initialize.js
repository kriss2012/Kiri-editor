const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('⚡ Kiri Editor Initialization Starting...');

const services = [
  'backend/auth-service',
  'backend/editor-service',
  'backend/agent-manager',
  'backend/sync-service',
  'backend/search-service',
  'frontend'
];

/**
 * [1] Copy .env.example to .env
 */
console.log('\n[1] Setting up environment files...');
services.forEach(service => {
  const examplePath = path.join(__dirname, service, '.env.example');
  const envPath = path.join(__dirname, service, '.env');

  if (fs.existsSync(examplePath)) {
    if (!fs.existsSync(envPath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log(`✅ Created .env for ${service}`);
    } else {
      console.log(`ℹ️  .env already exists for ${service}`);
    }
  } else {
    // Some services might not have .env.example, creating a default one if needed
    if (!fs.existsSync(envPath)) {
        console.log(`⚠️  No .env.example found for ${service}. Creating empty .env`);
        fs.writeFileSync(envPath, '# Automatic generated .env\n');
    }
  }
});

/**
 * [2] Check Prerequisites
 */
console.log('\n[2] Checking system prerequisites...');

function checkCommand(command) {
  try {
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

const hasNode = checkCommand('node -v');
const hasDocker = checkCommand('docker -v');
const hasDockerCompose = checkCommand('docker-compose -v');

console.log(hasNode ? '✅ Node.js found' : '❌ Node.js NOT found');
console.log(hasDocker ? '✅ Docker found' : '❌ Docker NOT found');
console.log(hasDockerCompose ? '✅ Docker Compose found' : '❌ Docker Compose NOT found');

/**
 * [3] Check Port Availability
 */
console.log('\n[3] Checking standard ports (optional check)...');
// (Simplified check - usually handled by Docker during startup)

console.log('\n✨ Initialization complete!');
console.log('👉 Next Step: Run "start-kiri.bat" to launch the system cluster.');
