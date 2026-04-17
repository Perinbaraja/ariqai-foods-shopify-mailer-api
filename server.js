const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

// Node 18+ has fetch built-in
// For older Node: npm install node-fetch

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
   IMAGE FALLBACK
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
   VALIDATE IMAGE
================================ */
async function getSafeImage(imageUrl) {
  if (!imageUrl) return FALLBACK_IMAGE;

  const finalUrl = imageUrl.startsWith('//')
    ? `https:${imageUrl}`
    : imageUrl;

  try {
    const res = await fetch(finalUrl, { method: 'HEAD' });

    return res.ok ? finalUrl : FALLBACK_IMAGE;
  } catch {
    return FALLBACK_IMAGE;
  }
}

/* ================================
   TEMPLATE (FULL WIDTH STYLE)
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
            <table width="100%" style="background:#ffffff;
              border-radius:16px;border:1px solid #e5e7eb;">
              
              <tr>
                <td style="width:120px;padding:16px;">
                  <img src="${image}" 
                    style="width:100px;height:100px;
                    object-fit:cover;border-radius:10px;
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
<div style="margin:0;padding:0;background:#f1f5f9;width:100%;">
  
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f1f5f9;">
    
    <!-- HEADER -->
    <tr>
      <td style="background:linear-gradient(135deg,#6366f1,#06b6d4);padding:40px 20px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:white;">
          🚀 New Quote Request
        </div>
        <div style="color:#e0f2fe;margin-top:8px;">
          ARIQAI Foods Customer Inquiry
        </div>
      </td>
    </tr>

    <!-- CONTENT -->
    <tr>
      <td style="padding:30px 10px;">
        
        <table width="100%" style="max-width:1000px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;">
          
          <!-- CUSTOMER -->
          <tr>
            <td style="padding:30px;">
              <h2>👤 Customer Details</h2>

              <table width="100%">
                <tr><td><b>Name:</b></td><td>${escapeHtml(customerName || '-')}</td></tr>
                <tr><td><b>Email:</b></td><td>${escapeHtml(customerEmail)}</td></tr>
                <tr><td><b>Phone:</b></td><td>${escapeHtml(customerPhone || '-')}</td></tr>
                <tr><td><b>Company:</b></td><td>${escapeHtml(company || '-')}</td></tr>
              </table>
            </td>
          </tr>

          <!-- PRODUCTS -->
          <tr>
            <td style="padding:30px;background:#f9fafb;">
              <h2>🛒 Requested Products</h2>
              <table width="100%">
                ${productCards || '<tr><td>No products</td></tr>'}
              </table>
            </td>
          </tr>

          <!-- NOTES -->
          <tr>
            <td style="padding:30px;">
              <h2>📝 Notes</h2>
              <div style="background:#f3f4f6;padding:20px;border-radius:12px;">
                ${notesHtml}
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="text-align:center;padding:20px;font-size:12px;color:#9ca3af;">
        © ${new Date().getFullYear()} ARIQAI Foods
      </td>
    </tr>

  </table>
</div>
`;
}

/* ================================
   API
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
      return res.status(400).json({
        success: false,
        message: 'customerEmail required',
      });
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
      subject: `New Quote Request from ${customerName || 'Customer'}`,
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
   SERVER
================================ */
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});