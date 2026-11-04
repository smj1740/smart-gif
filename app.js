(() => {
  "use strict";

  const TARGET_FPS = 30;
  const MAX_GIF_WIDTH = 480;
  const MAX_CLIP_SEC = 20;
  const PREVIEW_EVERY_N = 5;
  const MAX_PREVIEW_FRAMES = 24;
  const MIN_CLIP_SEC = 0.2;

  const SUPPORTED_FORMATS = [
    { ext: "mp4", color: "#1aa6d6", label: "MP4" },
    { ext: "webm", color: "#2faf7d", label: "WebM" },
    { ext: "mov", color: "#6b5ce7", label: "MOV" },
    { ext: "m4v", color: "#3b8ddd", label: "M4V" },
    { ext: "ogv", color: "#e07a3a", label: "OGV" },
    { ext: "ogg", color: "#d4652a", label: "OGG" },
    { ext: "3gp", color: "#3f8f6b", label: "3GP" },
    { ext: "avi", color: "#c44c6a", label: "AVI" },
    { ext: "mkv", color: "#5a6fd6", label: "MKV" },
    { ext: "wmv", color: "#8a6d3b", label: "WMV" },
    { ext: "flv", color: "#d4552a", label: "FLV" },
    { ext: "mpeg", color: "#2a8f8f", label: "MPEG" },
    { ext: "mpg", color: "#2a7a8f", label: "MPG" },
  ];

  const ALL_EXTENSIONS = SUPPORTED_FORMATS.map((f) => `.${f.ext}`).join(",");
  const supportedExtSet = new Set(SUPPORTED_FORMATS.map((f) => f.ext));
  const MIME_BY_EXT = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    ogv: "video/ogg",
    ogg: "video/ogg",
    "3gp": "video/3gpp",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
  };

  const dropzone = document.getElementById("dropzone");
  const videoToGifBtn = document.getElementById("videoToGifBtn");
  const formatIcons = document.getElementById("formatIcons");
  const editorSection = document.getElementById("editorSection");
  const previewVideo = document.getElementById("previewVideo");
  const fileInfo = document.getElementById("fileInfo");
  const convertSection = document.getElementById("convertSection");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const progressTrack = document.querySelector(".progress-track");
  const haeyangiRunner = document.getElementById("haeyangiRunner");
  const downloadBtn = document.getElementById("downloadBtn");
  const convertBtn = document.getElementById("convertBtn");
  const framePreview = document.getElementById("framePreview");
  const errorModal = document.getElementById("errorModal");
  const errorConfirmBtn = document.getElementById("errorConfirmBtn");
  const errorTitle = document.getElementById("errorTitle");
  const startRange = document.getElementById("startRange");
  const endRange = document.getElementById("endRange");
  const trimRange = document.getElementById("trimRange");
  const startLabel = document.getElementById("startLabel");
  const endLabel = document.getElementById("endLabel");
  const rangeLabel = document.getElementById("rangeLabel");
  const statusLine = document.getElementById("statusLine");
  const tabGallery = document.getElementById("tabGallery");
  const tabHistory = document.getElementById("tabHistory");
  const galleryPanel = document.getElementById("galleryPanel");
  const historyPanel = document.getElementById("historyPanel");
  const galleryGrid = document.getElementById("galleryGrid");
  const historyList = document.getElementById("historyList");
  const pickGalleryFolderBtn = document.getElementById("pickGalleryFolderBtn");
  const galleryFolderLabel = document.getElementById("galleryFolderLabel");
  const deleteModal = document.getElementById("deleteModal");
  const deleteFileName = document.getElementById("deleteFileName");
  const deleteWarnDetail = document.getElementById("deleteWarnDetail");
  const deleteCancelBtn = document.getElementById("deleteCancelBtn");
  const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");

  const DB_NAME = "smart-gif-library";
  const DB_VERSION = 1;
  const supportsDirPicker = typeof window.showDirectoryPicker === "function";

  let gifBlob = null;
  let downloadName = "output.gif";
  let converting = false;
  let objectUrl = null;
  let currentFile = null;
  let videoDuration = 0;
  let ffmpegInstance = null;
  let ffmpegLoading = null;
  let dbPromise = null;
  let directoryHandle = null;
  let pendingDeleteId = null;
  const objectUrlCache = new Map();

  function setStatus(text) {
    if (statusLine) statusLine.textContent = text || "";
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("gallery")) {
          const store = db.createObjectStore("gallery", { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("history")) {
          const store = db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
    });
    return dbPromise;
  }

  function idbReq(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbPut(storeName, value) {
    const db = await openDb();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbDelete(storeName, key) {
    const db = await openDb();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(storeName, key) {
    const db = await openDb();
    return idbReq(db.transaction(storeName, "readonly").objectStore(storeName).get(key));
  }

  async function idbGetAll(storeName) {
    const db = await openDb();
    return idbReq(db.transaction(storeName, "readonly").objectStore(storeName).getAll());
  }

  function makeId() {
    return `gif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function formatDateTime(ts) {
    try {
      return new Date(ts).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (_) {
      return String(ts);
    }
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function addHistory(text) {
    try {
      await idbPut("history", { createdAt: Date.now(), text: String(text) });
      await renderHistory();
    } catch (err) {
      console.warn("history save failed:", err);
    }
  }

  async function renderHistory() {
    if (!historyList) return;
    const rows = (await idbGetAll("history")).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (!rows.length) {
      historyList.innerHTML = '<li class="history-empty">아직 기록이 없습니다.</li>';
      return;
    }
    historyList.innerHTML = rows
      .map(
        (row) => `
      <li class="history-item">
        <span class="history-time">${formatDateTime(row.createdAt)}</span>
        <p class="history-text">${escapeHtml(row.text)}</p>
      </li>`
      )
      .join("");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function revokeGalleryUrls() {
    objectUrlCache.forEach((url) => URL.revokeObjectURL(url));
    objectUrlCache.clear();
  }

  async function renderGallery() {
    if (!galleryGrid) return;
    revokeGalleryUrls();
    const items = (await idbGetAll("gallery")).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (!items.length) {
      galleryGrid.innerHTML =
        '<p class="gallery-empty">아직 저장된 GIF가 없습니다. 변환 후 다운로드하면 갤러리에 추가됩니다.</p>';
      return;
    }
    galleryGrid.innerHTML = items
      .map((item) => {
        const url = URL.createObjectURL(item.blob);
        objectUrlCache.set(item.id, url);
        return `
        <article class="gallery-card" data-id="${escapeHtml(item.id)}">
          <button type="button" class="gallery-delete" data-id="${escapeHtml(item.id)}" title="삭제" aria-label="GIF 삭제">×</button>
          <img src="${url}" alt="${escapeHtml(item.name)}" loading="lazy" />
          <div class="gallery-card-meta">
            <p class="gallery-card-name">${escapeHtml(item.name)}</p>
            <p class="gallery-card-sub">${formatDateTime(item.createdAt)} · ${formatBytes(item.size)}</p>
          </div>
        </article>`;
      })
      .join("");
  }

  function updateFolderLabel() {
    if (!galleryFolderLabel) return;
    if (directoryHandle) {
      galleryFolderLabel.textContent = `저장 폴더: ${directoryHandle.name}`;
    } else {
      galleryFolderLabel.textContent = supportsDirPicker
        ? "저장 폴더: 아직 선택되지 않음 (선택 시 다운로드 GIF가 해당 폴더에 저장되고, 갤러리에서 삭제하면 파일도 함께 지워집니다)"
        : "저장 폴더: 이 브라우저는 폴더 직접 저장/삭제를 지원하지 않습니다. 갤러리는 브라우저 저장소에만 보관됩니다.";
    }
  }

  async function ensureDirectoryPermission(handle, mode = "readwrite") {
    if (!handle) return false;
    if (handle.queryPermission) {
      const current = await handle.queryPermission({ mode });
      if (current === "granted") return true;
      if (handle.requestPermission) {
        const next = await handle.requestPermission({ mode });
        return next === "granted";
      }
    }
    return true;
  }

  async function loadDirectoryHandle() {
    try {
      const row = await idbGet("meta", "galleryFolder");
      if (row && row.value) {
        directoryHandle = row.value;
        const ok = await ensureDirectoryPermission(directoryHandle, "readwrite");
        if (!ok) directoryHandle = null;
      }
    } catch (err) {
      console.warn("folder restore failed:", err);
      directoryHandle = null;
    }
    updateFolderLabel();
  }

  async function pickGalleryFolder() {
    if (!supportsDirPicker) {
      showErrorModal("이 브라우저는 저장 폴더 선택을 지원하지 않습니다.");
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      const ok = await ensureDirectoryPermission(handle, "readwrite");
      if (!ok) {
        showErrorModal("폴더 쓰기 권한이 필요합니다.");
        return;
      }
      directoryHandle = handle;
      await idbPut("meta", { key: "galleryFolder", value: handle });
      updateFolderLabel();
      await addHistory(`저장 폴더 선택: ${handle.name}`);
      setStatus(`저장 폴더 설정됨: ${handle.name}`);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.error(err);
      showErrorModal("저장 폴더를 선택하지 못했습니다.");
    }
  }

  async function writeGifToFolder(blob, fileName) {
    if (!directoryHandle) return false;
    const ok = await ensureDirectoryPermission(directoryHandle, "readwrite");
    if (!ok) return false;
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  }

  async function deleteGifFromFolder(fileName) {
    if (!directoryHandle || !fileName) return false;
    const ok = await ensureDirectoryPermission(directoryHandle, "readwrite");
    if (!ok) return false;
    try {
      await directoryHandle.removeEntry(fileName);
      return true;
    } catch (err) {
      if (err && (err.name === "NotFoundError" || err.name === "NotAllowedError")) return false;
      throw err;
    }
  }

  function uniqueDiskName(baseName, existingNames) {
    const set = new Set(existingNames || []);
    if (!set.has(baseName)) return baseName;
    const stem = stripExtension(baseName) || "output";
    let i = 2;
    while (set.has(`${stem} (${i}).gif`)) i += 1;
    return `${stem} (${i}).gif`;
  }

  async function saveGifToLibrary(blob, name) {
    const items = await idbGetAll("gallery");
    const diskName = uniqueDiskName(name, items.map((it) => it.diskName || it.name));
    let savedToDisk = false;
    try {
      savedToDisk = await writeGifToFolder(blob, diskName);
    } catch (err) {
      console.warn("disk save failed:", err);
    }

    const record = {
      id: makeId(),
      name: diskName,
      diskName,
      createdAt: Date.now(),
      size: blob.size,
      blob,
      savedToDisk: !!savedToDisk,
    };
    await idbPut("gallery", record);
    await renderGallery();
    return record;
  }

  function switchLibraryTab(tab) {
    const isGallery = tab === "gallery";
    if (tabGallery) tabGallery.classList.toggle("active", isGallery);
    if (tabHistory) tabHistory.classList.toggle("active", !isGallery);
    if (galleryPanel) galleryPanel.classList.toggle("hidden", !isGallery);
    if (historyPanel) historyPanel.classList.toggle("hidden", isGallery);
  }

  function showDeleteModal(item) {
    pendingDeleteId = item.id;
    if (deleteFileName) deleteFileName.textContent = item.name || item.diskName || "";
    if (deleteWarnDetail) {
      if (directoryHandle && item.savedToDisk !== false) {
        deleteWarnDetail.innerHTML =
          "<strong>컴퓨터에 저장된 GIF 파일도 함께 삭제됩니다.</strong><br />이 작업은 되돌릴 수 없습니다. 정말 삭제할까요?";
      } else if (directoryHandle) {
        deleteWarnDetail.innerHTML =
          "갤러리에서 제거됩니다. 저장 폴더에 파일이 있으면 <strong>컴퓨터에서도 함께 삭제</strong>를 시도합니다.<br />이 작업은 되돌릴 수 없습니다.";
      } else {
        deleteWarnDetail.innerHTML =
          "갤러리에서 제거됩니다.<br /><strong>저장 폴더를 선택하지 않아 컴퓨터의 다운로드 파일은 자동 삭제되지 않습니다.</strong><br />컴퓨터에서도 지우려면 먼저 ‘저장 폴더 선택’ 후 다시 다운로드해 주세요.";
      }
    }
    if (deleteModal) deleteModal.classList.remove("hidden");
  }

  function hideDeleteModal() {
    pendingDeleteId = null;
    if (deleteModal) deleteModal.classList.add("hidden");
  }

  async function confirmDeleteGif() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    hideDeleteModal();
    try {
      const item = await idbGet("gallery", id);
      if (!item) return;
      let diskDeleted = false;
      if (item.diskName || item.name) {
        try {
          diskDeleted = await deleteGifFromFolder(item.diskName || item.name);
        } catch (err) {
          console.warn("disk delete failed:", err);
        }
      }
      await idbDelete("gallery", id);
      const cached = objectUrlCache.get(id);
      if (cached) {
        URL.revokeObjectURL(cached);
        objectUrlCache.delete(id);
      }
      await renderGallery();
      const note = diskDeleted
        ? `GIF 삭제(갤러리+컴퓨터): ${item.name}`
        : directoryHandle
          ? `GIF 삭제(갤러리): ${item.name} · 컴퓨터 파일은 찾지 못했거나 이미 없습니다`
          : `GIF 삭제(갤러리): ${item.name} · 저장 폴더가 없어 컴퓨터 파일은 삭제되지 않았습니다`;
      await addHistory(note);
      setStatus(diskDeleted ? "GIF가 갤러리와 컴퓨터에서 삭제되었습니다." : "GIF가 갤러리에서 삭제되었습니다.");
    } catch (err) {
      console.error(err);
      showErrorModal("삭제 중 오류가 발생했습니다.");
    }
  }

  async function initLibrary() {
    try {
      await openDb();
      await loadDirectoryHandle();
      await renderGallery();
      await renderHistory();
    } catch (err) {
      console.warn("library init failed:", err);
      updateFolderLabel();
    }
  }

  function renderFormatIcons() {
    formatIcons.innerHTML = SUPPORTED_FORMATS.map(
      (f) => `
      <button type="button" class="format-chip" data-ext="${f.ext}" title=".${f.ext} 파일만 선택">
        <span class="format-icon" style="background:${f.color}">${f.label}</span>
        <span class="format-label">.${f.ext}</span>
      </button>`
    ).join("");

    formatIcons.querySelectorAll(".format-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openFilePicker(chip.dataset.ext);
      });
    });
  }

  /** 포맷마다 새 input 생성 → Windows 파일창 필터가 실제로 바뀜 */
  function openFilePicker(extOnly) {
    if (converting) return;
    const accept = extOnly ? `.${extOnly}` : ALL_EXTENSIONS;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.cssText = "position:fixed;left:-9999px;opacity:0;width:1px;height:1px;";
    document.body.appendChild(input);

    const cleanup = () => {
      setTimeout(() => {
        if (input.parentNode) input.parentNode.removeChild(input);
      }, 0);
    };

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      cleanup();
      if (file) handleFile(file, extOnly || null);
    });

    setTimeout(() => {
      try {
        input.click();
      } catch (_) {
        cleanup();
      }
    }, 0);
  }

  function getExtension(filename) {
    const i = String(filename || "").lastIndexOf(".");
    return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
  }

  function stripExtension(filename) {
    const i = String(filename || "").lastIndexOf(".");
    return i >= 0 ? filename.slice(0, i) : filename;
  }

  function showErrorModal(message) {
    errorTitle.innerHTML = message || "변환 불가능한 파일입니다";
    errorModal.classList.remove("hidden");
  }

  function hideErrorModal() {
    errorModal.classList.add("hidden");
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatSec(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0.0초";
    return `${seconds.toFixed(1)}초`;
  }

  function formatClock(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "-";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function setProgress(pct) {
    const value = Math.max(0, Math.min(100, Math.round(pct)));
    progressBar.style.width = `${value}%`;
    progressText.textContent = `${value}%`;
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(value));
    if (haeyangiRunner) {
      haeyangiRunner.style.left = `${value}%`;
      haeyangiRunner.classList.toggle("is-running", value > 0 && value < 100);
      haeyangiRunner.classList.toggle("is-done", value >= 100);
    }
  }

  function resetConversionUI() {
    gifBlob = null;
    downloadBtn.disabled = true;
    setProgress(0);
    framePreview.innerHTML =
      '<p class="preview-placeholder">변환이 시작되면 생성된 프레임이 여기에 표시됩니다.</p>';
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function revokeObjectUrl() {
    if (objectUrl && String(objectUrl).startsWith("blob:")) {
      URL.revokeObjectURL(objectUrl);
    }
    objectUrl = null;
  }

  function waitEvent(el, eventName, timeoutMs = 25000) {
    return new Promise((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error(`${eventName}-timeout`));
      }, timeoutMs);
      const ok = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      };
      const fail = () => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error(`${eventName}-error`));
      };
      const cleanup = () => {
        clearTimeout(timer);
        el.removeEventListener(eventName, ok);
        el.removeEventListener("error", fail);
      };
      el.addEventListener(eventName, ok);
      el.addEventListener("error", fail);
    });
  }

  function seekVideo(video, time) {
    return new Promise((resolve) => {
      const max = Number.isFinite(video.duration) ? video.duration : time + 1;
      const target = Math.min(Math.max(time, 0), Math.max(max - 0.001, 0));
      if (Math.abs(video.currentTime - target) < 0.001) {
        resolve();
        return;
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        video.removeEventListener("seeked", onSeeked);
        clearTimeout(timer);
        resolve();
      };
      const onSeeked = () => finish();
      const timer = setTimeout(finish, 1800);
      video.addEventListener("seeked", onSeeked);
      try {
        video.currentTime = target;
      } catch (_) {
        finish();
      }
    });
  }

  async function resolveDuration(video) {
    if (Number.isFinite(video.duration) && video.duration > 0 && video.duration !== Infinity) {
      return video.duration;
    }
    try {
      video.currentTime = 1e101;
      await waitEvent(video, "seeked", 4000).catch(() => {});
      const estimated = video.currentTime;
      await seekVideo(video, 0);
      if (Number.isFinite(estimated) && estimated > 0) return estimated;
    } catch (_) {
      /* ignore */
    }
    throw new Error("duration-unavailable");
  }

  function updateTrimUI() {
    const start = Number(startRange.value);
    const end = Number(endRange.value);
    const pctStart = videoDuration ? (start / videoDuration) * 100 : 0;
    const pctEnd = videoDuration ? (end / videoDuration) * 100 : 100;
    trimRange.style.left = `${pctStart}%`;
    trimRange.style.width = `${Math.max(pctEnd - pctStart, 0)}%`;
    startLabel.textContent = formatSec(start);
    endLabel.textContent = formatSec(end);
    rangeLabel.textContent = formatSec(Math.max(end - start, 0));
  }

  function setupTrimControls(duration) {
    videoDuration = duration;
    const defaultEnd = Math.min(duration, Math.min(MAX_CLIP_SEC, duration));
    startRange.min = "0";
    startRange.max = String(duration);
    startRange.step = "0.1";
    startRange.value = "0";
    endRange.min = "0";
    endRange.max = String(duration);
    endRange.step = "0.1";
    endRange.value = String(defaultEnd);
    updateTrimUI();
  }

  function getTrimRange() {
    let start = Number(startRange.value);
    let end = Number(endRange.value);
    if (end < start) {
      const t = start;
      start = end;
      end = t;
    }
    if (end - start < MIN_CLIP_SEC) end = Math.min(videoDuration, start + MIN_CLIP_SEC);
    if (end - start > MAX_CLIP_SEC) end = start + MAX_CLIP_SEC;
    return { start, end };
  }

  function showFileInfo(file, meta, note) {
    const ext = getExtension(file.name);
    fileInfo.innerHTML = `
      <dt>파일명</dt><dd>${escapeHtml(file.name)}</dd>
      <dt>확장자</dt><dd>.${escapeHtml(ext || "-")}</dd>
      <dt>MIME 타입</dt><dd>${escapeHtml(file.type || MIME_BY_EXT[ext] || "알 수 없음")}</dd>
      <dt>파일 크기</dt><dd>${formatBytes(file.size)}</dd>
      <dt>재생 시간</dt><dd>${formatClock(meta.duration)}</dd>
      <dt>해상도</dt><dd>${meta.width} × ${meta.height}</dd>
      <dt>변환 설정</dt><dd>${TARGET_FPS} FPS · GIF 너비 최대 ${MAX_GIF_WIDTH}px</dd>
      ${note ? `<dt>처리</dt><dd>${escapeHtml(note)}</dd>` : ""}
    `;
  }

  /**
   * file:// 에서는 fetch()가 로컬 파일을 못 읽는 경우가 많음.
   * Cursor(http)에서는 fetch, 웹 직접 실행(file://)에서는 XHR로 로드.
   */
  function loadLocalArrayBuffer(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = () => {
        if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
          resolve(xhr.response);
        } else {
          reject(new Error("local-load-status-" + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error("local-load-failed"));
      xhr.send();
    });
  }

  async function localToBlobURL(url, mime) {
    let buffer = null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch-not-ok");
      buffer = await res.arrayBuffer();
    } catch (_) {
      buffer = await loadLocalArrayBuffer(url);
    }
    return URL.createObjectURL(new Blob([buffer], { type: mime }));
  }

  async function fileToUint8Array(file) {
    if (window.FFmpegUtil && window.FFmpegUtil.fetchFile) {
      try {
        return await window.FFmpegUtil.fetchFile(file);
      } catch (_) {
        /* file:// 등에서 실패 시 아래 경로 */
      }
    }
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  }

  async function getFFmpeg() {
    if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;
    if (ffmpegLoading) return ffmpegLoading;
    if (!window.FFmpegWASM || !window.FFmpegWASM.FFmpeg) {
      throw new Error("ffmpeg-unavailable");
    }

    ffmpegLoading = (async () => {
      const { FFmpeg } = window.FFmpegWASM;
      const ff = new FFmpeg();
      const base = new URL("lib/ffmpeg/", window.location.href).href;
      setStatus("변환 엔진 준비 중... (휴대폰 HEVC 지원)");

      // file:// 에서 Worker(file 경로) 차단 대비: 워커 스크립트를 Blob URL로 교체
      if (location.protocol === "file:") {
        try {
          const workerBuf = await loadLocalArrayBuffer(`${base}814.ffmpeg.js`);
          const workerBlobURL = URL.createObjectURL(
            new Blob([workerBuf], { type: "text/javascript" })
          );
          const OriginalWorker = window.Worker;
          window.Worker = function PatchedWorker(scriptURL, options) {
            const href = String(scriptURL && scriptURL.href ? scriptURL.href : scriptURL);
            if (href.indexOf("814.ffmpeg") !== -1) {
              return new OriginalWorker(workerBlobURL, options);
            }
            return new OriginalWorker(scriptURL, options);
          };
          window.Worker.prototype = OriginalWorker.prototype;
        } catch (workerPatchErr) {
          console.warn("worker patch skipped:", workerPatchErr);
        }
      }

      const coreURL = await localToBlobURL(`${base}ffmpeg-core.js`, "text/javascript");
      const wasmURL = await localToBlobURL(`${base}ffmpeg-core.wasm`, "application/wasm");
      await ff.load({ coreURL, wasmURL });
      ffmpegInstance = ff;
      return ff;
    })();

    try {
      return await ffmpegLoading;
    } finally {
      ffmpegLoading = null;
    }
  }

  async function transcodeToCompatibleMp4(file) {
    const ff = await getFFmpeg();
    const ext = getExtension(file.name) || "mp4";
    const inputName = `input.${ext}`;
    const outputName = "compatible.mp4";
    setStatus("휴대폰 HEVC/HDR 영상을 호환 MP4로 변환 중...");
    await ff.writeFile(inputName, await fileToUint8Array(file));
    // Main 10(HDR) → 8bit H.264 (브라우저 공통 재생)
    await ff.exec([
      "-i", inputName,
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "28",
      "-an",
      "-movflags", "+faststart",
      "-t", "120",
      outputName,
    ]);
    const data = await ff.readFile(outputName);
    try {
      await ff.deleteFile(inputName);
      await ff.deleteFile(outputName);
    } catch (_) {
      /* ignore */
    }
    const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    return new File([bytes], `${stripExtension(file.name)}.mp4`, { type: "video/mp4" });
  }

  /**
   * Cursor(http)와 웹(file://) 공통: Blob URL + src 직접 지정.
   * source.type 을 넣으면 휴대폰 HEVC가 거절되는 경우가 있어 넣지 않음.
   */
  async function attachVideoSrc(url) {
    previewVideo.pause();
    while (previewVideo.firstChild) previewVideo.removeChild(previewVideo.firstChild);
    previewVideo.removeAttribute("src");
    previewVideo.muted = true;
    previewVideo.defaultMuted = true;
    previewVideo.playsInline = true;
    previewVideo.preload = "auto";
    previewVideo.setAttribute("playsinline", "");
    previewVideo.setAttribute("webkit-playsinline", "");

    const metaReady = waitEvent(previewVideo, "loadedmetadata", 30000);
    previewVideo.src = url;
    await metaReady;
  }

  async function probeVideoMeta() {
    if (previewVideo.readyState < 2) {
      await waitEvent(previewVideo, "loadeddata", 20000).catch(() => {});
    }
    if (!previewVideo.videoWidth || !previewVideo.videoHeight) {
      try {
        const p = previewVideo.play();
        if (p && p.then) await p.catch(() => {});
        previewVideo.pause();
      } catch (_) {
        /* ignore */
      }
      await seekVideo(previewVideo, 0);
    }
    if (!previewVideo.videoWidth || !previewVideo.videoHeight) {
      throw new Error("no-video-track");
    }
    return {
      duration: await resolveDuration(previewVideo),
      width: previewVideo.videoWidth,
      height: previewVideo.videoHeight,
    };
  }

  async function loadConvertedPreview(file) {
    const converted = await transcodeToCompatibleMp4(file);
    revokeObjectUrl();
    objectUrl = URL.createObjectURL(converted);
    await attachVideoSrc(objectUrl);
    const meta = await probeVideoMeta();
    setStatus("자동 변환 완료. 구간을 선택한 뒤 GIF로 만드세요.");
    return {
      meta,
      note: "휴대폰 HEVC/HDR → H.264 자동 변환 완료",
      file: converted,
    };
  }

  async function loadVideoToPreview(file) {
    revokeObjectUrl();
    objectUrl = URL.createObjectURL(file);

    // 1) 브라우저 직접 재생 시도 (Cursor/웹 공통)
    try {
      setStatus("동영상 불러오는 중...");
      await attachVideoSrc(objectUrl);
      const meta = await probeVideoMeta();
      setStatus("");
      return { meta, note: "", file };
    } catch (nativeErr) {
      console.warn("직접 재생 실패 → FFmpeg 변환:", nativeErr);
    }

    // 2) 실패 시(휴대폰 HEVC Main10 등) FFmpeg로 호환 MP4 생성
    //    file:// 에서도 XHR로 wasm을 읽어 Cursor(http)와 동일하게 동작
    try {
      setStatus("특수 코덱 감지 → 자동 변환 시도 중...");
      return await loadConvertedPreview(file);
    } catch (ffErr) {
      console.error("FFmpeg 변환 실패:", ffErr);
      throw ffErr;
    }
  }

  function appendPreviewFrame(canvas) {
    if (framePreview.querySelector(".preview-placeholder")) framePreview.innerHTML = "";
    const thumbs = framePreview.querySelectorAll(".frame-thumb");
    if (thumbs.length >= MAX_PREVIEW_FRAMES) thumbs[0].remove();
    const img = document.createElement("img");
    img.className = "frame-thumb";
    img.alt = "GIF 프레임 미리보기";
    try {
      img.src = canvas.toDataURL("image/jpeg", 0.72);
      framePreview.appendChild(img);
    } catch (_) {
      /* ignore */
    }
  }

  function encodeGif(frames, width, height, delayMs) {
    if (!window.GifEnc || !window.GifEnc.GIFEncoder) throw new Error("gif-lib-missing");
    const { GIFEncoder, quantize, applyPalette } = window.GifEnc;
    const gif = GIFEncoder();
    frames.forEach((rgba, index) => {
      const copy = new Uint8Array(rgba.length);
      copy.set(rgba);
      const palette = quantize(copy, 256);
      const indexMap = applyPalette(copy, palette);
      gif.writeFrame(indexMap, width, height, {
        palette,
        delay: delayMs,
        repeat: index === 0 ? 0 : undefined,
      });
      setProgress(70 + ((index + 1) / frames.length) * 30);
    });
    gif.finish();
    return new Blob([gif.bytes()], { type: "image/gif" });
  }

  function readFramePixels(ctx, video, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);
    return Uint8Array.from(ctx.getImageData(0, 0, width, height).data);
  }

  async function convertSelectedRange() {
    if (!currentFile || converting) return;
    const { start, end } = getTrimRange();
    if (end <= start) {
      showErrorModal("변환 불가능한 파일입니다");
      return;
    }

    converting = true;
    convertBtn.disabled = true;
    convertSection.classList.remove("hidden");
    resetConversionUI();
    downloadName = `${stripExtension(currentFile.name)}.gif`;

    try {
      const video = previewVideo;
      video.pause();
      const clipLen = end - start;
      const scale = Math.min(1, MAX_GIF_WIDTH / Math.max(video.videoWidth, 1));
      const width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
      const height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const frameInterval = 1 / TARGET_FPS;
      const totalFrames = Math.max(1, Math.floor(clipLen * TARGET_FPS));
      const delayMs = Math.round(1000 / TARGET_FPS);
      const frames = [];

      for (let i = 0; i < totalFrames; i += 1) {
        const time = Math.min(start + i * frameInterval, Math.max(end - 0.001, start));
        await seekVideo(video, time);
        await new Promise((r) => requestAnimationFrame(r));
        frames.push(readFramePixels(ctx, video, width, height));
        if (i % PREVIEW_EVERY_N === 0 || i === totalFrames - 1) appendPreviewFrame(canvas);
        setProgress(((i + 1) / totalFrames) * 70);
        if (i % 2 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      gifBlob = encodeGif(frames, width, height, delayMs);
      setProgress(100);
      downloadBtn.disabled = false;
      setStatus("GIF 변환 완료!");
      await addHistory(`GIF 변환 완료: ${downloadName} (${formatBytes(gifBlob.size)})`);
    } catch (err) {
      console.error(err);
      showErrorModal("변환 불가능한 파일입니다");
      await addHistory(`GIF 변환 실패: ${currentFile ? currentFile.name : "알 수 없음"}`);
    } finally {
      converting = false;
      convertBtn.disabled = false;
    }
  }

  async function handleFile(file, requiredExt) {
    if (!file || converting) return;
    const ext = getExtension(file.name);
    if (!supportedExtSet.has(ext)) {
      showErrorModal("변환 불가능한 파일입니다");
      return;
    }
    if (requiredExt && ext !== requiredExt) {
      showErrorModal("변환 불가능한 파일입니다");
      return;
    }

    converting = true;
    try {
      const { meta, note, file: playable } = await loadVideoToPreview(file);
      currentFile = playable;
      showFileInfo(file, meta, note);
      setupTrimControls(meta.duration);
      editorSection.classList.remove("hidden");
      convertSection.classList.add("hidden");
      resetConversionUI();
      editorSection.scrollIntoView({ behavior: "smooth", block: "start" });
      await addHistory(`동영상 업로드: ${file.name} (${formatBytes(file.size)})`);
    } catch (err) {
      console.error("동영상 로드 실패:", err);
      currentFile = null;
      editorSection.classList.add("hidden");
      convertSection.classList.add("hidden");
      setStatus("");
      showErrorModal("변환 불가능한 파일입니다");
      await addHistory(`동영상 로드 실패: ${file.name}`);
    } finally {
      converting = false;
    }
  }

  async function downloadGif() {
    if (!gifBlob) return;
    const name = downloadName || "output.gif";
    try {
      if (supportsDirPicker && !directoryHandle) {
        const wantFolder = window.confirm(
          "저장 폴더를 선택하면 다운로드한 GIF가 해당 폴더에 저장되고,\n갤러리에서 삭제할 때 컴퓨터 파일도 함께 지울 수 있습니다.\n\n지금 저장 폴더를 선택할까요?"
        );
        if (wantFolder) {
          await pickGalleryFolder();
        }
      }

      const record = await saveGifToLibrary(gifBlob, name);
      const a = document.createElement("a");
      const url = URL.createObjectURL(gifBlob);
      a.href = url;
      a.download = record.name || name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      if (record.savedToDisk) {
        setStatus(`다운로드 완료 · 갤러리/폴더 저장: ${record.name}`);
        await addHistory(`GIF 다운로드·폴더 저장: ${record.name}`);
      } else {
        setStatus(
          directoryHandle
            ? `다운로드 완료 · 갤러리 저장됨 (폴더 저장 실패): ${record.name}`
            : `다운로드 완료 · 갤러리 저장됨. 컴퓨터에서 바로 삭제하려면 '저장 폴더 선택'을 먼저 해주세요.`
        );
        await addHistory(
          directoryHandle
            ? `GIF 다운로드·갤러리 저장(폴더 저장 실패): ${record.name}`
            : `GIF 다운로드·갤러리 저장: ${record.name}`
        );
      }
      switchLibraryTab("gallery");
    } catch (err) {
      console.error(err);
      showErrorModal("GIF 저장 중 오류가 발생했습니다.");
    }
  }

  function onStartInput() {
    let start = Number(startRange.value);
    let end = Number(endRange.value);
    if (start > end - MIN_CLIP_SEC) {
      start = Math.max(0, end - MIN_CLIP_SEC);
      startRange.value = String(start);
    }
    if (end - start > MAX_CLIP_SEC) {
      end = start + MAX_CLIP_SEC;
      endRange.value = String(end);
    }
    updateTrimUI();
    if (previewVideo && Number.isFinite(start)) previewVideo.currentTime = start;
  }

  function onEndInput() {
    let start = Number(startRange.value);
    let end = Number(endRange.value);
    if (end < start + MIN_CLIP_SEC) {
      end = Math.min(videoDuration, start + MIN_CLIP_SEC);
      endRange.value = String(end);
    }
    if (end - start > MAX_CLIP_SEC) {
      start = end - MAX_CLIP_SEC;
      startRange.value = String(Math.max(0, start));
    }
    updateTrimUI();
  }

  videoToGifBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openFilePicker(null);
  });

  dropzone.addEventListener("click", (e) => {
    if (e.target.closest("#videoToGifBtn")) return;
    openFilePicker(null);
  });

  ["dragenter", "dragover"].forEach((type) => {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file, null);
  });

  startRange.addEventListener("input", onStartInput);
  endRange.addEventListener("input", onEndInput);
  convertBtn.addEventListener("click", convertSelectedRange);
  downloadBtn.addEventListener("click", () => {
    downloadGif().catch((err) => console.error(err));
  });
  errorConfirmBtn.addEventListener("click", hideErrorModal);
  errorModal.addEventListener("click", (e) => {
    if (e.target === errorModal) hideErrorModal();
  });

  if (tabGallery) tabGallery.addEventListener("click", () => switchLibraryTab("gallery"));
  if (tabHistory) tabHistory.addEventListener("click", () => switchLibraryTab("history"));
  if (pickGalleryFolderBtn) {
    pickGalleryFolderBtn.addEventListener("click", () => {
      pickGalleryFolder().catch((err) => console.error(err));
    });
    if (!supportsDirPicker) pickGalleryFolderBtn.disabled = true;
  }
  if (galleryGrid) {
    galleryGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".gallery-delete");
      if (!btn) return;
      e.preventDefault();
      const id = btn.getAttribute("data-id");
      idbGet("gallery", id)
        .then((item) => {
          if (item) showDeleteModal(item);
        })
        .catch((err) => console.error(err));
    });
  }
  if (deleteCancelBtn) deleteCancelBtn.addEventListener("click", hideDeleteModal);
  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener("click", () => {
      confirmDeleteGif().catch((err) => console.error(err));
    });
  }
  if (deleteModal) {
    deleteModal.addEventListener("click", (e) => {
      if (e.target === deleteModal) hideDeleteModal();
    });
  }

  renderFormatIcons();
  initLibrary().catch((err) => console.warn(err));
})();
