const { getActivityLog } = require('./_lib/store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const logs = await getActivityLog();
  return res.status(200).json({
    success: true,
    activity: logs
  });
};
