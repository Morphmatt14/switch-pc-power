const { getDevices, queueCommand, logActivity } = require('./_lib/store');

const SECRET_PIN = (process.env.SECRET_PIN || '1234').trim();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const pin = req.body?.pin || req.headers['x-secret-pin'] || req.query?.pin;
  if (String(pin).trim() !== SECRET_PIN) {
    return res.status(403).json({ success: false, error: 'Invalid security PIN. Access denied.' });
  }

  const { deviceId, mac, broadcast } = req.body || {};
  const devices = await getDevices();

  let targetDevice = devices.find(d => d.id === deviceId);
  if (!targetDevice) {
    targetDevice = devices[0];
  }

  const targetMac = mac || targetDevice.mac;
  const targetBroadcast = broadcast || targetDevice.broadcast || '192.168.254.255';

  // Queue Wake-on-LAN instruction for the local Host PC Bridge (Morphy PC)
  await queueCommand('morphy-host', {
    command: 'wake',
    targetId: targetDevice.id,
    targetName: targetDevice.name,
    mac: targetMac,
    broadcast: targetBroadcast,
    timestamp: Date.now()
  });

  await logActivity('POWER_ON (WoL)', `Queued Wake-on-LAN packet for ${targetDevice.name} (${targetMac}) via Host Bridge`, true);

  return res.status(200).json({
    success: true,
    message: `Wake-on-LAN Magic Packet dispatched to local network bridge for ${targetDevice.name}`,
    targetMac,
    targetName: targetDevice.name,
    timestamp: new Date().toISOString()
  });
};
