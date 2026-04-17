const nodemailer = require('nodemailer');

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

const FALLBACK_IMAGE =
  'https://via.placeholder.com/100x100?text=No+Image';

/* ================================
   IMAGE FIX (Shopify CDN)
================================ */
function getSafeImage(imageUrl) {
  if (!imageUrl) return FALLBACK_IMAGE;

  if (imageUrl.startsWith('//')) {
    return `https:${imageUrl}`;
  }

  return imageUrl;
}

/* ================================
   NEW MODERN TEMPLATE
================================ */
const buildQuoteHtml = ({
  customerName,
  customerEmail,
  customerPhone,
  company,
  notes,
  products,
}) => {
  const productCards = (products || []).map((item, index) => {
    const image = getSafeImage(
      item.image || item.image_url || item.product_image
    );

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
                  ${escapeHtml(item.name || item.product_title || 'Product')}
                </div>

                <!-- BADGES -->
                <div style="margin-top:6px;">
                  
                  ${item.variant || item.variant_title
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
                          ${escapeHtml(item.variant || item.variant_title)}
                        </span>`
        : ''
      }

                  ${item.sku
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
                          SKU: ${escapeHtml(item.sku)}
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
                    Qty: ${escapeHtml(item.quantity)}
                  </span>

                </div>

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
  }).join('');

  const notesHtml = notes
    ? escapeHtml(notes).replace(/\n/g, '<br>')
    : 'No additional notes provided.';

  return `
<div style="background:#f4f6f8;padding:20px 10px;font-family:Arial;">
  
  <table width="100%">
    <tr>
      <td align="center">
        
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
};

/* ================================
   HANDLER
================================ */
const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  const body = JSON.parse(event.body || '{}');

  const {
    customerName,
    customerEmail,
    customerPhone,
    company,
    notes,
    products = [],
  } = body;

  if (!customerEmail) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'customerEmail required' }),
    };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const html = buildQuoteHtml({
    customerName,
    customerEmail,
    customerPhone,
    company,
    notes,
    products,
  });

  await transporter.sendMail({
    from: `"ARIQAI Foods" <${process.env.EMAIL_USER}>`,
    to: process.env.QUOTE_RECEIVER || process.env.EMAIL_USER,
    replyTo: customerEmail,
    subject: `New Quote Request from ${customerName || 'Customer'}`,
    html,
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true }),
  };
};

module.exports = { handler };