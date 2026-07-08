import { sendRequest } from './sendRequest.js'; 

export function initRestClient(container) { 
    if (!container) return; 

    // 1. Gather dynamic parameters straight from the current URL query parameters 
    const urlParams = new URLSearchParams(window.location.search); 
    const appId       = urlParams.get('appId') || '{{APPID}}'; 
    const roomUuid    = urlParams.get('roomUuid') || '{{roomUuid}}'; 
    const roomName    = urlParams.get('roomName') || 'Flexible Class'; 
    const userUuid    = urlParams.get('userUuid') || '{{userUuid}}'; 
    const roomType    = urlParams.get('roomType') || '4'; 
    const duration    = urlParams.get('duration') || '1800';         
    const rtmToken    = urlParams.get('rtmToken') || '{{signalToken}}'; 
    const roleType    = urlParams.get('roleType') || '0';

    // Fallback checks for both standard casing variations to ensure data capture
    const recordingUuid = urlParams.get('recordingUuid') || urlParams.get('recordingUUID') || '';
    const recordingRtmToken = urlParams.get('recordingRtmToken') || urlParams.get('recordingrtmToken') || '';
    const region      = urlParams.get('region') || 'ap'; 

    // Helper to resolve classroom host from sessionStorage-backed config
    function getClassroomHost() {
        try {
            const storedConfigJson = sessionStorage.getItem('APP_CONFIG');
            if (storedConfigJson) {
                const storedConfig = JSON.parse(storedConfigJson);
                return storedConfig.CLASSROOM_HOST || 'https://flexible-jun2026.vercel.app/classroom';
            }
        } catch (err) {
            console.warn('⚠️ Could not read CLASSROOM_HOST from sessionStorage:', err);
        }
        return 'https://flexible-jun2026.vercel.app/classroom';
    }

    // 2. Inject Stacked UI Component Styles 
    const styleId = 'rest-client-styles'; 
    if (!document.getElementById(styleId)) { 
        const style = document.createElement('style'); 
        style.id = styleId; 
        style.innerHTML = ` 
        .rest-module-workspace { width: 100%; height: 100%; background: #ffffff; box-sizing: border-box; padding: 16px; overflow-y: auto; } 
        .macro-grid { display: flex; flex-direction: column; gap: 16px; width: 100%; } 
        .macro-card { background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px; } 
        .macro-title { font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; } 
        .macro-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; } 
        .input-sub-group { display: flex; flex-direction: column; gap: 4px; flex-grow: 1; min-width: 200px; } 
        .input-sub-group label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; } 
        .rest-select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #fff; outline: none; min-width: 160px; } 
        .rest-field-input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; background: #ffffff; } 
        .rest-btn { background: #2563eb; color: #fff; border: none; padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; flex-grow: 1; transition: background 0.15s; height: 38px; } 
        .rest-btn:hover { background: #1d4ed8; } 
        .live-curl-preview-box { background: #1e293b; color: #cbd5e1; padding: 10px 12px; border-radius: 6px; font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-all; border-left: 4px solid #38bdf8; margin-top: 4px; max-height: 180px; overflow-y: auto; } 
        .console-block { display: flex; flex-direction: column; background: #0f172a; border-radius: 6px; overflow: hidden; margin-top: 4px; width: 100%; } 
        .console-header { font-size: 11px; color: #94a3b8; text-transform: uppercase; background: #1e293b; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; } 
        .console-output { white-space: pre-wrap; font-size: 12px; color: #34d399; margin: 0; padding: 12px; max-height: 160px; overflow-y: auto; font-family: monospace; } 
        .console-output-expanded { max-height: 380px; } 
        .status-badge { padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; } 
        .status-success { background: #065f46; color: #34d399; } 
        .status-error { background: #991b1b; color: #f87171; } 
        `; 
        document.head.appendChild(style); 
    } 

    // 3. Render Markup Layout Context 
    container.innerHTML = ` 
    <div class="rest-module-workspace"> 
        <div class="macro-grid"> 
            <div class="macro-card"> 
                <div class="macro-title">1. Set Classroom State</div> 
                <div class="macro-row"> 
                    <select class="rest-select" id="classroomStateSelect"> 
                        <option value="0">0: Not started</option> 
                        <option value="1">1: Started</option> 
                        <option value="2">2: Ended</option> 
                        <option value="3">3: Room is closed</option> 
                    </select> 
                    <button class="rest-btn" id="btnClassroomState">Execute PUT Request</button> 
                </div> 
                <div class="console-block"> 
                    <div class="console-header"> 
                        <span>Response Output</span> 
                        <span id="statusClassroomState"></span> 
                    </div> 
                    <pre class="console-output" id="outClassroomState">// Awaiting target execution...</pre> 
                </div> 
            </div> 
            <div class="macro-card"> 
                <div class="macro-title">2. Set Recording State</div> 
                <div class="macro-row"> 
                    <div class="input-sub-group"> 
                        <label>recordingUUID (Unique User ID)</label> 
                        <input type="text" class="rest-field-input" id="recordingUUID" value="${recordingUuid}"> 
                    </div> 
                    <div class="input-sub-group"> 
                        <label>recordingrtmToken</label> 
                        <input type="text" class="rest-field-input" id="recordingrtmToken" value="${recordingRtmToken}"> 
                    </div> 
                </div> 
                <div class="macro-row" style="margin-top: 4px;"> 
                    <select class="rest-select" id="recordingStateSelect" style="height: 38px;"> 
                        <option value="1">State 1 (Start)</option> 
                        <option value="0">State 0 (Stop)</option> 
                    </select> 
                    <button class="rest-btn" id="btnRecordingState">Execute PUT Request</button> 
                </div> 
                <div class="macro-title" style="margin-top: 4px; color: #0284c7;">Live Outbound cURL Transaction Preview</div> 
                <div class="live-curl-preview-box" id="curlPreviewWindow">Generating live packet representation structures...</div> 
                <div class="console-block"> 
                    <div class="console-header"> 
                        <span>Response Output</span> 
                        <span id="statusRecordingState"></span> </div> 
                    <pre class="console-output" id="outRecordingState">// Awaiting target execution...</pre> 
                </div> 
            </div> 
            <div class="macro-card"> 
                <div class="macro-title">3. Recording Utilities</div> 
                <div class="macro-row"> 
                    <button class="rest-btn" id="btnGetRecordings">Fetch Recording Files List (GET)</button> 
                </div> 
                <div class="console-block"> 
                    <div class="console-header"> 
                        <span>Response Output</span> 
                        <span id="statusGetRecordings"></span> </div> 
                    <pre class="console-output console-output-expanded" id="outGetRecordings">// Awaiting target execution...</pre> 
                </div> 
            </div> 
        </div> 
    </div> `; 

    // References to UI Target element nodes 
    const recUUIDInput   = container.querySelector('#recordingUUID'); 
    const recTokenInput  = container.querySelector('#recordingrtmToken'); 
    const recStateSelect = container.querySelector('#recordingStateSelect'); 
    const curlPreviewBox = container.querySelector('#curlPreviewWindow'); 

    // --- Dynamic Live cURL Generation Preview Engine --- 
    function updateRecordingCurlPreview() { 
        const state = recStateSelect.value; 
        const currentUUID = recUUIDInput.value.trim() || userUuid; 
        const rawToken    = recTokenInput.value.trim() || rtmToken; 
        const encodedToken = encodeURIComponent(rawToken); 
        const encodedRoomName = encodeURIComponent(roomName); 
        const targetUrl = `https://api.agora.io/${region}/edu/apps/${appId}/v2/rooms/${roomUuid}/records/states/${state}`; 
        const classroomHost = getClassroomHost();
        const webUrl = `${classroomHost}/?userUuid=${currentUUID}&roomUuid=${roomUuid}&roomName=${encodedRoomName}&roleType=0&roomType=${roomType}&pretest=false&rtmToken=${encodedToken}&language=en&duration=${duration}&appId=${appId}&region=${region}&isRecorder=true`;
        const curlString = `curl --location -g --request PUT '${targetUrl}' \\\n` + `--header 'Authorization: agora token=${rtmToken}' \\\n` + `--data-raw '{\n` + `    "mode": "web",\n` + `    "webRecordConfig": {\n` + `        "url": "${webUrl}",\n` + `        "rootUrl": "https://flexible-jun2026.vercel.app",\n` + `        "publishRtmp": false,\n` + `        "onhold": false,\n` + `        "videoWidth": 1280,\n` + `        "videoHeight": 720,\n` + `        "videoBitrate": 2000,\n` + `        "videoFps": 15,\n` + `        "audioProfile": 0,\n` + `        "maxRecordingHour": 2\n` + `    },\n` + `    "retryTimeout": 60\n` + `}'`; 
        curlPreviewBox.textContent = curlString; 
    } 

    // Attach immediate input triggers to inputs for real-time tracking loops 
    recUUIDInput.addEventListener('input', updateRecordingCurlPreview); 
    recTokenInput.addEventListener('input', updateRecordingCurlPreview); 
    recStateSelect.addEventListener('change', updateRecordingCurlPreview); 

    // Initial first-run rendering sequence validation execution 
    updateRecordingCurlPreview(); 

    // Isolated Action Runner targeting specific sub-console nodes 
    async function runUIAction({ actionName, requestConfig, outputEl, statusEl }) { 
        outputEl.textContent = `Running [${actionName}] transaction pipeline...`; 
        outputEl.style.color = '#60a5fa'; 
        statusEl.innerHTML = ''; 
        try { 
            const result = await sendRequest(requestConfig); 
            const isSuccess = result.ok; 
            statusEl.innerHTML = `<span class="status-badge ${isSuccess ? 'status-success' : 'status-error'}">${result.statusText}</span>`; 
            outputEl.textContent = result.data; 
            outputEl.style.color = isSuccess ? '#34d399' : '#f87171'; 
        } catch (err) { 
            statusEl.innerHTML = `<span class="status-badge status-error">Local Failure</span>`; 
            outputEl.textContent = `Client routing capture error:\n${err.message}`; 
            outputEl.style.color = '#f87171'; 
        } 
    } 

    // --- Targeted Macro Bindings --- 
    // 1. Set Classroom State Click Handler 
    container.querySelector('#btnClassroomState').addEventListener('click', () => { 
        const selectedState = container.querySelector('#classroomStateSelect').value; 
        const targetUrl = `https://api.agora.io/${region}/edu/apps/${appId}/v2/rooms/${roomUuid}/states/${selectedState}`; 
        runUIAction({ actionName: 'Classroom State', requestConfig: { url: targetUrl, method: 'PUT', body: '', token: `agora token=${rtmToken}` }, outputEl: container.querySelector('#outClassroomState'), statusEl: container.querySelector('#statusClassroomState') }); 
    }); 

    // 2. Set Recording State Click Handler 
    container.querySelector('#btnRecordingState').addEventListener('click', () => { 
        const selectedState = recStateSelect.value; 
        const dynamicUserUuid = recUUIDInput.value.trim() || userUuid; 
        const rawRecordToken  = recTokenInput.value.trim() || rtmToken; 
        const cleanRecordToken = encodeURIComponent(rawRecordToken); 
        const encodedRoomName = encodeURIComponent(roomName); 
        const targetUrl = `https://api.agora.io/${region}/edu/apps/${appId}/v2/rooms/${roomUuid}/records/states/${selectedState}`; 
        const classroomHost = getClassroomHost();
        const webUrl = `${classroomHost}/?userUuid=${dynamicUserUuid}&roomUuid=${roomUuid}&roomName=${encodedRoomName}&roleType=0&roomType=${roomType}&pretest=false&rtmToken=${cleanRecordToken}&language=en&duration=${duration}&appId=${appId}&region=${region}&isRecorder=true`;
        const jsonPayload = { "mode": "web", "webRecordConfig": { "url": webUrl, "rootUrl": "https://flexible-jun2026.vercel.app", "publishRtmp": false, "onhold": false, "videoWidth": 1280, "videoHeight": 720, "videoBitrate": 2000, "videoFps": 15, "audioProfile": 0, "maxRecordingHour": 2 }, "retryTimeout": 60 };
        runUIAction({ actionName: 'Recording State', requestConfig: { url: targetUrl, method: 'PUT', body: JSON.stringify(jsonPayload), token: `agora token=${rtmToken}` }, outputEl: container.querySelector('#outRecordingState'), statusEl: container.querySelector('#statusRecordingState') }); 
    }); 

    // 3. Get Recording List Click Handler 
    container.querySelector('#btnGetRecordings').addEventListener('click', () => { 
        const targetUrl = `https://api.agora.io/${region}/edu/apps/${appId}/v2/rooms/${roomUuid}/records`; 
        runUIAction({ actionName: 'Get Recordings', requestConfig: { url: targetUrl, method: 'GET', body: '', token: `agora token=${rtmToken}` }, outputEl: container.querySelector('#outGetRecordings'), statusEl: container.querySelector('#statusGetRecordings') }); 
    }); 
}