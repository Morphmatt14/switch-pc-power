const { getDevices, queueCommand, clearShutdownState, logActivity } = require('./_lib/store');

const SECRET_PIN = (process.env.SECRET_PIN || '1234').trim();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const pin = req.body?.pin || req.headers['x-secret-pin'] || req.query?.pin;
  if (String(pin).trim() !== SECRET_PIN) {
    return res.status(403).json({ success: false, error: 'Invalid security PIN. Access denied.' });
  }

  const { deviceId } = req.body || {};
  const devices = await getDevices();
  let targetDevice = devices.find(d => d.id === deviceId);
  if (!targetDevice) targetDevice = devices[0];

  await clearShutdownState(targetDevice.id);

  // Queue abort command for target agent
  await queueCommand(targetDevice.id, {
    command: 'abort',
    targetName: targetDevice.name,
    timestamp: Date.now()
  });

  await logActivity('ABORT', `Shutdown aborted for ${targetDevice.name}`, true);

  return res.status(200).json({
    success: true,
    message: `Shutdown sequence cancelled for ${targetDevice.name}`
  });
};
