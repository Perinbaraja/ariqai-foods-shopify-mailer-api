const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('Missing EMAIL_USER or EMAIL_PASS in .env');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // use an app password for Gmail
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter verification failed:', error);
  } else {
    console.log('Email transporter verified');
  }
});

function buildQuoteHtml({ customerName, customerEmail, customerPhone, company, notes, products }) {
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
}

app.post('/send-quote', async (req, res) => {
  console.log('POST /send-quote called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      company,
      notes,
      products = [],
    } = req.body;

    if (!customerEmail) {
      console.error('Missing customerEmail in request body');
      return res.status(400).json({ success: false, message: 'customerEmail is required' });
    }

    console.log('Building quote HTML');
    const html = buildQuoteHtml({
      customerName,
      customerEmail,
      customerPhone,
      company,
      notes,
      products,
    });

    const mailOptions = {
      from: `"ARIQAI Foods" <${process.env.EMAIL_USER}>`,
      to: process.env.QUOTE_RECEIVER || process.env.EMAIL_USER,
      replyTo: customerEmail,
      subject: `New Quote Request from ${customerName || 'Customer'}`,
      html,
    };

    console.log('Sending mail with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      replyTo: mailOptions.replyTo,
      subject: mailOptions.subject,
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info);

    return res.json({ success: true, message: 'Quote email sent', info });
  } catch (error) {
    console.error('send-quote error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Error sending quote email',
      error: error.message,
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Quote email server running on port ${port}`);
});