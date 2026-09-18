const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const path = require('path');
const fs = require('fs');

const envLocalPath = path.resolve(__dirname, '../apps/web/.env.local');
if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
} else {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const { Redis } = require('@upstash/redis');

async function refreshCache() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const keys = [
    'cache:calls:latest',
    'cache:auth:counselors',
    'cache:teams:list',
    'cache:dashboard:summary',
  ];

  for (const key of keys) {
    await redis.del(key);
    console.log(`✓ Cleared: ${key}`);
  }

  console.log('\n🚀 All Upstash Redis caches cleared! Next dashboard reload will fetch fresh live data from MongoDB.');
}

refreshCache().catch(console.error);
