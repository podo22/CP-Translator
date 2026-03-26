const LOG_PREFIX = "[CP Translator | Background]";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'renderMathJax') {
    chrome.storage.local.get('enableLogs', ({ enableLogs }) => {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        world: 'MAIN',
        args: [enableLogs],
        func: (debugMode) => {
          const PREFIX = "[CP Translator | MAIN World]";
          const log = (msg) => { if (debugMode) console.info(PREFIX + " " + msg); };
          
          setTimeout(() => {
            const boxes = document.querySelectorAll('.cp-trans-box');
            if (boxes.length === 0) return;

            // 1. AtCoder (KaTeX) 대응[cite: 6, 8]
            if (window.renderMathInElement) {
              log("KaTeX 엔진 감지됨. 회색 박스 강제 렌더링 시작...");
              boxes.forEach(box => {
                window.renderMathInElement(box, {
                  delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "\\(", right: "\\)", display: false},
                    {left: "\\[", right: "\\]", display: true}
                  ],
                  // 🔥 핵심: pre, code 태그 안에서도 수식을 렌더링하도록 설정
                  ignoredTags: ["script", "noscript", "style", "textarea", "option"], 
                  throwOnError: false
                });
              });
            } 
            // 2. Baekjoon/Codeforces (MathJax) 대응[cite: 5, 7]
            else if (window.MathJax) {
              log(`MathJax 엔진 감지됨. (버전: ${window.MathJax.version || 'v2'})`);
              if (window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise(Array.from(boxes));
              } else if (window.MathJax.Hub) {
                boxes.forEach(box => window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, box]));
              }
            }
          }, 400);
        }
      });
    });
  }
});