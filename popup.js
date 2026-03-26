document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveBtn = document.getElementById('saveBtn');
  const translateBtn = document.getElementById('translateBtn');
  const statusDiv = document.getElementById('status');
  const logToggle = document.getElementById('logToggle');
  const modelSelect = document.getElementById('modelSelect'); // 🔥 Select 요소 가져오기

  const maskKey = (key) => {
    if (!key || key.length < 15) return key;
    return key.substring(0, 6) + '•'.repeat(key.length - 10) + key.substring(key.length - 4);
  };

  // 🔥 저장된 키, 로그 설정, 그리고 모델(aiModel) 불러오기
  let { apiKey, enableLogs, aiModel } = await chrome.storage.local.get(['apiKey', 'enableLogs', 'aiModel']);
  
  if (apiKey) {
    apiKeyInput.value = maskKey(apiKey); 
  }
  if (enableLogs) logToggle.checked = true;
  
  // 🔥 저장된 모델이 있으면 Select 값을 변경 (기본값은 flash-lite)
  if (aiModel) {
    modelSelect.value = aiModel;
  }

  logToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ enableLogs: logToggle.checked });
  });

  apiKeyInput.addEventListener('focus', () => {
    if (apiKeyInput.value.includes('•')) {
      apiKeyInput.value = '';
    }
  });

  // API 키 및 모델 저장 버튼
  saveBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const selectedModel = modelSelect.value; // 🔥 선택된 모델 가져오기
    
    if (key.includes('•')) {
      // 키를 수정하지 않고 모델만 변경한 경우
      await chrome.storage.local.set({ aiModel: selectedModel });
      statusDiv.innerText = "✅ 설정이 저장되었습니다!";
      statusDiv.style.color = "#0f9d58";
      setTimeout(() => statusDiv.innerText = "", 2000);
      return;
    }

    if (key) {
      // 키와 모델을 모두 저장
      await chrome.storage.local.set({ apiKey: key, aiModel: selectedModel });
      apiKeyInput.value = maskKey(key); 
      statusDiv.innerText = "✅ API 키와 설정이 저장되었습니다!";
      statusDiv.style.color = "#0f9d58";
      setTimeout(() => statusDiv.innerText = "", 2000);
    } else {
       // 키를 비우고 저장하려는 경우
       await chrome.storage.local.set({ aiModel: selectedModel });
       statusDiv.innerText = "✅ 모델 설정만 저장되었습니다.";
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