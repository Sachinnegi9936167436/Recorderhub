const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
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

  await redis.del('cache:calls:latest');
  console.log('Redis cache:calls:latest cleared successfully!');
}

refreshCache().catch(console.error);
