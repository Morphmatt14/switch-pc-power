const { getDevices, queueCommand, setShutdownState, logActivity } = require('./_lib/store');

const SECRET_PIN = (process.env.SECRET_PIN || '1234').trim();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const pin = req.body?.pin || req.headers['x-secret-pin'] || req.query?.pin;
  if (String(pin).trim() !== SECRET_PIN) {
    return res.status(403).json({ success: false, error: 'Invalid security PIN. Access denied.' });
  }

  const { deviceId, delay: rawDelay } = req.body || {};
  const delay = parseInt(rawDelay, 10) || 10;
  const devices = await getDevices();

  let targetDevice = devices.find(d => d.id === deviceId);
  if (!targetDevice) targetDevice = devices[0];

  // Set countdown state
  await setShutdownState(targetDevice.id, delay);

  // Queue command for the target PC's background agent
  await queueCommand(targetDevice.id, {
    command: 'shutdown',
    delay,
    targetName: targetDevice.name,
    timestamp: Date.now()
  });

  await logActivity('POWER_OFF', `Shutdown queued for ${targetDevice.name} (${delay}s delay)`, true);

  return res.status(200).json({
    success: true,
    deviceName: targetDevice.name,
    message: `Shutdown initiated for ${targetDevice.name}. Power off in ${delay} seconds.`,
    delaySeconds: delay
  });
};
