/** * Core Request Sender Utility 
 * Communicates directly with your standalone app server request tunnel gateway 
 */ 
function getSessionRelayUrl() {
  try {
    const storedConfigJson = sessionStorage.getItem('APP_CONFIG');
    if (storedConfigJson) {
      const storedConfig = JSON.parse(storedConfigJson);
      return storedConfig.REST_RELAY_URL || 'https://rest-relay-one.vercel.app/api/v1/request-tunnel';
    }
  } catch (err) {
    console.warn('⚠️ Could not read REST_RELAY_URL from sessionStorage:', err);
  }
  return 'https://rest-relay-one.vercel.app/api/v1/request-tunnel';
}

export async function sendRequest({ url, method, body, token }) { 
  const APP_SERVER_TUNNEL_URL = getSessionRelayUrl(); 

  // ==========================================
  // DYNAMIC SESSION DETECTION LAYER
  // ==========================================
  // Automatically retrieve the dynamic unforgeable JWT pass issued during the landing handshake
  const sessionPass = sessionStorage.getItem('classroom_session_pass') || '';

  const requestHeaders = { 
    'Content-Type': 'application/json' 
  };

  // If a valid session pass is stored in the browser tab memory, inject it to bypass the Turnstile gate
  if (sessionPass) {
    requestHeaders['Authorization'] = `Bearer ${sessionPass}`;
  }

  const response = await fetch(APP_SERVER_TUNNEL_URL, { 
    method: 'POST', 
    headers: requestHeaders, 
    body: JSON.stringify({ 
      targetUrl: url, 
      httpMethod: method, 
      // Handle bodies that might already arrive compiled as stringified JSON or raw objects
      bodyPayload: body ? (typeof body === 'string' ? JSON.parse(body) : body) : null, 
      authorizationHeader: token // Safely carries your "agora token=..." parameter inside the tunnel wrapper
    }) 
  }); 

  const statusText = `HTTP ${response.status}`; 
  const rawData = await response.text(); 
  let parsedData; 
  try { 
    parsedData = JSON.stringify(JSON.parse(rawData), null, 2); 
  } catch { 
    parsedData = rawData; 
  } 

  return { ok: response.ok, statusText, data: parsedData }; 
}