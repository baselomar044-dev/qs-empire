// QS Empire Email - Powered by Resend
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subject, body, to } = req.body;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const OWNER_EMAIL = process.env.OWNER_EMAIL || 'basel.omar.qs@gmail.com';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'QS Empire <onboarding@resend.dev>',
        to: [to || OWNER_EMAIL],
        subject: subject || '🏗️ QS Empire Report',
        html: body || '<p>No content</p>'
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return res.status(200).json({ 
      success: true,
      messageId: data.id,
      sentTo: to || OWNER_EMAIL
    });

  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ 
      error: 'حدث خطأ في إرسال الإيميل',
      details: error.message 
    });
  }
}
