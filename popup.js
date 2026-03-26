document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveBtn = document.getElementById('saveBtn');
  const translateBtn = document.getElementById('translateBtn');
  const statusDiv = document.getElementById('status');
  const logToggle = document.getElementById('logToggle');

  // 🔥 API 키 마스킹 함수 (앞 6글자, 뒤 4글자만 노출)
  const maskKey = (key) => {
    if (!key || key.length < 15) return key;
    return key.substring(0, 6) + '•'.repeat(key.length - 10) + key.substring(key.length - 4);
  };

  // 저장된 키 및 로그 설정 불러오기
  let { apiKey, enableLogs } = await chrome.storage.local.get(['apiKey', 'enableLogs']);
  if (apiKey) {
    apiKeyInput.value = maskKey(apiKey); // 불러올 때 마스킹 처리
  }
  if (enableLogs) logToggle.checked = true;

  logToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ enableLogs: logToggle.checked });
  });

  // 🔥 입력창 클릭 시 마스킹된 텍스트 자동 삭제 (새 키 입력 편의성)
  apiKeyInput.addEventListener('focus', () => {
    if (apiKeyInput.value.includes('•')) {
      apiKeyInput.value = '';
    }
  });

  // API 키 저장 버튼
  saveBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    
    // 🔥 마스킹 문자가 포함되어 있다면 저장을 막음 (실수 방지)
    if (key.includes('•')) {
      statusDiv.innerText = "⚠️ 새로운 키를 붙여넣어 주세요.";
      statusDiv.style.color = "#f4b400"; // 경고색(노랑)
      setTimeout(() => statusDiv.innerText = "", 2000);
      return;
    }

    if (key) {
      await chrome.storage.local.set({ apiKey: key });
      apiKeyInput.value = maskKey(key); // 저장 직후 화면에는 마스킹 처리
      statusDiv.innerText = "✅ API 키가 저장되었습니다!";
      statusDiv.style.color = "#0f9d58";
      setTimeout(() => statusDiv.innerText = "", 2000);
    }
  });

  // 번역 실행 버튼
  translateBtn.addEventListener('click', async () => {
    let { apiKey } = await chrome.storage.local.get('apiKey');
    if (!apiKey) {
      statusDiv.innerText = "⚠️ API 키를 먼저 저장해주세요.";
      statusDiv.style.color = "#d93025";
      return;
    }

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.url.includes("acmicpc.net") || tab.url.includes("codeforces.com") || tab.url.includes("atcoder.jp")) {
      statusDiv.innerText = "번역을 시작합니다...";
      statusDiv.style.color = "#1a73e8";
      
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }, () => {
        window.close(); 
      });
    } else {
      statusDiv.innerText = "⚠️ 지원하지 않는 사이트입니다.";
      statusDiv.style.color = "#d93025";
    }
  });
});