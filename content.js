(async () => {
  document.querySelectorAll('.cp-trans-box').forEach(el => el.remove());

  const host = window.location.hostname;
  const isCF = host.includes("codeforces.com");
  const isAC = host.includes("atcoder.jp");
  const isBOJ = host.includes("acmicpc.net");

  // 1. 수식 기호를 사이트별 원본 텍스트로 치환 및 이미지 URL 백업
  const unrenderMathHTML = (clone, imgSrcs) => {
    if (!clone) return "";
    
    // 이미지 환각 방지를 위한 URL 분리 로직
    clone.querySelectorAll('img').forEach((img, i) => {
      img.src = img.src; // 상대 경로 -> 절대 경로 변환
      imgSrcs.push(img.src); // 원본 URL 백업
      img.setAttribute('data-cp-img', i); // 고유 인덱스 부여
      img.setAttribute('src', ''); // AI가 헷갈리지 않도록 비움 (토큰 절약)
    });

    // KaTeX 처리 (앳코더)
    clone.querySelectorAll('.katex').forEach(kt => {
      const ann = kt.querySelector('annotation');
      const target = kt.closest('.katex-display') || kt;
      if (ann && target.parentNode) {
        let tex = ann.textContent.trim();
        let isDisplay = kt.closest('.katex-display') !== null;
        let textNode = document.createTextNode(isDisplay ? `$$${tex}$$` : `\\(${tex}\\)`);
        target.parentNode.replaceChild(textNode, target);
      }
    });

    // MathJax v3 처리 (백준)
    clone.querySelectorAll('mjx-container').forEach(mjx => {
      const copytext = mjx.querySelector('.mjx-copytext');
      if (copytext && mjx.parentNode) {
        let tex = copytext.textContent.trim()
          .replace(/^(\$\$?|\\\[|\\\()/, '') 
          .replace(/(\$\$?|\\\]|\\\))$/, '')
          .trim();
        let isDisplay = mjx.getAttribute('display') === 'true';
        let textNode = document.createTextNode(isDisplay ? `$$${tex}$$` : `$${tex}$`);
        mjx.parentNode.replaceChild(textNode, mjx);
      }
    });

    // MathJax v2 및 기타 스크립트 처리 (코드포스)
    clone.querySelectorAll('script[type^="math/tex"]').forEach(script => {
      if (script.parentNode) {
        let tex = script.textContent.trim();
        let isDisplay = script.type.includes('mode=display');
        let textNode = document.createTextNode(isDisplay ? `$$$$$$${tex}$$$$$$` : `$$$${tex}$$$`);
        script.parentNode.replaceChild(textNode, script);
      }
    });

    clone.querySelectorAll('.MathJax_Preview, .MathJax, script, style').forEach(el => el.remove());
    return clone.innerHTML.trim(); 
  };

  // 🔥 스토리지에서 apiKey와 함께 aiModel도 가져오기 (없으면 기본값 설정)
  let { apiKey, aiModel } = await chrome.storage.local.get(['apiKey', 'aiModel']);
  if (!apiKey) return;
  
  // 사용자가 모델을 선택하지 않은 초기 상태라면 기본적으로 빠른 lite 모델을 사용
  const targetModel = aiModel || "gemini-2.5-flash-lite";

  const createBox = (target) => {
    let div = document.createElement('div');
    div.className = 'cp-trans-box tex2jax_ignore mathjax_ignore';
    div.style.cssText = "padding:15px; margin-top:15px; margin-bottom:15px; background:#f8f9fa; border-left:4px solid #007bff; font-size:16px; line-height: 1.6; overflow-x: auto; color: #666; font-style: italic;";
    div.innerHTML = "⌛ 번역 요청 중...";
    target.parentNode.insertBefore(div, target.nextSibling);
    return div;
  };

  let sections = [];
  
  if (isAC) { // AtCoder
    let root = document.querySelector('#task-statement .lang-en') || document.querySelector('#task-statement');
    root.querySelectorAll('.part').forEach((el, index) => {
      let h3 = el.querySelector('h3');
      if (h3 && (h3.innerText.toLowerCase().includes('sample') || h3.innerText.includes('예제'))) return;
      let imgSrcs = [];
      sections.push({ id: `ac_${index}`, raw: unrenderMathHTML(el.cloneNode(true), imgSrcs), box: createBox(el), imgSrcs: imgSrcs });
    });
  } else if (isCF) { // Codeforces
    let probEl = document.querySelector('.problem-statement');
    if (probEl) {
      Array.from(probEl.children).forEach((child, index) => {
        if (child.classList.contains('header') || child.classList.contains('sample-tests')) return;
        if (child.innerText.trim().length < 5) return;
        let imgSrcs = [];
        sections.push({ id: `cf_${index}`, raw: unrenderMathHTML(child.cloneNode(true), imgSrcs), box: createBox(child), imgSrcs: imgSrcs });
      });
    }
  } else if (isBOJ) { // Baekjoon
    // 백준 블랙리스트 강화 (첨부파일 영역 제외)
    const blacklist = ['#problem_tags', '#problem_memo', '#problem_custom_att', '#problem_source', '.problem-text .problem-text'];
    document.querySelectorAll('.problem-text').forEach((el, index) => {
      if (blacklist.some(selector => el.closest(selector))) return;
      let imgSrcs = [];
      sections.push({ id: `boj_${index}`, raw: unrenderMathHTML(el.cloneNode(true), imgSrcs), box: createBox(el), imgSrcs: imgSrcs });
    });
  }

  if (sections.length === 0) return;

  const fullPrompt = `다음 HTML 형태의 경쟁 프로그래밍 지문을 한국어로 번역해.
규칙:
1. HTML 태그(<table>, <tr>, <td>, <ul>, <p>, <strong>, <img> 등)는 절대 건드리지 말고 원본 HTML 뼈대를 그대로 유지해.
2. 텍스트 내의 수식 기호($, $$, $$$, \\(...\\), \\[...\\]) 안의 내용은 절대 번역하지 말고, 기호 자체도 원본 그대로 유지해.
3. 인사말이나 부연 설명 없이, 오직 번역된 HTML 텍스트만 출력해.
각 영역은 [ID: 영문아이디] 태그로 구분되어 있어. 번역할 때도 반드시 이 태그를 그대로 먼저 출력하고 그 아래에 번역된 HTML을 적어줘.\n\n` + 
  sections.map(s => `[ID: ${s.id}]\n${s.raw}`).join('\n\n');


  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    });

    if (res.status === 429) throw new Error("API 한도 초과 (1분 뒤 시도)");
    if (!res.ok) throw new Error(`API 오류 (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";
    let streamBuffer = ""; 

    while (true) {
      const { done, value } = await reader.read();
      if (done) break; 
      
      streamBuffer += decoder.decode(value, { stream: true });
      let lines = streamBuffer.split('\n');
      streamBuffer = lines.pop(); // 완성되지 않은 마지막 줄은 버퍼에 남김

      for (let line of lines) {
        if (!line.startsWith('data: ')) continue;
        let dataStr = line.replace(/^data:\s*/, '').trim();
        if (!dataStr) continue;

        try {
          let json = JSON.parse(dataStr);
          accumulatedText += json.candidates[0].content.parts[0].text;
          
          let regex = /\[ID:\s*([a-zA-Z0-9_-]+)\]([\s\S]*?)(?=\[ID:|$)/g;
          let match;
          while ((match = regex.exec(accumulatedText)) !== null) {
            let target = sections.find(s => s.id === match[1]);
            if (target) {
              let content = match[2].trim();
              target.box.style.color = "#333"; 
              target.box.style.fontStyle = "normal";
              target.box.innerHTML = content;

              // 🔥 번역이 끝난 후 이미지 원본 경로 완벽 복원
              target.box.querySelectorAll('img').forEach(img => {
                let idx = img.getAttribute('data-cp-img');
                if (idx !== null && target.imgSrcs[idx]) {
                  img.src = target.imgSrcs[idx];
                }
              });
            }
          }
        } catch (e) {
          // JSON 파싱 에러는 무시 (다음 청크에서 완성됨)
        }
      }
    }
    
    // 렌더링 준비
    document.querySelectorAll('.cp-trans-box').forEach(el => el.classList.remove('tex2jax_ignore', 'mathjax_ignore'));
    chrome.runtime.sendMessage({ action: 'renderMathJax' });
    
  } catch (e) {
    sections.forEach(s => { s.box.style.color = "#d93025"; s.box.innerHTML = `❌ ${e.message}`; });
  }
})();