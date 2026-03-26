const LOG_PREFIX = "[CP Translator | Background]";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'renderMathJax') {
    
    // 🔥 스토리지에서 디버그 스위치가 켜져 있는지 확인
    chrome.storage.local.get('enableLogs', ({ enableLogs }) => {
      if (enableLogs) console.info(`${LOG_PREFIX} content.js로부터 'renderMathJax' 신호 수신. (요청 탭 ID: ${sender.tab.id})`);

      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        world: 'MAIN', 
        args: [enableLogs], // 🔥 체크박스 값을 MAIN World 함수 안으로 전달!
        func: (debugMode) => {
          const PREFIX = "[CP Translator | MAIN World]";
          
          // 🔥 debugMode(체크박스)가 true일 때만 출력하는 맞춤형 로거
          const log = (msg, ...args) => { if (debugMode) console.info(PREFIX + " " + msg, ...args); };
          const warn = (msg, ...args) => { if (debugMode) console.warn(PREFIX + " ⚠️ " + msg, ...args); };
          const err = (msg, ...args) => { if (debugMode) console.error(PREFIX + " ❌ " + msg, ...args); };

          log("렌더링 스크립트 실행됨. DOM 업데이트를 위해 300ms 대기...");

          setTimeout(() => {
            if (!window.MathJax) {
              warn("window.MathJax 객체를 찾을 수 없습니다. (수식이 없는 페이지거나 엔진이 다름)");
              return;
            }

            log(`MathJax 엔진 발견. (버전: ${window.MathJax.version || "알 수 없음"})`);

            const boxes = Array.from(document.querySelectorAll('.cp-trans-box'));
            if (boxes.length === 0) {
              warn("렌더링할 번역 박스(.cp-trans-box)를 찾을 수 없습니다.");
              return;
            }

            log(`총 ${boxes.length}개의 번역 박스 렌더링을 시작합니다.`);

            try {
              if (window.MathJax.typesetPromise) {
                log("MathJax v3 (typesetPromise) 방식으로 변환 시도...");
                window.MathJax.typesetPromise(boxes)
                  .then(() => log("렌더링 완벽 성공! 🚀"))
                  .catch(e => err("typesetPromise 에러:", e));
              } 
              else if (window.MathJax.typeset) {
                log("MathJax v3 (typeset) 방식으로 변환 시도...");
                window.MathJax.typeset(boxes);
                log("렌더링 완벽 성공! 🚀");
              } 
              else if (window.MathJax.Hub && window.MathJax.Hub.Typeset) {
                log("MathJax v2 (Hub.Typeset) 방식으로 변환 시도...");
                boxes.forEach(box => window.MathJax.Hub.Typeset(box));
                log("렌더링 완벽 성공! 🚀");
              } 
              else {
                err("호환되는 MathJax 렌더링 함수를 찾을 수 없습니다. 현재 구조:", window.MathJax);
              }
            } catch (err) {
              err("렌더링 실행 중 치명적 크래시 발생:", err);
            }
          }, 300);
        }
      }).then(() => {
        if (enableLogs) console.info(`${LOG_PREFIX} ✔️ MAIN World로 렌더링 스크립트 발사 성공.`);
      }).catch(err => {
        if (enableLogs) console.error(`${LOG_PREFIX} ❌ MAIN World 스크립트 실행 권한 에러:`, err);
      });
    });
  }
});