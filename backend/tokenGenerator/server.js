import express from 'express' 
import cors from 'cors' 
import { createRequire } from 'module' 

const require = createRequire(import.meta.url) 
const app = express() 
const { RtmTokenBuilder } = require('./RtmTokenBuilder2.cjs') 

app.use(cors({ origin: '*', methods: ['POST', 'OPTIONS'] })) 
app.use(express.json()) 

// ENDPOINT 2: Moved to its own sandbox to keep main routes clean 
app.post('/api/v1/generateRtmToken', (req, res) => { 
  try { 
    // 1. EXTRACTION & SECURITY GATE: Verify the request came through your request-tunnel
    const inboundPasscode = req.headers['x-internal-passcode'];
    const expectedPasscode = process.env.DEMO_PASSCODE;

    if (!inboundPasscode || inboundPasscode !== expectedPasscode) {
      return res.status(403).json({ 
        success: false,
        error: "Direct execution forbidden. This resource must be consumed through the authorized request-tunnel." 
      });
    }

    // 2. CORE TOKEN GENERATION LOGIC
    const { userUUID, recorderUUID, AppID, AppCertificate, expireTime } = req.body 
    const finalAppId = AppID || process.env.AGORA_APP_ID 
    const finalCertificate = AppCertificate || process.env.AGORA_APP_CERTIFICATE 

    if (!finalAppId || !finalCertificate) { 
      return res.status(400).json({ error: 'Missing Credentials', details: 'AppID or AppCertificate required.' }) 
    } 

    const relativeDuration = parseInt(expireTime, 10) || 3600 
    const responseData = { success: true, expiresIn: relativeDuration, userToken: null, recorderToken: null } 

    if (userUUID) { 
      responseData.userToken = RtmTokenBuilder.buildToken(finalAppId, finalCertificate, userUUID, relativeDuration) 
    } 

    if (recorderUUID) { 
      responseData.recorderToken = RtmTokenBuilder.buildToken(finalAppId, finalCertificate, recorderUUID, relativeDuration) 
    } 

    return res.json(responseData) 

  } catch (error) { 
    return res.status(500).json({ error: 'Token Generation Failure', details: error.message }) 
  } 
}) 

export default app