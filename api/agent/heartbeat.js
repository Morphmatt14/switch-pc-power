const { recordHeartbeat } = require('../_lib/store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const deviceId = req.body?.deviceId || req.query?.deviceId;
  const hostname = req.body?.hostname || req.query?.hostname || 'PC';
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'deviceId is required' });
  }

  await recordHeartbeat(deviceId, hostname, clientIp);
  return res.status(200).json({ success: true, timestamp: Date.now() });
};
