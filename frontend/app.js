// ========================================== 
// 0. TOP-LEVEL WINDOW VARIABLE VALIDATION
// ========================================== 

function getConfigFromSession() {
    try {
        const storedConfigJson = sessionStorage.getItem('APP_CONFIG');
        return storedConfigJson ? JSON.parse(storedConfigJson) : null;
    } catch (err) {
        console.warn('⚠️ Failed to parse APP_CONFIG from sessionStorage:', err);
        return null;
    }
}

// Wait for config to be available
function waitForConfig(retries = 10) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkConfig = () => {
            attempts++;
            const sessionConfig = getConfigFromSession();
            if (sessionConfig) {
                resolve(sessionConfig);
            } else if (window.APP_CONFIG) {
                resolve(window.APP_CONFIG);
            } else if (attempts >= retries) {
                reject(new Error('APP_CONFIG not loaded after ' + retries + ' attempts'));
            } else {
                setTimeout(checkConfig, 200);
            }
        };
        checkConfig();
    });
}

// Initialize app after config loads
async function initApp() {
    try {
        const config = await waitForConfig();
        console.log('✅ Config loaded successfully:', config);
        // Now proceed with the app initialization
        initializeApp(config);
    } catch (error) {
        console.error('❌ Failed to load config:', error);
        alert('Critical Error: Configuration failed to load. Please refresh the page.');
    }
}

