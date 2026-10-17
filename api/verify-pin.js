const SECRET_PIN = (process.env.SECRET_PIN || '1234').trim();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { pin } = req.body || {};
  if (!pin) {
    return res.status(400).json({ success: false, error: 'PIN is required' });
  }

  if (String(pin).trim() === SECRET_PIN) {
    return res.status(200).json({ success: true, message: 'PIN verified successfully' });
  } else {
    return res.status(401).json({ success: false, error: 'Incorrect PIN' });
  }
};
