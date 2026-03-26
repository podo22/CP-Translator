(async () => {
  document.querySelectorAll('.cp-trans-box').forEach(el => el.remove());

  const host = window.location.hostname;
  const isCF = host.includes("codeforces.com");

  const unrenderMathHTML = (clone) => {
    if (!clone) return "";
    
    clone.querySelectorAll('img').forEach(img => {
      img.src = img.src; 
    });

    clone.querySelectorAll('mjx-container').forEach(c => {
      let txt = c.querySelector('.mjx-copytext');
      txt ? c.parentNode.replaceChild(document.createTextNode(txt.textContent), c) : c.remove();
    });
    clone.querySelectorAll('.MathJax_Preview, .MathJax').forEach(el => el.remove());
    clone.querySelectorAll('script[type^="math/tex"]').forEach(script => {
      let isDisplay = script.type.includes('mode=display');
      let tex = script.textContent;
      
      let wrapper = document.createTextNode(
        isCF ? (isDisplay ? `$$$$$$${tex}$$$$$$` : `$$$${tex}$$$`) 
             : (isDisplay ? `$$${tex}$$` : `$${tex}$`)
      );
      script.parentNode.replaceChild(wrapper, script);
    });
    clone.querySelectorAll('script, style').forEach(n => n.remove());
    return clone.innerHTML.trim(); 
  };

  let { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) {
    alert("API 키가 설정되지 않았습니다. 확장 프로그램 아이콘을 눌러 키를 저장해 주세요.");
    return;
  }

  const createBox = (target) => {
    let div = document.createElement('div');
    // 🔥 투명망토 장착: 스트리밍 도중에는 앳코더/백준의 자동 MathJax 엔진이 이 상자를 건드리지 못함!
    div.className = 'cp-trans-box tex2jax_ignore mathjax_ignore';
    div.style.cssText = "padding:15px; margin-top:15px; margin-bottom:15px; background:#f8f9fa; border-left:4px solid #007bff; font-size:16px; line-height: 1.6; overflow-x: auto;";
    target.parentNode.insertBefore(div, target.nextSibling);
    return div;
  };

  let sections = [];

  if (host.includes("acmicpc.net")) {
    let allElements = Array.from(document.querySelectorAll('.problem-text'));
    let topLevelElements = allElements.filter(el => {
      let parent = el.parentElement;
      while (parent) {
        if (parent.classList.contains('problem-text')) return false;
        parent = parent.parentElement;
      }
      const blacklist = ['problem_custom_att', 'problem-memo-view'];
      if (el.closest('#problem_tags, #problem_custom_att, #problem-memo-view')) return false;
      if (blacklist.includes(el.id)) return false;
      if (el.innerText.trim() === "") return false;
      return true;
    });

    topLevelElements.forEach((el, index) => {
      let id = `boj_sec_${index}`;
      let box = createBox(el);
      box.innerHTML = "대기 중...";
      sections.push({ id: id, raw: unrenderMathHTML(el.cloneNode(true)), box: box });
    });
  } 
  else if (isCF) {
    let probEl = document.querySelector('.problem-statement');
    if (probEl) {
      Array.from(probEl.children).forEach((child, index) => {
        if (child.classList.contains('header') || child.classList.contains('sample-tests')) return;
        if (child.innerText.trim() === "") return;

        let id = `cf_sec_${index}`;
        let box = createBox(child);
        box.innerHTML = "대기 중...";
        sections.push({ id: id, raw: unrenderMathHTML(child.cloneNode(true)), box: box });
      });
    }
  } 
  else if (host.includes("atcoder.jp")) {
    // 🔥 일본어/영어 중복 추출 완벽 방지
    let parts = document.querySelectorAll('#task-statement .lang-en .part');
    if (parts.length === 0) {
      parts = document.querySelectorAll('#task-statement .part');
    }
    
    if (parts.length > 0) {
      Array.from(parts).forEach((el, index) => {
        let id = `ac_sec_${index}`;
        let box = createBox(el);
        box.innerHTML = "대기 중...";
        sections.push({ id: id, raw: unrenderMathHTML(el.cloneNode(true)), box: box });
      });
    } else {
      let probEl = document.querySelector('#task-statement');
      if (probEl) {
        let box = createBox(probEl);
        box.innerHTML = "대기 중...";
        sections.push({ id: 'ac_main', raw: unrenderMathHTML(probEl.cloneNode(true)), box: box });
      }
    }
  }

  if (sections.length === 0) {
    alert("번역할 지문을 찾을 수 없습니다.");
    return;
  }

  let fullPrompt = `다음 HTML 형태의 경쟁 프로그래밍 지문을 한국어로 번역해.
규칙:
1. HTML 태그(<table>, <tr>, <td>, <ul>, <p>, <strong>, <img> 등)는 절대 건드리지 말고 원본 HTML 뼈대를 그대로 유지해.
2. 수식($, $$, $$$, \\(...\\), \\[...\\])은 절대 번역하거나 훼손하지 마.
3. 인사말이나 부연 설명 없이, 오직 번역된 HTML 텍스트만 출력해.
각 영역은 [ID: 영문아이디] 태그로 구분되어 있어. 번역할 때도 반드시 이 태그를 그대로 먼저 출력하고 그 아래에 번역된 HTML을 적어줘.\n\n`;

  sections.forEach(sec => {
    fullPrompt += `[ID: ${sec.id}]\n${sec.raw}\n\n`;
    sec.box.innerHTML = "번역 요청 중..."; 
  });

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "", accumulatedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break; 
      
      buffer += decoder.decode(value, { stream: true });
      let parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop(); 
      
      for (let part of parts) {
        if (part.startsWith('data: ')) {
          let dataStr = part.substring(6).trim();
          if (!dataStr) continue;
          try {
            let data = JSON.parse(dataStr);
            accumulatedText += data.candidates[0].content.parts[0].text;
            
            let regex = /\[ID:\s*([a-zA-Z0-9_-]+)\]([\s\S]*?)(?=\[ID:|$)/g;
            let match;
            while ((match = regex.exec(accumulatedText)) !== null) {
              let id = match[1];
              let content = match[2].trim();
              let targetSec = sections.find(s => s.id === id);
              if (targetSec) {
                targetSec.box.innerHTML = content;
              }
            }
          } catch (e) { }
        }
      }
    }
    
    // 🔥 스트리밍이 완전히 끝난 후, 투명망토 해제!
    document.querySelectorAll('.cp-trans-box').forEach(el => {
      el.classList.remove('tex2jax_ignore', 'mathjax_ignore');
    });

    console.log("[Content] 스트리밍 및 HTML 렌더링 완료. 수식 렌더링 요청.");
    chrome.runtime.sendMessage({ action: 'renderMathJax' });
  } catch (e) {
    sections.forEach(sec => sec.box.innerHTML = "번역 실패: " + e.message);
  }
})();