function initializeApp(CONFIG) {
    // Check if turnstile is loaded (optional, handle gracefully)
    if (!window.turnstile) {
        console.warn('⚠️ Cloudflare Turnstile script engine not loaded - CAPTCHA features may not work');
    }

    // ========================================== 
    // SET TURNSTILE SITE KEY VIA EXPLICIT RENDER (KEEPS ORIGINAL CLASS)
    // ========================================== 
    const turnstileContainer = document.querySelector('.cf-turnstile');
    
    if (turnstileContainer && CONFIG.TURNSTILE_SITE_KEY) {
        // Explicitly globalize the validation callback right before rendering mounts
        window.javascriptCaptchaCallback = function(token) { 
            window.currentTurnstileToken = token; 
            console.log("✅ Turnstile background verification complete."); 
        }; 

        const mountExplicitTurnstile = () => {
            window.turnstile.render('.cf-turnstile', {
                sitekey: CONFIG.TURNSTILE_SITE_KEY,
                callback: 'javascriptCaptchaCallback'
            });
            console.log('✅ Turnstile explicitly initialized onto existing CSS node framework');
        };

        if (window.turnstile) {
            mountExplicitTurnstile();
        } else {
            // Fallback checking iteration if the script tag asset delivery is slightly latent
            const checkTurnstileInterval = setInterval(() => {
                if (window.turnstile) {
                    clearInterval(checkTurnstileInterval);
                    mountExplicitTurnstile();
                }
            }, 100);
        }
    } else {
        console.warn('⚠️ Turnstile container not found or site key missing');
    }

    // ========================================== 
    // 1. DOM ELEMENTS SELECTION 
// ========================================== 
    const rtmTokenInput = document.getElementById('rtmToken'); 
    const recordingRtmTokenInput = document.getElementById('recordingRtmToken'); 
    const thoughtBubble = document.getElementById('thoughtBubble'); 
    const tokenPreview = document.getElementById('tokenPreview'); 
    const urlForm = document.getElementById('urlForm'); 
    const btnGenerateTokens = document.getElementById('btnGenerateTokens'); 
    const btnCopySnippet = document.getElementById('btnCopySnippet');
    const roleTypeSelect = document.getElementById('roleType');
    const recordingUuidInput = document.getElementById('recordingUuid');
    const roleWarningBanner = document.getElementById('roleWarningBanner');

    const inputElements = [ 
        'appId', 'appCertificate', 'region', 'roleType', 'roomType', 
        'roomUuid', 'roomName', 'userUuid', 'userName', 'duration', 
        'rtmToken', 'recordingUuid', 'recordingRtmToken' 
    ]; 

    const roomTypeEnums = { "0": "One-to-One", "2": "Lecture Hall", "4": "Small Class" };
    const roleTypeEnums = { "0": "Recorder", "1": "Teacher", "2": "Student", "3": "Assistant" };

    // ========================================== 
    // 2. NETWORK CORE: REQUEST SENDING UTILITY 
    // ========================================== 
    async function sendRequest({ url, method, body, token }) { 
        const activeCaptcha = window.currentTurnstileToken || ''; 
        
        const response = await fetch(CONFIG.REST_RELAY_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'x-captcha-token': activeCaptcha }, 
            body: JSON.stringify({ 
                targetUrl: url, 
                httpMethod: method, 
                bodyPayload: body ? JSON.parse(body) : null, 
                authorizationHeader: token 
            }) 
        }); 
        
        if (window.turnstile) { 
            window.turnstile.reset(); 
        } 
        window.currentTurnstileToken = ''; 
        
        const statusText = `HTTP ${response.status}`; 
        const rawData = await response.text(); 
        let parsedData; 
        try { parsedData = JSON.parse(rawData); } catch { parsedData = rawData; } 
        return { ok: response.ok, statusText, data: parsedData }; 
    } 

    // ========================================== 
    // 3. UI GRAPHICS & COMPILER RENDERING ENGINES 
    // ========================================== 
    function processTokenState() { 
        const rawToken = rtmTokenInput ? rtmTokenInput.value.trim() : ''; 
        const hasUnsafeChars = /[\+/]/.test(rawToken); 
        if (rawToken && hasUnsafeChars && tokenPreview && thoughtBubble) { 
            tokenPreview.textContent = encodeURIComponent(rawToken); 
            thoughtBubble.style.display = 'block'; 
        } else if (thoughtBubble) { 
            thoughtBubble.style.display = 'none'; 
        } 
    } 

    function handleRoleInterdependency() {
        if (!roleTypeSelect || !recordingUuidInput) return;
        const currentRole = roleTypeSelect.value;
        const isTeacher = (currentRole === "1");

        if (recordingUuidInput) {
            recordingUuidInput.disabled = !isTeacher;
        }
        if (roleWarningBanner) {
            if (isTeacher) {
                roleWarningBanner.classList.add('style-hidden');
            } else {
                roleWarningBanner.classList.remove('style-hidden');
            }
        }
    }

    function compileLiveEditorView() { 
        const appId = document.getElementById('appId')?.value.trim() || '...'; 
        const rawRegion = document.getElementById('region')?.value || ''; 
        const sdkRegion = rawRegion ? rawRegion.toUpperCase() : '...'; 
        const restRegion = rawRegion ? rawRegion.toLowerCase() : '...'; 
        const roleType = document.getElementById('roleType')?.value || '...'; 
        const roomType = document.getElementById('roomType')?.value || '...'; 
        const roomUuid = document.getElementById('roomUuid')?.value.trim() || '...'; 
        const rawRoomName = document.getElementById('roomName')?.value.trim() || ''; 
        const roomName = rawRoomName ? encodeURIComponent(rawRoomName) : '...'; 
        const displayRoomName = rawRoomName || '...'; 
        const rawUserName = document.getElementById('userName')?.value.trim() || ''; 
        const userName = rawUserName ? encodeURIComponent(rawUserName) : '...'; 
        const displayUserName = rawUserName || '...'; 
        const displayUserUuid = document.getElementById('userUuid')?.value.trim() || '...'; 
        const displayUserToken = rtmTokenInput?.value.trim() || '...'; 
        const durationInput = document.getElementById('duration')?.value; 
        const durationMin = durationInput ? parseFloat(durationInput) : NaN; 
        const durationSec = !isNaN(durationMin) ? Math.floor(durationMin * 60) : '...'; 
        const rawRecUuid = document.getElementById('recordingUuid')?.value.trim() || ''; 
        const recUuid = rawRecUuid ? encodeURIComponent(rawRecUuid) : '...'; 
        const rawRecToken = recordingRtmTokenInput?.value.trim() || ''; 
        const recToken = rawRecToken ? encodeURIComponent(rawRecToken) : '...'; 
        
        const isTeacher = (roleType === "1");

        const recordUrlCodeSnippet = isTeacher ? `\`\${CONFIG.CLASSROOM_HOST}/?\` +\n           \`userUuid=\${encodeURIComponent('${recUuid}')}&\` +\n           \`userName=\${encodeURIComponent('${userName}')}&\` +\n           \`roomUuid=\${encodeURIComponent('${roomUuid}')}&\` +\n           \`roomName=\${encodeURIComponent('${roomName}')}&\` +\n           \`roleType=0&\` +\n           \`roomType=${roomType}&\` +\n           \`pretest=false&\` +\n           \`rtmToken=\${encodeURIComponent('${recToken}')}&\` +\n           \`duration=${durationSec}&\` +\n           \`appId=${appId}&\` +\n           \`region=${restRegion}&\` +\n           \`isRecorder=true\`` : null;

        let htmlHighlightTemplate = `
<span class="var">AgoraEduSDK</span>.<span class="fn">config</span>({
    appId: <span class="str" data-line="appId">'${appId}'</span>,
    region: <span class="str" data-line="region">'${sdkRegion}'</span>
});

<span class="cmt">// Launch Agora Core Classroom Engine Instance</span>
<span class="var">AgoraEduSDK</span>.<span class="fn">launch</span>(document.<span class="fn">querySelector</span>(<span class="str">"#root"</span>), {
    userUuid: <span class="str" data-line="userUuid">'${displayUserUuid}'</span>,
    userName: <span class="str" data-line="userName">'${displayUserName}'</span>,
    roomUuid: <span class="str" data-line="roomUuid">'./${roomUuid}'</span>,
    roomName: <span class="str" data-line="roomName">'${displayRoomName}'</span>,
    roleType: <span class="num" data-line="roleType">${roleType}</span>, <span class="cmt">// ${roleTypeEnums[roleType] || 'Unknown'}</span>
    roomType: <span class="num" data-line="roomType">${roomType}</span>, <span class="cmt">// ${roomTypeEnums[roomType] || 'Unknown'}</span>
    pretest: <span class="kw">false</span>,
    rtmToken: <span class="str" data-line="rtmToken">'${displayUserToken}'</span>,
    language: <span class="str">'en'</span>,
    duration: <span class="num" data-line="duration">${durationSec}</span>,`;

        if (isTeacher) {
            htmlHighlightTemplate += `\n    <span class="code-block-recording-group">recordUrl: ${recordUrlCodeSnippet},</span><br>    courseWareList: [],<br>    `;
        } else {
            htmlHighlightTemplate += `\n    <span class="cmt">// recordUrl and courseWareList parameters skipped for non-recording role profiles</span><br>    `;
        }

        htmlHighlightTemplate += `
    virtualBackgroundImages: [],
    webrtcExtensionBaseUrl: <span class="str">'https://solutions-apaas.agora.io/static'</span>,
    uiMode: <span class="str">'light'</span>,
    widgets: {
        popupQuiz: AgoraSelector,
        countdownTimer: AgoraCountdown,
        easemobIM: AgoraHXChatWidget,
        mediaPlayer: FcrStreamMediaPlayerWidget,
        poll: AgoraPolling,
        watermark: FcrWatermarkWidget,
        webView: FcrWebviewWidget,
        netlessBoard: FcrBoardWidget
    },
    listener: (evt, args) => {
        console.log(<span class="str">"Agora SDK Event Triggered:"</span>, evt, args);
        if (
            (evt === <span class="str">'onRoomAction'</span> && args && args.action === <span class="str">'exit'</span>) ||
            (evt === <span class="str">'FcrRoomStateChanged'</span> && args === <span class="str">'destroyed'</span>) ||
            (evt === <span class="str">'classroom-state-changed'</span> && args === <span class="num">3</span>) ||
            (evt === <span class="num">2</span>)
        ) {
            handleExitRedirect();
        } else if (evt === <span class="num">1</span>) {
            AgoraEduSDK.setRecordReady(); <span class="cmt">//required</span>
        }
    }
});`.trim();

        const codeBodyEl = document.getElementById('codeBody'); 
        if (codeBodyEl) { 
            codeBodyEl.style.whiteSpace = 'pre'; 
            codeBodyEl.style.fontFamily = 'monospace'; 
            codeBodyEl.innerHTML = htmlHighlightTemplate; 
        } 
    } 

    // ==========================================
    // 4. FOCUS ANCHORING HIGHLIGHT LOGIC
    // ==========================================
    function setupFocusAnchoring() {
        inputElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;
            
            const formGroup = element.closest('.form-group');
            if (!formGroup) return;

            const handleHighlight = (isAdding) => {
                const dataLineAttr = formGroup.getAttribute('data-anchor');
                if (!dataLineAttr) return;
                
                const targetCodeLine = document.querySelector(`[data-line="${dataLineAttr}"]`);
                if (targetCodeLine) {
                    const layoutRowLine = targetCodeLine.closest('span') || targetCodeLine;
                    if (isAdding) {
                        layoutRowLine.classList.add('highlight-pulse-glow');
                    } else {
                        layoutRowLine.classList.remove('highlight-pulse-glow');
                    }
                }
            };

            element.addEventListener('focus', () => handleHighlight(true));
            element.addEventListener('blur', () => handleHighlight(false));
            formGroup.addEventListener('mouseenter', () => handleHighlight(true));
            formGroup.addEventListener('mouseleave', () => {
                if (document.activeElement !== element) {
                    handleHighlight(false);
                }
            });
        });
    }

    // ========================================== 
    // 5. EVENT LISTENERS SETUP 
