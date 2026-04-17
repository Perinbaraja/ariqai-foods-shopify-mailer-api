const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

// Node 18+ has fetch built-in. If older, install node-fetch
// const fetch = require('node-fetch');

const app = express();

app.use(cors());
app.use(express.json());

/* ================================
   ENV CHECK
================================ */
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('Missing EMAIL_USER or EMAIL_PASS in .env');
  process.exit(1);
}

/* ================================
   MAIL TRANSPORT
================================ */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

transporter.verify((error) => {
  if (error) {
    console.error('Email transporter verification failed:', error);
  } else {
    console.log('Email transporter verified');
  }
});

/* ================================
   IMAGE FALLBACK CONFIG
================================ */
const FALLBACK_IMAGE =
  'https://via.placeholder.com/100x100?text=No+Image';

/* ================================
   HELPERS
================================ */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ================================
   VALIDATE IMAGE (IMPORTANT)
================================ */
async function getSafeImage(imageUrl) {
  if (!imageUrl) return FALLBACK_IMAGE;

  const finalUrl = imageUrl.startsWith('//')
    ? `https:${imageUrl}`
    : imageUrl;

  try {
    const res = await fetch(finalUrl, { method: 'HEAD' });

    if (res.ok) {
      return finalUrl;
    } else {
      return FALLBACK_IMAGE;
    }
  } catch (err) {
    return FALLBACK_IMAGE;
  }
}

/* ================================
   HTML TEMPLATE (MODERN UI)
================================ */
async function buildQuoteHtml({
  customerName,
  customerEmail,
  customerPhone,
  company,
  notes,
  products,
}) {
  const normalizedProducts = Array.isArray(products) ? products : [];

  const productCardsArr = await Promise.all(
    normalizedProducts.map(async (item, index) => {
      const productName =
        item.name || item.product_title || 'Product';

      const variant =
        item.variant || item.variant_title || '';

      const sku = item.sku || '';
      const quantity = item.quantity || 1;

      const rawImage =
        item.image || item.image_url || item.product_image || '';

      const image = await getSafeImage(rawImage);

      return `
        <tr>
          <td style="padding:12px 0;">
            <table style="width:100%;background:#ffffff;
              border-radius:18px;border:1px solid #e5e7eb;
              box-shadow:0 10px 25px rgba(0,0,0,0.05);">
              
              <tr>
                <td style="width:120px;padding:16px;">
                  <img src="${image}" 
                    style="width:100px;height:100px;
                    object-fit:cover;border-radius:12px;
                    border:1px solid #eee;" />
                </td>

                <td style="padding:16px;">
                  <div style="font-size:12px;color:#9ca3af;font-weight:600;">
                    PRODUCT ${index + 1}
                  </div>

                  <div style="font-size:18px;font-weight:700;
                    color:#111827;margin:6px 0;">
                    ${escapeHtml(productName)}
                  </div>

                  <div style="margin-top:8px;">
                    ${variant
          ? `<span style="background:#eef2ff;color:#3730a3;
                          padding:6px 10px;border-radius:999px;
                          font-size:12px;margin-right:6px;">
                          ${escapeHtml(variant)}
                        </span>`
          : ''
        }

                    ${sku
          ? `<span style="background:#f1f5f9;color:#334155;
                          padding:6px 10px;border-radius:999px;
                          font-size:12px;margin-right:6px;">
                          SKU: ${escapeHtml(sku)}
                        </span>`
          : ''
        }

                    <span style="background:#ecfeff;color:#0e7490;
                      padding:6px 10px;border-radius:999px;
                      font-size:12px;font-weight:700;">
                      Qty: ${escapeHtml(quantity)}
                    </span>
                  </div>

                  <div style="margin-top:6px;font-size:11px;">
                    <a href="${image}" style="color:#2563eb;">
                      View Image
                    </a>
                  </div>

                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
  );

  const productCards = productCardsArr.join('');

  const notesHtml = notes
    ? escapeHtml(notes).replace(/\n/g, '<br>')
    : 'No notes provided';

  return `
  <div style="background:#f1f5f9;padding:30px;font-family:Arial;">
    <table style="max-width:720px;margin:auto;background:white;
      border-radius:20px;overflow:hidden;
      box-shadow:0 20px 40px rgba(0,0,0,0.08);">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#6366f1,#06b6d4);
          padding:30px;color:white;">
          
          <div style="font-size:26px;font-weight:800;">
            🚀 New Quote Request
          </div>

          <div style="margin-top:6px;font-size:14px;color:#e0f2fe;">
            ARIQAI Foods Customer Inquiry
          </div>
        </td>
      </tr>

      <!-- CUSTOMER -->
      <tr>
        <td style="padding:24px;">
          <div style="font-size:18px;font-weight:700;margin-bottom:12px;">
            👤 Customer Details
          </div>

          <table style="width:100%;font-size:14px;">
            <tr><td><b>Name:</b></td><td>${escapeHtml(customerName || '-')}</td></tr>
            <tr><td><b>Email:</b></td><td>${escapeHtml(customerEmail)}</td></tr>
            <tr><td><b>Phone:</b></td><td>${escapeHtml(customerPhone || '-')}</td></tr>
            <tr><td><b>Company:</b></td><td>${escapeHtml(company || '-')}</td></tr>
          </table>
        </td>
      </tr>

      <!-- PRODUCTS -->
      <tr>
        <td style="padding:24px;background:#f9fafb;">
          <div style="font-size:18px;font-weight:700;margin-bottom:12px;">
            🛒 Requested Products
          </div>

          <table style="width:100%;">
            ${productCards || '<tr><td>No products</td></tr>'}
          </table>
        </td>
      </tr>

      <!-- NOTES -->
      <tr>
        <td style="padding:24px;">
          <div style="font-size:18px;font-weight:700;margin-bottom:10px;">
            📝 Notes
          </div>

          <div style="background:#f3f4f6;padding:16px;border-radius:12px;">
            ${notesHtml}
          </div>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:20px;text-align:center;
          font-size:12px;color:#9ca3af;">
          © ${new Date().getFullYear()} ARIQAI Foods
        </td>
      </tr>

    </table>
  </div>
  `;
}

/* ================================
   API ROUTE
================================ */
app.post('/send-quote', async (req, res) => {
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
      return res
        .status(400)
        .json({ success: false, message: 'customerEmail required' });
    }

    const html = await buildQuoteHtml({
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
      subject: `New Quote Request from ${customerName || 'Customer'
        }`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: 'Email sent',
      info,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* ================================
   SERVER START
================================ */
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});