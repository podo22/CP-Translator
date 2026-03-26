<div align="center">
  <h1>🌐 CP Translator</h1>

![Version](https://img.shields.io/badge/version-1.2-blue.svg)
![Chrome](https://img.shields.io/badge/Browser-Chrome-4285F4?logo=GoogleChrome&logoColor=white)
![Gemini API](https://img.shields.io/badge/AI-Gemini_API-8E75B2?logo=GoogleGemini&logoColor=white)

**CP Translator**는 백준(BOJ), Codeforces, AtCoder의 외국어 문제 지문을 **수식과 HTML 훼손 없이 한국어로 번역**해 주는 크롬 확장 프로그램입니다.

<img width="1500" height="1000" alt="Image" src="https://github.com/user-attachments/assets/644328e8-f370-46ee-9159-4ddb06c42780" />

</div>

---

## ✨ 주요 기능 (Key Features)

* **🚀 실시간 스트리밍 번역 (SSE)**
  * Gemini API의 스트리밍 응답을 받아 화면에 번역 결과를 실시간으로 렌더링합니다.
* **🛡️ 수식 보호 및 렌더링**
  * 각 사이트의 렌더링 엔진(MathJax v2/v3, KaTeX)과 수식 기호를 분석하여, AI 번역 과정에서 수식이 깨지거나 훼손되는 것을 방지합니다.
* **⚙️ 맞춤형 번역 모델 선택**
  * **⚡ 스피드 모드 (Flash-Lite):** 대회 중 빠르게 지문을 파악해야 할 때 유용합니다.
  * **🎯 정확도 모드 (Flash):** 복잡한 스토리텔링이 포함된 지문을 자연스럽게 읽고 싶을 때 사용합니다.
* **🖼️ 이미지 및 레이아웃 유지**
  * 원본 문제의 이미지 상대 경로를 절대 경로로 변환하여, 번역 후에도 엑스박스나 레이아웃 깨짐이 발생하지 않습니다.
---

## 🎯 지원 플랫폼 (Supported Sites)
| Platform | URL | Note |
| :--- | :--- | :--- |
| **Baekjoon Online Judge** | [acmicpc.net](https://www.acmicpc.net/) |  |
| **Codeforces** | [codeforces.com](https://codeforces.com/) |  |
| **AtCoder** | [atcoder.jp](https://atcoder.jp/) |  |

---

## 🚀 사용 방법 (Usage)
* [Google AI Studio](https://aistudio.google.com/app/api-keys)에 접속하여 무료 Gemini API 키를 발급받습니다.

* 크롬 우측 상단의 확장 프로그램 아이콘을 눌러 CP Translator 팝업창을 엽니다.

* 발급받은 API 키를 입력하고 [설정 저장]을 누릅니다. (필요에 따라 스피드/정확도 모드를 선택하세요.)

* 문제 페이지에 접속한 뒤, 팝업창의 [🚀 현재 페이지 번역하기] 버튼을 클릭합니다.

---
