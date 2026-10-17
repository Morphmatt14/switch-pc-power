/**
 * SWITCH - Cloud State Store for Vercel Serverless Functions
 * Supports Upstash Redis / Vercel KV REST API with robust in-memory fallback.
 */

const DEFAULT_DEVICES = [
  {
    id: 'morphy-host',
    name: 'Morphy PC (Host Windows 11)',
    mac: 'F4:B5:20:7A:FA:EF',
    ip: '192.168.254.101',
    broadcast: '192.168.254.255',
    adapter: 'Realtek PCIe GbE Family Controller',
    isHost: true
  },
  {
    id: 'rhu-it-pc',
    name: 'RHU IT Gaming PC',
    mac: 'A0:AD:9F:11:59:55',
    ip: '192.168.68.62',
    broadcast: '192.168.68.255',
    adapter: 'Realtek Gaming 2.5GbE Family Controller',
    isHost: false
  }
];

// In-Memory cache (persists during warm serverless function instances)
const memoryState = {
  devices: [...DEFAULT_DEVICES],
  agents: {},          // deviceId -> { lastSeen, hostname, ip }
  commands: {},        // deviceId -> { command, delay, mac, broadcast, timestamp }
  shutdownStates: {},  // deviceId -> { pending, initiatedAt, delaySeconds }
  activityLog: []      // [{ id, timestamp, action, details, success }]
};

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || null;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || null;

/**
 * Perform raw Upstash / Vercel KV REST call
 */
async function kvCommand(cmd, ...args) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const url = `${KV_URL}/${cmd}/${args.map(encodeURIComponent).join('/')}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result;
  } catch (err) {
    console.warn('[STORE] KV error:', err.message);
    return null;
  }
}

/**
 * Get full state from KV or in-memory
 */
async function getState() {
  if (KV_URL && KV_TOKEN) {
    try {
      const raw = await kvCommand('get', 'switch_state');
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        // Merge into memory
        Object.assign(memoryState, parsed);
        return memoryState;
      }
    } catch (e) {}
  }
  return memoryState;
}

/**
 * Save state back to KV
 */
async function saveState() {
  if (KV_URL && KV_TOKEN) {
    try {
      await kvCommand('set', 'switch_state', JSON.stringify(memoryState));
    } catch (e) {}
  }
}

/**
 * Get registered devices
 */
async function getDevices() {
  const state = await getState();
  if (!state.devices || state.devices.length === 0) {
    state.devices = [...DEFAULT_DEVICES];
  }
  return state.devices;
}

/**
 * Save devices
 */
async function saveDevices(devices) {
  const state = await getState();
  state.devices = devices;
  await saveState();
}

/**
 * Record agent heartbeat
 */
async function recordHeartbeat(deviceId, hostname, clientIp) {
  const state = await getState();
  if (!state.agents) state.agents = {};
  state.agents[deviceId] = {
    lastSeen: Date.now(),
    hostname: hostname || 'PC',
    ip: clientIp || null
  };
  await saveState();
}

/**
 * Get connected agents
 */
async function getAgents() {
  const state = await getState();
  return state.agents || {};
}

/**
 * Queue a command for an agent
 */
async function queueCommand(deviceId, commandData) {
  const state = await getState();
  if (!state.commands) state.commands = {};
  state.commands[deviceId] = {
    ...commandData,
    timestamp: Date.now()
  };
  await saveState();
}

/**
 * Poll and dequeue command for a device
 */
async function dequeueCommand(deviceId) {
  const state = await getState();
  if (!state.commands || !state.commands[deviceId]) {
    return null;
  }
  const cmd = state.commands[deviceId];
  delete state.commands[deviceId];
  await saveState();
  return cmd;
}

/**
 * Set shutdown countdown state
 */
async function setShutdownState(deviceId, delaySeconds) {
  const state = await getState();
  if (!state.shutdownStates) state.shutdownStates = {};
  state.shutdownStates[deviceId] = {
    pending: true,
    initiatedAt: Date.now(),
    delaySeconds: delaySeconds || 10
  };
  await saveState();
}

/**
 * Clear shutdown state
 */
async function clearShutdownState(deviceId) {
  const state = await getState();
  if (state.shutdownStates && state.shutdownStates[deviceId]) {
    delete state.shutdownStates[deviceId];
    await saveState();
  }
}

/**
 * Get active shutdown states
 */
async function getShutdownStates() {
  const state = await getState();
  const now = Date.now();
  const active = {};
  if (state.shutdownStates) {
    for (const [id, s] of Object.entries(state.shutdownStates)) {
      const elapsed = Math.floor((now - s.initiatedAt) / 1000);
      const remaining = s.delaySeconds - elapsed;
      if (remaining > 0) {
        active[id] = {
          pending: true,
          remainingSeconds: remaining,
          delaySeconds: s.delaySeconds
        };
      } else {
        delete state.shutdownStates[id];
      }
    }
  }
  return active;
}

/**
 * Log activity
 */
async function logActivity(action, details, success = true) {
  const state = await getState();
  if (!state.activityLog) state.activityLog = [];
  const entry = {
    id: Date.now() + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    action,
    details,
    success
  };
  state.activityLog.unshift(entry);
  if (state.activityLog.length > 50) {
    state.activityLog.pop();
  }
  await saveState();
  return entry;
}

/**
 * Get activity log
 */
async function getActivityLog() {
  const state = await getState();
  return state.activityLog || [];
}

module.exports = {
  getDevices,
  saveDevices,
  recordHeartbeat,
  getAgents,
  queueCommand,
  dequeueCommand,
  setShutdownState,
  clearShutdownState,
  getShutdownStates,
  logActivity,
  getActivityLog
};
