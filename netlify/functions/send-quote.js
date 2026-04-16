const nodemailer = require('nodemailer');

const buildQuoteHtml = ({ customerName, customerEmail, customerPhone, company, notes, products }) => {
  const productRows = products.map((item, index) => `
      <tr style="border-bottom:1px solid #e0e0e0;">
        <td style="padding:12px;">${index + 1}. ${item.name || item.product_title || 'Product'}</td>
        <td style="padding:12px;text-align:center;">${item.variant || item.variant_title || '-'}</td>
        <td style="padding:12px;text-align:center;">${item.sku || '-'}</td>
        <td style="padding:12px;text-align:center;">${item.quantity}</td>
      </tr>
    `).join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#222;">
      <h1 style="margin-bottom:0.25em;color:#2c3e50;">Quote Request</h1>
      <p style="margin-top:0.5em;color:#555;">A new quote request was submitted from the website.</p>

      <section style="margin-top:24px;">
        <h2 style="font-size:18px;margin-bottom:8px;color:#2c3e50;">Customer Details</h2>
        <table cellpadding="0" cellspacing="0" style="width:100%;max-width:700px;border-collapse:collapse;">
          <tr>
            <td style="padding:10px;background:#f6f6f6;"><strong>Name</strong></td>
            <td style="padding:10px;">${customerName || '—'}</td>
          </tr>
          <tr>
            <td style="padding:10px;background:#f6f6f6;"><strong>Email</strong></td>
            <td style="padding:10px;">${customerEmail || '—'}</td>
          </tr>
          <tr>
            <td style="padding:10px;background:#f6f6f6;"><strong>Phone</strong></td>
            <td style="padding:10px;">${customerPhone || '—'}</td>
          </tr>
          <tr>
            <td style="padding:10px;background:#f6f6f6;"><strong>Company</strong></td>
            <td style="padding:10px;">${company || '—'}</td>
          </tr>
        </table>
      </section>

      <section style="margin-top:24px;">
        <h2 style="font-size:18px;margin-bottom:8px;color:#2c3e50;">Products Requested</h2>
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:700px;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:12px;text-align:left;background:#f6f6f6;border-bottom:2px solid #ddd;">Product</th>
              <th style="padding:12px;text-align:center;background:#f6f6f6;border-bottom:2px solid #ddd;">Variant</th>
              <th style="padding:12px;text-align:center;background:#f6f6f6;border-bottom:2px solid #ddd;">SKU</th>
              <th style="padding:12px;text-align:center;background:#f6f6f6;border-bottom:2px solid #ddd;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
          </tbody>
        </table>
      </section>

      <section style="margin-top:24px;">
        <h2 style="font-size:18px;margin-bottom:8px;color:#2c3e50;">Additional Notes</h2>
        <div style="padding:12px;background:#fafafa;border:1px solid #e5e5e5;white-space:pre-wrap;">
          ${notes ? notes.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'No additional notes provided.'}
        </div>
      </section>
    </div>
  `;
};

const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'Invalid JSON payload', error: error.message }),
    };
  }

  const { customerName, customerEmail, customerPhone, company, notes, products = [] } = body;

  if (!customerEmail) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'customerEmail is required' }),
    };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.verify();
  } catch (error) {
    console.error('SMTP verify failed', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'SMTP verification failed', error: error.message }),
    };
  }

  const html = buildQuoteHtml({ customerName, customerEmail, customerPhone, company, notes, products });

  const mailOptions = {
    from: `"ARIQAI Foods" <${process.env.EMAIL_USER}>`,
    to: process.env.QUOTE_RECEIVER || process.env.EMAIL_USER,
    replyTo: customerEmail,
    subject: `New Quote Request from ${customerName || 'Customer'}`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Quote email sent', info }),
    };
  } catch (error) {
    console.error('send-quote function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Error sending quote email', error: error.message }),
    };
  }
};

module.exports = { handler };
