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

transporter.verify((error) => {
  if (error) {
    console.error('Email transporter verification failed:', error);
  } else {
    console.log('Email transporter verified');
  }
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInfoRow(label, value, isLastRow = false) {
  const borderStyle = isLastRow ? '' : 'border-bottom:1px solid #eaecf0;';

  return `
    <tr>
      <td style="padding:12px 16px;color:#667085;font-size:13px;font-weight:600;width:160px;${borderStyle}">${escapeHtml(label)}</td>
      <td style="padding:12px 16px;color:#101828;font-size:14px;${borderStyle}">${escapeHtml(value || '—')}</td>
    </tr>
  `;
}

function buildQuoteHtml({ customerName, customerEmail, customerPhone, company, notes, products }) {
  const normalizedProducts = Array.isArray(products) ? products : [];

  const productCards = normalizedProducts.map((item, index) => {
    const productName = item.name || item.product_title || 'Product';
    const variant = item.variant || item.variant_title || '';
    const sku = item.sku || '';
    const quantity = item.quantity || 1;
    const image = item.image || item.image_url || item.product_image || '';

    const meta = [
      variant ? `<span style="display:inline-block;margin:0 8px 8px 0;padding:6px 10px;background:#f2f4f7;border-radius:999px;color:#344054;font-size:12px;">Variant: ${escapeHtml(variant)}</span>` : '',
      sku ? `<span style="display:inline-block;margin:0 8px 8px 0;padding:6px 10px;background:#f2f4f7;border-radius:999px;color:#344054;font-size:12px;">SKU: ${escapeHtml(sku)}</span>` : '',
      `<span style="display:inline-block;margin:0 8px 8px 0;padding:6px 10px;background:#fff7ed;border-radius:999px;color:#c2410c;font-size:12px;font-weight:700;">Qty: ${escapeHtml(quantity)}</span>`,
    ].join('');

    const imageMarkup = image
      ? `
        <td style="width:120px;padding:20px;vertical-align:top;">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(productName)}" style="display:block;width:96px;height:96px;object-fit:cover;border-radius:16px;border:1px solid #eaecf0;background:#ffffff;">
        </td>
      `
      : '';

    return `
      <tr>
        <td style="padding:0 0 16px;">
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;background:#ffffff;border:1px solid #eaecf0;border-radius:20px;">
            <tr>
              ${imageMarkup}
              <td style="padding:20px;vertical-align:top;">
                <div style="color:#98a2b3;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">Product ${index + 1}</div>
                <div style="color:#101828;font-size:20px;line-height:28px;font-weight:700;margin-bottom:12px;">${escapeHtml(productName)}</div>
                <div style="margin-bottom:4px;">${meta}</div>
                ${image ? `<div style="color:#667085;font-size:12px;line-height:18px;word-break:break-all;">Image: <a href="${escapeHtml(image)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(image)}</a></div>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  const notesHtml = notes
    ? escapeHtml(notes).replace(/\r?\n/g, '<br>')
    : 'No additional notes provided.';

  return `
    <div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#101828;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:760px;margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="padding:0 0 20px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:linear-gradient(135deg,#0f766e 0%,#115e59 100%);border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:32px;">
                  <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#ccfbf1;font-weight:700;margin-bottom:12px;">ARIQAI Foods</div>
                  <div style="font-size:30px;line-height:38px;color:#ffffff;font-weight:700;margin-bottom:10px;">New Quote Request</div>
                  <div style="font-size:15px;line-height:24px;color:#d1fae5;max-width:520px;">A customer submitted a new quote request. The requested products, customer details, and notes are included below.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 0 20px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #eaecf0;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:24px 24px 8px;color:#101828;font-size:20px;font-weight:700;">Customer Details</td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #eaecf0;border-radius:16px;overflow:hidden;background:#fcfcfd;">
                    ${buildInfoRow('Name', customerName)}
                    ${buildInfoRow('Email', customerEmail)}
                    ${buildInfoRow('Phone', customerPhone)}
                    ${buildInfoRow('Company', company, true)}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 0 20px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #eaecf0;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:24px 24px 8px;color:#101828;font-size:20px;font-weight:700;">Requested Products</td>
              </tr>
              <tr>
                <td style="padding:8px 24px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                    ${productCards || `
                      <tr>
                        <td style="padding:16px 0;color:#667085;font-size:14px;">No product details were provided.</td>
                      </tr>
                    `}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0;">
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #eaecf0;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:24px 24px 8px;color:#101828;font-size:20px;font-weight:700;">Additional Notes</td>
              </tr>
              <tr>
                <td style="padding:8px 24px 24px;">
                  <div style="padding:18px 20px;background:#f9fafb;border:1px solid #eaecf0;border-radius:16px;color:#344054;font-size:14px;line-height:24px;">
                    ${notesHtml}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
