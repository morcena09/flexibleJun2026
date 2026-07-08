import express from 'express'; 
import cors from 'cors'; 
import jwt from 'jsonwebtoken';

const app = express(); 

// 1. GLOBAL CORS CONFIGURATION
app.use(cors({ 
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization', 'x-captcha-token'] 
})); 

app.use(express.json()); 

// 2. SECURITY MODULES STORAGE STATE
const apiRateLimitMap = new Map(); 
const MAX_REQUESTS_PER_MINUTE = 60; 

// STRICT WHITE-LIST: Protects your server from being used as a rogue proxy attack weapon
const TOKEN_GENERATOR_DOMAIN = process.env.TOKEN_GENERATOR_DOMAIN || 'https://token-generator-phi-navy.vercel.app';

const ALLOWED_DOMAINS = [
  'https://solutions-apaas.agora.io',
  'https://api.agora.io',
  TOKEN_GENERATOR_DOMAIN
];

// 3. MAIN REQUEST TUNNEL GATEWAY ROUTE
app.post('/api/v1/request-tunnel', async (req, res) => { 
  try { 
    // =========================================================================
    // LAYER I: IP-BASED RATE LIMITER (Drops script spammers immediately)
    // =========================================================================
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const currentTime = Date.now();
    
    if (!apiRateLimitMap.has(clientIp)) {
      apiRateLimitMap.set(clientIp, []);
    }
    
    let requestTimestamps = apiRateLimitMap.get(clientIp).filter(timestamp => currentTime - timestamp < 60000);
    
    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      return res.status(429).json({ 
        error: 'Too Many Requests', 
        details: 'Automated spam script threshold reached. Access throttled.' 
      });
    }
    
    requestTimestamps.push(currentTime);
    apiRateLimitMap.set(clientIp, requestTimestamps);

    // =========================================================================
    // LAYER II: SECURITY IDENTIFICATION DISPATCHER
    // =========================================================================
    const inboundAuth = req.headers['authorization']; 
    const captchaToken = req.headers['x-captcha-token']; 
    const { targetUrl, httpMethod, bodyPayload, authorizationHeader } = req.body;

    let isAuthenticated = false;
    let decodedSessionContext = null;

    // PATH A: Subsequent requests carrying the high-speed JWT session pass token
    if (inboundAuth && inboundAuth.startsWith('Bearer ')) {
      try {
        const tokenString = inboundAuth.split(' ')[1];
        // Mathematical signature validation check (takes < 1 millisecond)
        decodedSessionContext = jwt.verify(tokenString, process.env.DEMO_PASSCODE);
        isAuthenticated = true; 
      } catch (jwtErr) {
        return res.status(403).json({ error: 'Session expired or invalid security signature.' });
      }
    }

    // PATH B: Initial entry landing request validated via Cloudflare Turnstile Captcha
    if (!isAuthenticated) {
      if (!captchaToken) { 
        return res.status(401).json({ error: 'Security verification token missing. Request blocked.' }); 
      } 

      try { 
        const secretKey = process.env.TURNSTILE_SECRET_KEY; 
        const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ secret: secretKey, response: captchaToken }) 
        }); 
        
        const cfData = await cfResponse.json(); 
        if (!cfData.success) { 
          return res.status(403).json({ error: 'Security verification failed or expired.', details: cfData['error-codes'] }); 
        } 
      } catch (verifyError) { 
        console.error('Cloudflare Handshake Network Failure:', verifyError); 
        return res.status(500).json({ error: 'Internal gateway security validation failed.' }); 
      } 
    } 

    // =========================================================================
    // LAYER III: TARGET DESTINATION VALIDATION (The Whitelist Guard)
    // =========================================================================
    if (!targetUrl) { 
      return res.status(400).json({ error: 'Missing targetUrl parameter.' }); 
    } 

    const isUrlAllowed = ALLOWED_DOMAINS.some(domain => targetUrl.startsWith(domain));
    if (!isUrlAllowed) {
      console.warn(`Abuse Blocked: Unauthorized proxy routing request to destination: ${targetUrl}`);
      return res.status(403).json({ 
        error: 'Proxy Violation', 
        details: 'Routing to unauthorized external destinations is strictly prohibited.' 
      });
    }

    // =========================================================================
    // LAYER IV: PROXY FORWARDING HANDLING
    // =========================================================================
    // Setup body encoding structure based on whether payload context is an active string or object
    const finalBodyPayload = ['POST', 'PUT', 'PATCH'].includes(httpMethod?.toUpperCase()) && bodyPayload 
      ? (typeof bodyPayload === 'string' ? bodyPayload : JSON.stringify(bodyPayload))
      : undefined;

    const response = await fetch(targetUrl, { 
      method: httpMethod || 'GET', 
      headers: { 
        'Content-Type': 'application/json', 
        // Forwards either native client authorizationHeader (Agora tokens) or current token string
        'Authorization': authorizationHeader || inboundAuth || '', 
        'x-internal-passcode': process.env.DEMO_PASSCODE || '' 
      }, 
      body: finalBodyPayload
    }); 

    const responseText = await response.text(); 
    res.status(response.status); 

    // =========================================================================
    // LAYER V: DYNAMIC SESSION JWT GENERATION INTERCEPT
    // =========================================================================
    // If the successfully proxied target was the initial token builder endpoint, attach the JWT pass
    if (targetUrl.includes('/api/v1/generateRtmToken') && response.status === 200) {
      try {
        const tokenData = JSON.parse(responseText);
        const parsedBody = typeof bodyPayload === 'string' ? JSON.parse(bodyPayload) : bodyPayload;
        
        // Extract the client's requested classroom duration (defaulting to 30 mins / 1800s if missing)
        const clientDurationSeconds = parseInt(parsedBody?.expireTime, 10) || 1800;
        
        // Add a 15-minute (900 seconds) safety buffer so the token doesn't expire mid-sentence
        const totalJwtLifespan = clientDurationSeconds + 900;

        const sessionPayload = { appId: parsedBody?.AppID || 'client-classroom-session' };
        
        // Sign the unforgeable dynamic JWT session pass using your secret key and calculated duration
        const sessionPassToken = jwt.sign(sessionPayload, process.env.DEMO_PASSCODE, { 
          expiresIn: totalJwtLifespan 
        });
        
        tokenData.sessionPassToken = sessionPassToken;
        return res.json(tokenData);
      } catch (formattingException) {
        // Safe context fallback loop if formatting breaks down
      }
    }

    // Return the response directly back to the classroom tab frontend client
    try { 
      return res.json(JSON.parse(responseText)); 
    } catch { 
      return res.send(responseText); 
    } 

  } catch (error) { 
    console.error('Request Tunnel Engine Failure:', error); 
    return res.status(500).json({ error: 'Server Request Tunnel Failure', details: error.message }); 
  } 
}); 

// CRITICAL FOR VERCEL: Export the app configuration 
export default app;