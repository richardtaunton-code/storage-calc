/**
 * Broadcast Storage Calculator — License Verification
 * Netlify Function: /.netlify/functions/verify-license
 *
 * Validates a Lemon Squeezy license key server-side.
 * Required environment variables (set in Netlify dashboard):
 *   LEMON_SQUEEZY_API_KEY  — your LS API key (Settings → API)
 *   LS_STORE_ID            — your numeric store ID
 *   LS_PRODUCT_ID          — your product ID (optional but recommended)
 */

const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const LS_STORE_ID           = process.env.LS_STORE_ID;
const LS_PRODUCT_ID         = process.env.LS_PRODUCT_ID; // optional

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ valid: false, error: 'Method not allowed' }),
    };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ valid: false, error: 'Invalid request body' }),
    };
  }

  const { license_key } = body;
  if (!license_key || typeof license_key !== 'string' || license_key.trim().length < 10) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ valid: false, error: 'No license key provided' }),
    };
  }

  if (!LEMON_SQUEEZY_API_KEY) {
    console.error('LEMON_SQUEEZY_API_KEY environment variable not set');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ valid: false, error: 'Server configuration error' }),
    };
  }

  try {
    // Validate with Lemon Squeezy
    const lsRes = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        license_key: license_key.trim(),
        instance_name: 'BSC-Web', // identifies this activation
      }),
    });

    const lsData = await lsRes.json();

    // LS returns { valid: true/false, license_key: {...}, instance: {...}, meta: {...} }
    if (!lsData.valid) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ valid: false, error: 'License key not recognised or expired' }),
      };
    }

    // Optionally verify it belongs to YOUR store/product
    const keyStoreId   = lsData.license_key?.store_id;
    const keyProductId = lsData.license_key?.product_id;

    if (LS_STORE_ID && String(keyStoreId) !== String(LS_STORE_ID)) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ valid: false, error: 'License not valid for this product' }),
      };
    }

    if (LS_PRODUCT_ID && String(keyProductId) !== String(LS_PRODUCT_ID)) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ valid: false, error: 'License not valid for this product' }),
      };
    }

    // All good — return success
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        valid: true,
        customer: lsData.meta?.customer_email || null,
        status:   lsData.license_key?.status  || 'active',
      }),
    };

  } catch (err) {
    console.error('Lemon Squeezy API error:', err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ valid: false, error: 'License verification service unavailable' }),
    };
  }
};