// ========================================== 
    inputElements.forEach(id => { 
        const element = document.getElementById(id); 
        if (!element) return; 
        ['input', 'change', 'keyup', 'paste'].forEach(ev => { 
            element.addEventListener(ev, () => { 
                setTimeout(() => { 
                    if (id === 'roleType') {
                        handleRoleInterdependency();
                    }
                    compileLiveEditorView(); 
                    if (id === 'rtmToken' || id === 'recordingRtmToken') { 
                        processTokenState(); 
                    } 
                }, 10); 
            }); 
        }); 
    }); 

    // Token Generation via Tunnel
    if (btnGenerateTokens) { 
        btnGenerateTokens.addEventListener('click', async () => { 
            if (!window.currentTurnstileToken) { 
                alert('Security validation required. Please verify first before generating credentials.'); 
                return; 
            } 
            const durationMin = parseFloat(document.getElementById('duration')?.value) || 30; 
            const expireTimeInSeconds = Math.floor(durationMin * 60); 
            
            const corePayload = { 
                userUUID: document.getElementById('userUuid')?.value.trim() || null, 
                recorderUUID: document.getElementById('recordingUuid')?.value.trim() || null, 
                AppID: document.getElementById('appId')?.value.trim() || null, 
                AppCertificate: document.getElementById('appCertificate')?.value.trim() || null, 
                expireTime: expireTimeInSeconds 
            }; 

            if (!corePayload.userUUID && !corePayload.recorderUUID) { 
                alert('Please specify either a User UUID or a Recording UUID.'); 
                return; 
            } 

            try { 
                btnGenerateTokens.textContent = 'Generating Tokens...'; 
                btnGenerateTokens.disabled = true; 
                
                const result = await sendRequest({ 
                    url: CONFIG.TOKEN_GENERATOR_URL, 
                    method: 'POST', 
                    body: JSON.stringify(corePayload), 
                    token: '' 
                }); 

                if (!result.ok || !result.data.success) { 
                    throw new Error(result.data.details || result.data.error || 'Server processing engine fault.'); 
                } 

                if (result.data.userToken && rtmTokenInput) {
                    rtmTokenInput.value = result.data.userToken; 
                }
                if (result.data.recorderToken && recordingRtmTokenInput) {
                    recordingRtmTokenInput.value = result.data.recorderToken; 
                } 
                
                if (result.data.sessionPassToken) { 
                    sessionStorage.setItem('classroom_session_pass', result.data.sessionPassToken); 
                } 

                processTokenState(); 
                compileLiveEditorView(); 
            } catch (error) { 
                console.error('Token acquisition aborted:', error); 
                alert(`Token Generation Failed: ${error.message}`); 
            } finally { 
                btnGenerateTokens.textContent = 'Generate Security Tokens'; 
                btnGenerateTokens.disabled = false; 
            } 
        }); 
    } 

    // Copy Snippet Functional Event Block
    if (btnCopySnippet) {
        btnCopySnippet.addEventListener('click', () => {
            const codeBodyEl = document.getElementById('codeBody');
            if (!codeBodyEl) return;
            
            const plainTextSnippet = codeBodyEl.innerText;
            navigator.clipboard.writeText(plainTextSnippet).then(() => {
                btnCopySnippet.classList.add('copied');
                setTimeout(() => {
                    btnCopySnippet.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Could not copy syntax engine string text: ', err);
            });
        });
    }

    // Environment Form Submit Launcher 
    urlForm.addEventListener('submit', (event) => { 
        event.preventDefault(); 
        const appId = document.getElementById('appId').value.trim(); 
        const rawRegion = document.getElementById('region').value.toLowerCase(); 
        const roomUuid = document.getElementById('roomUuid').value.trim(); 
        const roomName = encodeURIComponent(document.getElementById('roomName').value.trim()); 
        const roomType = document.getElementById('roomType').value; 
        const userName = encodeURIComponent(document.getElementById('userName').value.trim()); 
        const durationMinutes = parseFloat(document.getElementById('duration').value) || 30; 
        const durationSeconds = Math.floor(durationMinutes * 60); 
        const activeRoleType = document.getElementById('roleType').value; 
        const userUUID = encodeURIComponent(document.getElementById('userUuid').value.trim()); 
        const userToken = encodeURIComponent(document.getElementById('rtmToken').value.trim()); 
        const recUuid = encodeURIComponent(document.getElementById('recordingUuid').value.trim()); 
        const recToken = encodeURIComponent(document.getElementById('recordingRtmToken').value.trim()); 
        
        const generatedRecordUrl = `${CONFIG.CLASSROOM_HOST}/?userUuid=${recUuid}&userName=${userName}&roomUuid=${roomUuid}&roomName=${roomName}&roleType=0&roomType=${roomType}&pretest=false&rtmToken=${recToken}&duration=${durationSeconds}&appId=${appId}&region=${rawRegion}&isRecorder=true`; 
        const encodedRecordUrl = encodeURIComponent(generatedRecordUrl); 
        
        const sessionPass = encodeURIComponent(sessionStorage.getItem('classroom_session_pass') || ''); 
        const classroomUrl = `${CONFIG.CLASSROOM_HOST}/?userUuid=${userUUID}&userName=${userName}&roomUuid=${roomUuid}&roomName=${roomName}&roleType=${activeRoleType}&roomType=${roomType}&pretest=false&rtmToken=${userToken}&language=en&duration=${durationSeconds}&appId=${appId}&region=${rawRegion}&recordUrl=${encodedRecordUrl}&recordingUuid=${recUuid}&recordingRtmToken=${recToken}&sessionPass=${sessionPass}`; 
        
        window.location.href = classroomUrl; 
    }); 

    // ========================================== 
    // 6. BOOTSTRAP SYSTEM STATE INITIALIZATION 
    // ========================================== 
    handleRoleInterdependency();
    compileLiveEditorView(); 
    processTokenState();
    setupFocusAnchoring();
    
    console.log('✅ App initialized successfully with config:', CONFIG);
}

// Start the app sequence
window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.cf-turnstile')?.classList.add('cf-turnstile');
  initApp();
});


