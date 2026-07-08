import { initRestClient } from './restClient.js'; 

const urlParams = new URLSearchParams(window.location.search); 

// 1. Detect if it's the Agora recording bot or restricted role structures
const isRecorderBot = urlParams.get('isRecorder') === 'true'; 
const roleType     = parseInt(urlParams.get('roleType'), 10); 

if (isRecorderBot) { 
  document.body.setAttribute('data-recorder', 'true'); 
} else if (roleType === 0 || roleType === 2 || roleType === 3) { 
  document.body.setAttribute('data-recorder', 'true'); 
} 

// 2. Extract values cleanly from URL parameters
const appId      = urlParams.get('appId'); 
const userUuid   = urlParams.get('userUuid'); 
const userName   = urlParams.get('userName') || (isRecorderBot ? 'Recording Bot' : 'User'); 
const roomUuid   = urlParams.get('roomUuid'); 
const roomName   = urlParams.get('roomName'); 
const rtmToken   = urlParams.get('rtmToken'); 
const roomType   = parseInt(urlParams.get('roomType'), 10); 
const duration   = parseInt(urlParams.get('duration'), 10); 
const pretest    = false; 
const language   = urlParams.get('language') || 'en'; 
const recordUrl  = urlParams.get('recordUrl') || ''; 
const region     = (urlParams.get('region') || 'AP').toUpperCase(); 

function getLandingPageUrl() {
  try {
    const storedConfigJson = sessionStorage.getItem('APP_CONFIG');
    if (storedConfigJson) {
      const storedConfig = JSON.parse(storedConfigJson);
      return storedConfig.LANDING_PAGE_URL || 'https://flexible-jun2026.vercel.app';
    }
  } catch (err) {
    console.warn('⚠️ Could not read LANDING_PAGE_URL from sessionStorage:', err);
  }
  return 'https://flexible-jun2026.vercel.app';
}

function handleExitRedirect() { 
  const rootEl = document.querySelector("#root"); 
  if (rootEl) rootEl.innerHTML = ''; 
  window.location.href = getLandingPageUrl(); 
} 

// Intercept browser tab close / reload attempts safely
window.addEventListener('beforeunload', (event) => { 
  const confirmationMessage = 'Do you wanna leave the classroom?'; 
  event.preventDefault(); 
  event.returnValue = confirmationMessage; 
  return confirmationMessage; 
}); 

// --- Core Draggable Bottom Sheet Drawer UI Mechanics --- 
const sheet = document.getElementById('bottomSheet'); 
const header = document.getElementById('sheetHeader'); 
let isDragging = false; 
let startY = 0; 
let currentY = 440; 
const minTranslation = 0; 
const maxTranslation = 440; 

function dragStart(e) { 
  isDragging = true; 
  sheet.classList.remove('handling-transition'); 
  startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY; 
} 

function dragMove(e) { 
  if (!isDragging) return; 
  const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY; 
  const deltaY = clientY - startY; 
  let newY = currentY + deltaY; 
  
  if (newY < minTranslation) newY = minTranslation; 
  if (newY > maxTranslation) newY = maxTranslation; 
  sheet.style.transform = `translateY(${newY}px)`; 
} 

function dragEnd() { 
  if (!isDragging) return; 
  isDragging = false; 
  sheet.classList.add('handling-transition'); 
  
  if (sheet.getBoundingClientRect().top < (window.innerHeight - 220)) { 
    sheet.style.transform = `translateY(${minTranslation}px)`; 
    currentY = minTranslation; 
  } else { 
    sheet.style.transform = `translateY(${maxTranslation}px)`; 
    currentY = maxTranslation; 
  } 
} 

header.addEventListener('mousedown', dragStart); 
window.addEventListener('mousemove', dragMove); 
window.addEventListener('mouseup', dragEnd); 

header.addEventListener('touchstart', dragStart, { passive: true }); 
window.addEventListener('touchmove', dragMove, { passive: false }); 
window.addEventListener('touchend', dragEnd); 


// --- Instructions Modal Overlay Control and Baseline Fix Link --- 
const modal = document.getElementById('instructionModal'); 
const openBtn = document.getElementById('openModalBtn'); 
const closeBtn = document.getElementById('closeModalBtn'); 
const modalContent = modal ? modal.querySelector('.modal-content') : null; 

openBtn.addEventListener('click', () => { 
  modal.classList.add('is-active'); 
  
  // FIXED: Forces the browser view baseline calculation to look directly at the absolute top frame 
  if (modalContent) { 
    modalContent.scrollTop = 0; 
  } 
}); 

closeBtn.addEventListener('click', () => { 
  modal.classList.remove('is-active'); 
}); 

modal.addEventListener('click', (e) => { 
  if (e.target === modal) { 
    modal.classList.remove('is-active'); 
  } 
}); 


// --- 3. MOUNT REST CLIENT FOR PHYSICAL INTEGRATION DEMOS ONLY --- 
if (typeof initRestClient === 'function' && !isRecorderBot) { 
  initRestClient(document.getElementById('restWorkspaceMount')); 
} 

// Configure and mount Agora Cloud Infrastructure 
AgoraEduSDK.config({ 
  appId: appId, 
  region: region 
}); 

// Launch Active Live Classroom Sandbox 
AgoraEduSDK.launch(document.querySelector("#root"), { 
  userUuid: userUuid, 
  userName: userName, 
  roomUuid: roomUuid, 
  roomName: roomName, 
  roleType: roleType, 
  roomType: roomType, 
  pretest: pretest, 
  rtmToken: rtmToken, 
  language: language, 
  duration: duration, 
  recordUrl: recordUrl, 
  courseWareList: [], 
  virtualBackgroundImages: [], 
  webrtcExtensionBaseUrl: 'https://solutions-apaas.agora.io/static', 
  uiMode: 'light', 
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
    console.log("Agora SDK Event Triggered:", evt, args); 
    if ( 
      (evt === 'onRoomAction' && args && args.action === 'exit') || 
      (evt === 'FcrRoomStateChanged' && args === 'destroyed') || 
      (evt === 'classroom-state-changed' && args === 3) || 
      (evt === 2) 
    ) { 
      handleExitRedirect(); 
    } else if (evt === 1) { 
      AgoraEduSDK.setRecordReady(); // Lifecycle acknowledgment registration flag 
    } 
  } 
});