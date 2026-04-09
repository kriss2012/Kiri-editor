const { execSync } = require('child_process');
const http = require('http');

console.log('🩺 Kiri System Doctor — Running Diagnostics...');
console.log('─────────────────────────────────────────────');

function checkDocker() {
  try {
    const containers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' });
    const active = containers.split('\n').filter(Boolean);
    console.log(`🐳 Docker Containers: ${active.length} active`);
    active.forEach(name => console.log(`   - ${name}`));
    return active;
  } catch (err) {
    console.log('❌ Docker check failed. Engine might be offline.');
    return [];
  }
}

async function checkService(url, name) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      console.log(`✅ ${name.padEnd(15)}: Online (Status: ${res.statusCode})`);
      resolve(true);
    });
    req.on('error', () => {
      console.log(`❌ ${name.padEnd(15)}: Offline`);
      resolve(false);
    });
    req.setTimeout(2000, () => {
      req.destroy();
      console.log(`⚠️  ${name.padEnd(15)}: Timeout`);
      resolve(false);
    });
  });
}

async function run() {
  const containers = checkDocker();
  
  if (containers.length > 0) {
    console.log('\n🔍 Pinging Microservices Cluster...');
    await checkService('http://localhost:80', 'Gateway (Nginx)');
    await checkService('http://localhost:3001/health', 'Auth Service');
    await checkService('http://localhost:3002/api/health', 'Editor Service');
    await checkService('http://localhost:3003/health', 'Agent Manager');
    await checkService('http://localhost:3005/api/health', 'Search Service');
  } else {
    console.log('\n⚠️  No Kiri containers are running. Run "start-kiri.bat" first.');
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('🏁 Diagnostics complete.');
}

run();
