const Redis = require('ioredis');

const url = process.env.REDIS_URL;
if (!url || url.includes('dummy')) {
  console.error('ERROR: REDIS_URL in .env.local is missing or still set to dummy.');
  process.exit(1);
}

console.log('Testing Upstash TLS Connection Locally...');
console.log('URL Length: ' + url.length);
console.log('Using rediss:// TLS parameter? ' + (url.includes('rediss://') ? 'YES' : 'NO'));

console.log('\n[TEST 1] Testing with family: 0 (IPv4)...');
const c1 = new Redis(url, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  family: 0,
  tls: url.includes('rediss://') ? { rejectUnauthorized: false } : undefined,
  connectTimeout: 5000
});

c1.on('connect', () => { 
  console.log('✅ IPv4 CONNECTED SUCCESSFULLY!'); 
  c1.quit(); 
});
c1.on('error', (e) => { 
  console.log('❌ IPv4 Error:', e.message); 
  c1.quit(); 
});

setTimeout(() => {
  console.log('\n[TEST 2] Testing with family: 6 (IPv6)...');
  const c2 = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    family: 6,
    tls: url.includes('rediss://') ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 5000
  });

  c2.on('connect', () => { 
    console.log('✅ IPv6 CONNECTED SUCCESSFULLY!'); 
    c2.quit(); 
    setTimeout(() => process.exit(0), 500);
  });
  c2.on('error', (e) => { 
    console.log('❌ IPv6 Error:', e.message); 
    c2.quit(); 
    setTimeout(() => process.exit(0), 500);
  });
}, 3000);
