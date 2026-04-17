const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

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
    pass: process.env.EMAIL_PASS,
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
   TEMPLATE (PERFECT WIDTH)
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
  <td style="padding:10px 0;">
    <table width="100%" style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;">
      <tr>
        
        <!-- IMAGE -->
        <td style="width:90px;padding:12px;">
          <img src="${image}" 
            style="width:80px;height:80px;
            object-fit:cover;border-radius:10px;
            border:1px solid #eee;" />
        </td>

        <!-- DETAILS -->
        <td style="padding:12px;">
          
          <div style="font-size:11px;color:#9ca3af;font-weight:600;">
            PRODUCT ${index + 1}
          </div>

          <div style="font-size:16px;font-weight:700;color:#111;margin:4px 0 8px;">
            ${escapeHtml(productName)}
          </div>

          <!-- BADGES -->
          <div style="margin-top:6px;">
            
            ${variant
          ? `<span style="
                    display:inline-block;
                    background:#f3e8ff;
                    color:#7c3aed;
                    padding:5px 10px;
                    border-radius:999px;
                    font-size:11px;
                    font-weight:600;
                    margin-right:6px;
                  ">
                    ${escapeHtml(variant)}
                  </span>`
          : ''
        }

            ${sku
          ? `<span style="
                    display:inline-block;
                    background:#f1f5f9;
                    color:#334155;
                    padding:5px 10px;
                    border-radius:999px;
                    font-size:11px;
                    font-weight:600;
                    margin-right:6px;
                  ">
                    SKU: ${escapeHtml(sku)}
                  </span>`
          : ''
        }

            <span style="
              display:inline-block;
              background:#dcfce7;
              color:#166534;
              padding:5px 10px;
              border-radius:999px;
              font-size:11px;
              font-weight:700;
            ">
              Qty: ${escapeHtml(quantity)}
            </span>

          </div>

          <!-- LINK -->
          <div style="margin-top:6px;">
            <a href="${image}" style="font-size:11px;color:#2563eb;text-decoration:none;">
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
<div style="background:#f4f6f8;padding:20px 10px;font-family:Arial;">
  
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        
        <!-- MAIN -->
        <table width="100%" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;">
          
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#06b6d4);
              padding:24px;text-align:center;color:#fff;">
              
              <div style="font-size:20px;font-weight:700;">
                🚀 New Quote Request
              </div>

              <div style="font-size:12px;margin-top:4px;color:#e0f2fe;">
                ARIQAI Foods Customer Inquiry
              </div>
            </td>
          </tr>

          <!-- CUSTOMER -->
          <tr>
            <td style="padding:20px;">
              <b>👤 Customer Details</b><br><br>

              Name: ${escapeHtml(customerName || '-')}<br>
              Email: ${escapeHtml(customerEmail)}<br>
              Phone: ${escapeHtml(customerPhone || '-')}<br>
              Company: ${escapeHtml(company || '-')}
            </td>
          </tr>

          <!-- PRODUCTS -->
          <tr>
            <td style="padding:20px;background:#fafafa;">
              <b>🛒 Requested Products</b><br><br>

              <table width="100%">
                ${productCards || '<tr><td>No products</td></tr>'}
              </table>
            </td>
          </tr>

          <!-- NOTES -->
          <tr>
            <td style="padding:20px;">
              <b>📝 Notes</b><br><br>

              <div style="background:#f1f5f9;padding:12px;border-radius:8px;">
                ${notesHtml}
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="text-align:center;padding:14px;font-size:12px;color:#999;">
              © ${new Date().getFullYear()} ARIQAI Foods
            </td>
          </tr>

        </table>

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

    res.json({
      success: true,
      message: 'Email sent',
      info,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
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