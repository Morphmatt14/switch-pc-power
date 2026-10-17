const { getDevices, saveDevices, getAgents, logActivity } = require('./_lib/store');

const SECRET_PIN = (process.env.SECRET_PIN || '1234').trim();

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'GET') {
    const devices = await getDevices();
    const agents = await getAgents();
    const now = Date.now();

    const enriched = devices.map(d => {
      const agent = agents[d.id];
      const isOnline = agent && (now - agent.lastSeen < 25000);
      return {
        ...d,
        agentConnected: !!isOnline,
        agentHostname: agent ? agent.hostname : null
      };
    });

    return res.status(200).json({
      success: true,
      devices: enriched
    });
  }

  // Authentication for mutations
  const pin = req.body?.pin || req.headers['x-secret-pin'] || req.query?.pin;
  if (String(pin).trim() !== SECRET_PIN) {
    return res.status(403).json({ success: false, error: 'Invalid security PIN.' });
  }

  if (req.method === 'POST') {
    const { name, mac, ip, broadcast, adapter } = req.body || {};
    if (!name || !mac) {
      return res.status(400).json({ success: false, error: 'Name and MAC Address are required.' });
    }

    const cleanMac = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (cleanMac.length !== 12) {
      return res.status(400).json({ success: false, error: 'Invalid MAC address format (must be 12 hex characters).' });
    }

    const formattedMac = cleanMac.match(/.{1,2}/g).join(':');
    const newId = 'pc-' + Date.now();
    const newDevice = {
      id: newId,
      name: name.trim(),
      mac: formattedMac,
      ip: (ip || '').trim(),
      broadcast: (broadcast || '255.255.255.255').trim(),
      adapter: (adapter || 'Network Adapter').trim(),
      isHost: false
    };

    const devices = await getDevices();
    devices.push(newDevice);
    await saveDevices(devices);
    await logActivity('DEVICE_ADD', `Added PC: ${newDevice.name} (${formattedMac})`, true);

    return res.status(200).json({ success: true, message: 'Device added', device: newDevice });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;
    if (!id) return res.status(400).json({ success: false, error: 'Device ID required.' });

    let devices = await getDevices();
    const target = devices.find(d => d.id === id);
    if (!target) return res.status(404).json({ success: false, error: 'Device not found.' });
    if (target.isHost) return res.status(400).json({ success: false, error: 'Host PC cannot be deleted.' });

    devices = devices.filter(d => d.id !== id);
    await saveDevices(devices);
    await logActivity('DEVICE_DELETE', `Removed PC: ${target.name}`, true);

    return res.status(200).json({ success: true, message: 'Device removed' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
