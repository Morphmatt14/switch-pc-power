const { recordHeartbeat, dequeueCommand, logActivity } = require('../_lib/store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const deviceId = (req.query?.deviceId || req.body?.deviceId || '').trim();
  const hostname = (req.query?.hostname || req.body?.hostname || 'Remote PC').trim();

  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'deviceId is required' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

  // Record heartbeat
  await recordHeartbeat(deviceId, hostname, clientIp);

  // Check for queued command
  const cmd = await dequeueCommand(deviceId);
  if (cmd) {
    await logActivity('AGENT_CMD', `Dispatched "${cmd.command}" to ${hostname} (${deviceId})`, true);
    return res.status(200).json({
      success: true,
      command: cmd.command,
      delay: cmd.delay || 10,
      mac: cmd.mac || null,
      broadcast: cmd.broadcast || null,
      targetName: cmd.targetName || null
    });
  }

  return res.status(200).json({
    success: true,
    command: 'none'
  });
};
