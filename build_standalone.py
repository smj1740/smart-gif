# -*- coding: utf-8 -*-
"""index.html 에 CSS + gifenc + app 을 인라인하여 file:// 에서도 스크립트가 항상 로드되게 함."""
from pathlib import Path

css = Path("styles.css").read_text(encoding="utf-8")
gifenc = Path("lib/gifenc.js").read_text(encoding="utf-8")
app = Path("app.js").read_text(encoding="utf-8")

html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>스마트 GIF 생성기 | 국립한국해양대학교</title>
  <style>
{css}
  </style>
</head>
<body>
  <div class="ocean-bg" aria-hidden="true">
    <div class="sun"></div>
    <div class="cloud cloud-a"></div>
    <div class="cloud cloud-b"></div>
    <div class="cloud cloud-c"></div>
    <div class="bird bird-1"></div>
    <div class="bird bird-2"></div>
    <div class="wave wave-1"></div>
    <div class="wave wave-2"></div>
    <div class="wave wave-3"></div>
    <div class="bubble b1"></div>
    <div class="bubble b2"></div>
    <div class="bubble b3"></div>
    <div class="bubble b4"></div>
    <div class="bubble b5"></div>
  </div>

  <header class="site-header">
    <a class="logo-link" href="https://kmou.ac.kr/" target="_blank" rel="noopener noreferrer" title="국립한국해양대학교">
      <img src="assets/kmou-logo.png" alt="Korea Maritime and Ocean University" class="logo-img" />
    </a>
    <div class="header-text">
      <p class="header-badge">국립한국해양대학교</p>
      <h1 class="site-title">스마트 GIF 생성기</h1>
    </div>
  </header>

  <main class="main">
    <section id="dropzone" class="dropzone" tabindex="0" aria-label="동영상 업로드 영역">
      <div class="dropzone-mascots" aria-hidden="true">
        <figure class="haeyangi-movie left">
          <img src="assets/haeyangi-movie.png" alt="" />
          <span class="pop-sparkle">♪</span>
        </figure>
        <div class="dropzone-core">
          <button type="button" id="videoToGifBtn" class="video-to-gif-btn">Video To GiF</button>
          <p class="drop-hint">동영상 파일을 이곳에 드래그 앤 드롭하세요</p>
          <p class="drop-subhint">또는 위 문구 / 아래 포맷 아이콘을 클릭하여 파일을 선택하세요</p>
          <p id="statusLine" class="status-line"></p>
        </div>
        <figure class="haeyangi-movie right">
          <img src="assets/haeyangi-movie.png" alt="" />
          <span class="pop-sparkle">✦</span>
        </figure>
      </div>
    </section>

    <section class="formats-section">
      <h2 class="formats-title">변환 가능한 동영상 파일 포맷</h2>
      <p class="formats-desc">아이콘을 누르면 해당 포맷 파일만 선택할 수 있습니다. 재생 불가 코덱은 자동 변환을 시도합니다.</p>
      <div id="formatIcons" class="format-icons"></div>
    </section>

    <section id="editorSection" class="editor-section hidden">
      <h2 class="section-heading">동영상 미리보기 &amp; 구간 설정</h2>
      <div class="video-wrap">
        <video id="previewVideo" class="preview-video" controls playsinline></video>
      </div>

      <div class="trim-panel">
        <div class="trim-labels">
          <span>시작 <strong id="startLabel">0.0초</strong></span>
          <span>선택 길이 <strong id="rangeLabel">0.0초</strong></span>
          <span>종료 <strong id="endLabel">0.0초</strong></span>
        </div>
        <div class="trim-slider" id="trimSlider">
          <div class="trim-track">
            <div class="trim-range" id="trimRange"></div>
          </div>
          <input type="range" id="startRange" class="trim-input start" min="0" max="100" step="0.1" value="0" />
          <input type="range" id="endRange" class="trim-input end" min="0" max="100" step="0.1" value="100" />
        </div>
        <p class="trim-hint">양쪽 핸들을 드래그하여 GIF로 만들 구간(시작~종료)을 선택하세요. (최대 20초)</p>
        <button type="button" id="convertBtn" class="convert-btn">GIF 변환 시작</button>
      </div>

      <h3 class="section-heading sub">업로드 파일 정보</h3>
      <dl id="fileInfo" class="file-info"></dl>
    </section>

    <section id="convertSection" class="convert-section hidden">
      <div class="progress-row">
        <div class="progress-wrap">
          <div class="progress-label-row">
            <span>변환 진행률</span>
            <span id="progressText">0%</span>
          </div>
          <div class="progress-stage">
            <div id="haeyangiRunner" class="haeyangi-runner" aria-hidden="true">
              <img src="assets/haeyangi-run.png" alt="" class="haeyangi-runner-img" />
            </div>
            <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <div id="progressBar" class="progress-bar"></div>
            </div>
          </div>
        </div>
        <button type="button" id="downloadBtn" class="download-btn" disabled>다운로드</button>
      </div>

      <div class="preview-area">
        <h3 class="preview-title">프레임 미리보기</h3>
        <div id="framePreview" class="frame-preview">
          <p class="preview-placeholder">변환이 시작되면 생성된 프레임이 여기에 표시됩니다.</p>
        </div>
      </div>
    </section>

    <section class="library-section">
      <div class="library-tabs" role="tablist">
        <button type="button" class="library-tab active" data-tab="gallery" id="tabGallery">GIF 갤러리</button>
        <button type="button" class="library-tab" data-tab="history" id="tabHistory">히스토리</button>
      </div>

      <div id="galleryPanel" class="library-panel">
        <div class="library-toolbar">
          <p class="library-desc">내가 만든 GIF를 모아서 볼 수 있습니다. 카드에 마우스를 올리면 삭제(×) 버튼이 나타납니다.</p>
          <button type="button" id="pickGalleryFolderBtn" class="folder-btn">저장 폴더 선택</button>
        </div>
        <p id="galleryFolderLabel" class="folder-label">저장 폴더: 아직 선택되지 않음</p>
        <div id="galleryGrid" class="gallery-grid">
          <p class="gallery-empty">아직 저장된 GIF가 없습니다. 변환 후 다운로드하면 갤러리에 추가됩니다.</p>
        </div>
      </div>

      <div id="historyPanel" class="library-panel hidden">
        <p class="library-desc">업로드·변환·다운로드·삭제 기록을 확인할 수 있습니다.</p>
        <ul id="historyList" class="history-list">
          <li class="history-empty">아직 기록이 없습니다.</li>
        </ul>
      </div>
    </section>
  </main>

  <div id="errorModal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="errorTitle">
    <div class="modal-card">
      <p id="errorTitle" class="modal-message">변환 불가능한 파일입니다</p>
      <button type="button" id="errorConfirmBtn" class="modal-confirm">확인</button>
    </div>
  </div>

  <div id="deleteModal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="deleteTitle">
    <div class="modal-card delete-card">
      <p id="deleteTitle" class="modal-message delete-warn">정말 삭제하시겠습니까?</p>
      <p id="deleteWarnDetail" class="delete-warn-detail"></p>
      <p id="deleteFileName" class="delete-filename"></p>
      <div class="modal-actions">
        <button type="button" id="deleteCancelBtn" class="modal-cancel">취소</button>
        <button type="button" id="deleteConfirmBtn" class="modal-danger">삭제</button>
      </div>
    </div>
  </div>

  <!-- FFmpeg: 가능하면 로드 (특수 코덱 자동 변환). 실패해도 기본 변환은 동작 -->
  <script src="lib/ffmpeg/ffmpeg.js"></script>
  <script src="lib/ffmpeg/util.js"></script>
  <script>
{gifenc}
  </script>
  <script>
{app}
  </script>
</body>
</html>
"""

Path("index.html").write_bytes(html.encode("utf-8"))
print("built", Path("index.html").stat().st_size)
