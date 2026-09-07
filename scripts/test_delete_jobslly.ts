const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: 'apps/web/.env.local' });

async function testDelete() {
  const { deleteCounselorCascade } = require('./apps/web/src/lib/counselor-actions.ts');
  const res = await deleteCounselorCascade('jobslly@academically.com');
  console.log('Cascade deletion result for Jobslly:', res);
}

// Since counselor-actions is TS, let's use ts-node or run via node with ts-node/register or inline
