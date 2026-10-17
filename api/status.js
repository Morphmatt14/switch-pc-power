const { getDevices, getAgents, getShutdownStates, getActivityLog } = require('./_lib/store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const devices = await getDevices();
    const agents = await getAgents();
    const pendingShutdowns = await getShutdownStates();
    const recentActivity = await getActivityLog();
    const now = Date.now();

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'switch-power.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const cloudUrl = `${proto}://${host}`;

    const enrichedDevices = devices.map(d => {
      const agent = agents[d.id];
      const isOnline = agent && (now - agent.lastSeen < 25000);
      return {
        ...d,
        agentConnected: !!isOnline,
        agentHostname: agent ? agent.hostname : null
      };
    });

    const activeAgentsCount = Object.values(agents).filter(a => now - a.lastSeen < 25000).length;

    return res.status(200).json({
      status: 'ONLINE',
      cloud: true,
      mode: 'VERCEL_PERMANENT_CLOUD',
      cloudUrl,
      serverTime: new Date().toISOString(),
      serverTimeFormatted: new Date().toLocaleString(),
      devices: enrichedDevices,
      totalDevices: enrichedDevices.length,
      onlineDevicesCount: activeAgentsCount,
      pendingShutdowns,
      tunnel: {
        active: true,
        isPermanentCloud: true,
        publicUrl: cloudUrl
      },
      network: {
        cloudUrl,
        mode: 'Vercel Serverless Global Edge'
      },
      hostInfo: {
        platform: 'Vercel Serverless Edge',
        agentsConnected: activeAgentsCount
      },
      recentActivity: recentActivity.slice(0, 15)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
