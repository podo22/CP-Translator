(async () => {
  document.querySelectorAll('.cp-trans-box').forEach(el => el.remove());

  const host = window.location.hostname;
  const isCF = host.includes("codeforces.com");
  const isAC = host.includes("atcoder.jp");

  // 🔥 수식 기호를 완벽하게 제거하고 순수 TeX 내용만 뽑아내는 함수[cite: 7, 8, 9]
  const unrenderMathHTML = (clone) => {
    if (!clone) return "";
    clone.querySelectorAll('img').forEach(img => { img.src = img.src; });

    // KaTeX 처리 (앳코더)[cite: 8]
    clone.querySelectorAll('.katex').forEach(kt => {
      const ann = kt.querySelector('annotation');
      if (ann) {
        let tex = ann.textContent.trim();
        let isDisplay = kt.closest('.katex-display') !== null;
        let wrapper = document.createElement('math-tex');
        wrapper.setAttribute('display', isDisplay ? 'block' : 'inline');
        wrapper.textContent = tex;
        const target = kt.closest('.katex-display') || kt;
        target.parentNode.replaceChild(wrapper, target);
      }
    });

    // MathJax v3 처리 (백준)[cite: 9]
    clone.querySelectorAll('mjx-container').forEach(mjx => {
      const copytext = mjx.querySelector('.mjx-copytext');
      if (copytext) {
        let tex = copytext.textContent.trim().replace(/^\$\$?|\$\$?$/g, ''); // 🔥 기존 $ 기호 제거
        let isDisplay = mjx.getAttribute('display') === 'true';
        let wrapper = document.createElement('math-tex');
        wrapper.setAttribute('display', isDisplay ? 'block' : 'inline');
        wrapper.textContent = tex;
        mjx.parentNode.replaceChild(wrapper, mjx);
      }
    });

    // MathJax v2 및 기타 스크립트 처리 (코드포스)
    clone.querySelectorAll('script[type^="math/tex"]').forEach(script => {
      let tex = script.textContent.trim();
      let isDisplay = script.type.includes('mode=display');
      let wrapper = document.createElement('math-tex');
      wrapper.setAttribute('display', isDisplay ? 'block' : 'inline');
      wrapper.textContent = tex;
      script.parentNode.replaceChild(wrapper, script);
    });

    clone.querySelectorAll('.MathJax_Preview, .MathJax, script, style').forEach(el => el.remove());
    return clone.innerHTML.trim(); 
  };

  let { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) return;

  const createBox = (target) => {
    let div = document.createElement('div');
    div.className = 'cp-trans-box tex2jax_ignore mathjax_ignore';
    div.style.cssText = "padding:15px; margin-top:15px; margin-bottom:15px; background:#f8f9fa; border-left:4px solid #007bff; font-size:16px; line-height: 1.6; overflow-x: auto; color: #666; font-style: italic;";
    div.innerHTML = "⌛ 번역 요청 중...";
    target.parentNode.insertBefore(div, target.nextSibling);
    return div;
  };

  let sections = [];
  if (isAC) { // AtCoder 전용 파싱 (영어 지문만, 예제 제외)[cite: 6]
    let root = document.querySelector('#task-statement .lang-en') || document.querySelector('#task-statement');
    root.querySelectorAll('.part').forEach((el, index) => {
      let h3 = el.querySelector('h3');
      if (h3 && (h3.innerText.toLowerCase().includes('sample') || h3.innerText.includes('예제'))) return;
      sections.push({ id: `ac_${index}`, raw: unrenderMathHTML(el.cloneNode(true)), box: createBox(el) });
    });
  } else if (isCF) { // Codeforces 전용 파싱[cite: 5]
    let probEl = document.querySelector('.problem-statement');
    if (probEl) {
      Array.from(probEl.children).forEach((child, index) => {
        if (child.classList.contains('header') || child.classList.contains('sample-tests')) return;
        if (child.innerText.trim().length < 5) return;
        sections.push({ id: `cf_${index}`, raw: unrenderMathHTML(child.cloneNode(true)), box: createBox(child) });
      });
    }
  } else { // Baekjoon[cite: 9]
    document.querySelectorAll('.problem-text').forEach((el, index) => {
      if (el.parentElement.closest('.problem-text') || el.closest('#problem_tags')) return;
      sections.push({ id: `boj_${index}`, raw: unrenderMathHTML(el.cloneNode(true)), box: createBox(el) });
    });
  }

  if (sections.length === 0) return;

  const fullPrompt = `당신은 경쟁 프로그래밍 문제 번역가입니다. HTML 구조를 유지하며 한국어로 번역하세요.
규칙:
1. <math-tex> 태그 내부의 수식은 절대 번역하거나 수정하지 마세요.
2. <table>, <ul>, <img> 등 모든 HTML 태그는 원본 그대로 유지하세요.
3. [ID: 아이디] 형식을 반드시 지켜서 출력하세요.\n\n` + 
  sections.map(s => `[ID: ${s.id}]\n${s.raw}`).join('\n\n');

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    });

    if (res.status === 429) throw new Error("API 한도 초과 (1분 뒤 시도)");
    if (!res.ok) throw new Error(`API 오류 (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break; 
      let chunk = decoder.decode(value, { stream: true });
      chunk.split('data: ').forEach(data => {
        if (!data.trim()) return;
        try {
          let json = JSON.parse(data);
          accumulatedText += json.candidates[0].content.parts[0].text;
          let regex = /\[ID:\s*([a-zA-Z0-9_-]+)\]([\s\S]*?)(?=\[ID:|$)/g;
          let match;
          while ((match = regex.exec(accumulatedText)) !== null) {
            let target = sections.find(s => s.id === match[1]);
            if (target) {
              let content = match[2].trim();
              // 🔥 사이트별 수식 기호 완벽 복원
              content = content.replace(/<math-tex display="(.*?)">([\s\S]*?)<\/math-tex>/g, (m, disp, tex) => {
                if (isCF) return disp === 'block' ? `$$$$$$${tex}$$$$$$` : `$$$${tex}$$$`;
                if (isAC) return disp === 'block' ? `\\[${tex}\\]` : `\\(${tex}\\)`;
                return disp === 'block' ? `$$${tex}$$` : `$${tex}$`;
              });
              target.box.style.color = "#333"; target.box.style.fontStyle = "normal";
              target.box.innerHTML = content;
            }
          }
        } catch (e) {}
      });
    }
    document.querySelectorAll('.cp-trans-box').forEach(el => el.classList.remove('tex2jax_ignore', 'mathjax_ignore'));
    chrome.runtime.sendMessage({ action: 'renderMathJax' });
  } catch (e) {
    sections.forEach(s => { s.box.style.color = "#d93025"; s.box.innerHTML = `❌ ${e.message}`; });
  }
})();