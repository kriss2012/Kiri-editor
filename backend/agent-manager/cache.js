const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => console.log('✅ Connected to Redis'));
redis.on('error', (err) => console.error('❌ Redis Connection Error:', err));

/**
 * Cache helper for agent results
 */
async function getCachedResult(agentType, fileId, inputHash) {
  const key = `agent:${agentType}:${fileId}:${inputHash}`;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('[Redis] Get Error:', err);
    return null;
  }
}

async function setCachedResult(agentType, fileId, inputHash, result) {
  const key = `agent:${agentType}:${fileId}:${inputHash}`;
  try {
    // Cache for 1 hour (3600 seconds)
    await redis.set(key, JSON.stringify(result), 'EX', 3600);
  } catch (err) {
    console.error('[Redis] Set Error:', err);
  }
}

module.exports = {
  redis,
  getCachedResult,
  setCachedResult
};
