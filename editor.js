(() => {
  "use strict";
  const { readGif, editGif } = window.gifEditorEngine;
  const generator = document.querySelector("#gif-generator");
  const editor = document.createElement("main");
  editor.id = "gif-editor";
  generator.after(editor);
  editor.innerHTML = [
    '<section class="ge-hero" aria-labelledby="ge-title"><h1 id="ge-title">쓰기 쉬운 GIF 편집기</h1>',
    '<p>GIF 파일을 간편히편집하기</p></section>',
    '<section class="ge-upload" aria-label="GIF 업로드"><div class="ge-upload-icon" aria-hidden="true">GIF</div>',
    '<h2>GIF 파일을 여기로 끌어다 놓으세요</h2><p>편집 가능 형식 <strong>.GIF</strong> · 한 번에 1개</p>',
    '<button class="ge-primary" id="ge-pick" type="button">파일 선택</button>',
    '<input type="file" accept=".gif,image/gif" id="ge-file" hidden></section>',
    '<p class="ge-error" role="alert" hidden></p>',
    '<section class="ge-workspace" hidden><div class="ge-top"><strong class="ge-filename"></strong>',
    '<button type="button" id="ge-reset">다른 GIF 열기</button></div>',
    '<div class="ge-columns"><div class="ge-media"><details class="ge-card ge-original" open>',
    '<summary>Original GIF</summary><div class="ge-original-body"></div></details>',
    '<section class="ge-card ge-result" hidden></section></div>',
    '<section class="ge-card ge-tools" aria-label="Editor Tools"></section></div></section>'
  ].join("");

  const $ = (selector) => editor.querySelector(selector);
  const tools = [
    ["Resize", "maximize", "크기 변경"], ["Crop", "crop", "비율 맞추기"],
    ["Downsizing", "minimize", "용량 줄이기"], ["Format Convert", "files", "MP4 · JPG 변환"],
    ["Rotate", "rotate", "회전 및 뒤집기"], ["Optimize", "optimize", "무손실 최적화"],
    ["Reverse", "reverse", "역재생"], ["Speed", "speed", "재생 속도"], ["Cut", "cut", "구간 자르기"]
  ];
  const paths = {
    maximize: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
    crop: "M6 3v15h15M3 6h15v15",
    minimize: "M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5",
    files: "M8 7h12v14H8zM4 17V3h12m-5 10h6m-3-3 3 3-3 3",
    rotate: "M4 11a8 8 0 1 1 2 6m-2-6V5m0 6h6",
    optimize: "m12 2 2.7 6.3L21 11l-6.3 2.7L12 20l-2.7-6.3L3 11l6.3-2.7L12 2zm7 16v4m-2-2h4",
    reverse: "M11 5 3 12l8 7zm10 0-8 7 8 7z",
    speed: "M4 18a9 9 0 1 1 16 0H4zm8-4 4-5",
    cut: "M6 6a3 3 0 1 0 0 .1zM6 18a3 3 0 1 0 0 .1zM8 8l12 12M8 16 20 4",
    locked: "M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3m-4 4v3",
    unlocked: "M5 10h14v11H5zM8 10V7a4 4 0 0 1 7-2m-3 9v3"
  };
  const icon = (key) => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + paths[key] + '"/></svg>';
  const resultTitles = { Resize: "Resized GIF", Crop: "Cropped GIF", Downsizing: "Downsized GIF",
    Rotate: "Rotated GIF", Optimize: "Optimized GIF", Reverse: "Reversed GIF", Speed: "Speed-adjusted GIF", Cut: "Trimmed GIF" };
  const mime = { gif: "image/gif", jpg: "image/jpeg", mp4: "video/mp4" };
  const pickerTypes = { gif: "GIF 이미지", jpg: "JPG 이미지", mp4: "MP4 동영상" };
  const filePickerId = "smart-gif-editor";
  let source;
  let result;
  let sourceHandle;
  let baseName;
  let activeTool;
  let busy = false;
  let loadVersion = 0;

  function showPage() {
    const onEditor = location.hash === "#editor";
    generator.hidden = onEditor;
    editor.hidden = !onEditor;
    document.querySelector("#gif-editor-link").setAttribute("aria-current", onEditor ? "page" : "false");
    document.querySelector("#gif-generator-link").setAttribute("aria-current", onEditor ? "false" : "page");
  }

  function showError(message) {
    const error = $(".ge-error");
    error.textContent = message;
    error.hidden = !message;
  }

  function toggleWorkspace(isOpen) {
    $(".ge-upload").hidden = isOpen;
    $(".ge-workspace").hidden = !isOpen;
    editor.classList.toggle("has-file", isOpen);
  }

  function revokeResult() {
    if (result) URL.revokeObjectURL(result.url);
    result = undefined;
    $(".ge-result").hidden = true;
    $(".ge-result").replaceChildren();
  }

  async function load(file, handle) {
    const version = ++loadVersion;
    showError("");
    try {
      if (!file || !/\.gif$/i.test(file.name)) throw new Error("편집 가능한 형식은 GIF(.gif)예요. GIF 파일 한 개를 선택해 주세요.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const meta = readGif(bytes);
      if (version !== loadVersion) return;
      if (source) URL.revokeObjectURL(source.url);
      revokeResult();
      source = { bytes, meta, url: URL.createObjectURL(file), name: file.name };
      sourceHandle = handle;
      baseName = file.name.replace(/\.gif$/i, "");
      $(".ge-filename").textContent = file.name;
      $(".ge-original").open = true;
      renderMedia($(".ge-original-body"), { ...source, ext: "gif" });
      toggleWorkspace(true);
      renderTools();
    } catch (error) {
      if (version === loadVersion) showError(error.message);
    }
  }

  function detailsText(item) {
    const format = (number) => new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(number);
    const size = item.bytes.length;
    const cells = [["형식", item.ext.toUpperCase()],
      ["용량", size < 1024 ? size + " B" : format(size / 1024) + " KB"]];
    const width = item.meta?.width ?? item.width;
    const height = item.meta?.height ?? item.height;
    if (width && height) cells.unshift(["크기", width + " × " + height + " px"]);
    if (item.meta) {
      cells.push(["프레임", format(item.meta.frames.length) + "장"]);
      if (item.meta.frames.length > 1) cells.push(["재생 시간", format(item.meta.duration) + "초"]);
    }
    return cells;
  }

  function renderMedia(container, item) {
    container.replaceChildren();
    const stage = document.createElement("div");
    stage.className = "ge-stage";
    const media = document.createElement(item.ext === "mp4" ? "video" : "img");
    media.src = item.url;
    if (media.tagName === "VIDEO") {
      media.controls = true;
      media.playsInline = true;
    } else {
      media.alt = item.name;
    }
    stage.append(media);
    const metadata = document.createElement("dl");
    metadata.className = "ge-metadata";
    function updateDetails() {
      metadata.replaceChildren();
      for (const [name, value] of detailsText(item)) {
        const cell = document.createElement("div");
        const term = document.createElement("dt");
        const detail = document.createElement("dd");
        term.textContent = name;
        detail.textContent = value;
        cell.append(term, detail);
        metadata.append(cell);
      }
    }
    if (!item.meta) media.addEventListener(media.tagName === "VIDEO" ? "loadedmetadata" : "load", () => {
      item.width = media.videoWidth || media.naturalWidth;
      item.height = media.videoHeight || media.naturalHeight;
      updateDetails();
    });
    updateDetails();
    container.append(stage, metadata);
  }

  function range(name, label, min, max, value, suffix, step = 1) {
    return '<label class="ge-slider"><span>' + label + '</span><output for="ge-' + name + '">' + value + suffix
      + '</output><input id="ge-' + name + '" type="range" name="' + name + '" min="' + min
      + '" max="' + max + '" value="' + value + '" step="' + step + '" data-suffix="' + suffix + '"></label>';
  }

  function select(name, label, values) {
    return '<label class="ge-field"><span>' + label + '</span><select name="' + name + '">'
      + values.map(([value, title]) => '<option value="' + value + '">' + title + '</option>').join("") + '</select></label>';
  }

  const checkbox = (key, label, checked) => '<label class="ge-check"><input type="checkbox" name="' + key + '"' +
    (checked ? ' checked' : '') + '> ' + label + '</label>';

  function fieldsFor(tool) {
    const { width, height, duration } = source.meta;
    switch (tool) {
      case "Resize": {
        const axis = (name, value) => range(name.toLowerCase(), name + "축", Math.max(1, Math.ceil(value * 0.05)), value * 3, value, " px");
        return axis("X", width) + '<button type="button" id="ge-lock" aria-label="가로세로 비율 고정" aria-pressed="true">'
          + icon("locked") + '</button>' + axis("Y", height);
      }
      case "Crop":
        return select("ratio", "출력 비율", ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"].map((ratio) => [ratio, ratio]))
          + select("cropMode", "빈 공간 처리", [["cover", "확대하여 채우기"], ["contain", "단색으로 채우기"]])
          + '<label class="ge-field" id="ge-fill" hidden><span>배경색</span><input name="fill" type="color" value="#ffffff"></label>';
      case "Downsizing":
        return checkbox("scale", "사이즈 축소 (원본의 65%)", true) +
          checkbox("frames", "프레임 삭제 (두 장마다 한 장 유지)", false) +
          checkbox("resolution", "해상도 낮추기 (픽셀 디테일과 색상 감소)", false);
      case "Format Convert":
        return select("format", "저장 형식", [["mp4", "MP4 · 애니메이션"], ["jpg", "JPG · 첫 프레임"]]);
      case "Rotate":
        return select("rotation", "회전 또는 뒤집기", [["90", "시계 방향 90°"], ["180", "180°"], ["270", "시계 방향 270°"],
          ["vertical", "상하 뒤집기"], ["horizontal", "좌우 뒤집기"]]);
      case "Optimize":
        return '<p class="ge-help">화질과 프레임을 유지하면서 중복 색상표와 불필요한 데이터를 줄여요.</p>';
      case "Reverse":
        return '<p class="ge-help">마지막 프레임부터 거꾸로 재생되는 GIF를 만들어요.</p>';
      case "Speed":
        return range("speed", "재생 배속", 0.25, 4, 1, "×", 0.05);
      case "Cut":
        return '<div class="ge-times"><label class="ge-field"><span>시작 (초)</span><input type="number" name="start" min="0" max="' + duration + '" step="0.01" value="0" required></label>'
          + '<label class="ge-field"><span>끝 (초)</span><input type="number" name="end" min="0.02" max="' + duration + '" step="0.01" value="' + duration + '" required></label></div>';
      default:
        return "";
    }
  }

  function renderTools(tool) {
    activeTool = tool;
    const panel = $(".ge-tools");
    panel.innerHTML = '<h2>Editor Tools</h2>';
    if (!tool) {
      panel.insertAdjacentHTML("beforeend", '<div class="ge-tool-grid">' + tools.map(([name, key, title]) =>
        '<button type="button" data-tool="' + name + '">' + icon(key) + '<strong>' + name +
        '</strong><span>' + title + '</span></button>').join("") + '</div>');
      return;
    }
    const [, key, title] = tools.find(([name]) => name === tool);
    panel.insertAdjacentHTML("beforeend", '<form class="ge-form"><h3>' + icon(key) + tool + '</h3><p class="ge-help">' + title + '</p>'
      + fieldsFor(tool) + '<p class="ge-progress" role="status"></p>'
      + '<div class="ge-actions"><button type="button" id="ge-back">Back</button><button type="submit" class="ge-primary">Go!</button></div></form>');
  }

  function downloadLink(url, name) {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
  }

  function renderResult(tool) {
    const panel = $(".ge-result");
    const title = resultTitles[tool] || "Converted " + result.ext.toUpperCase();
    panel.innerHTML = '<h2>' + title + '</h2><div class="ge-result-body"></div><p class="ge-comparison"></p>'
      + '<div class="ge-actions"><button type="button" id="ge-download">다운로드</button>'
      + '<button type="button" class="ge-primary" id="ge-save">저장</button></div>';
    renderMedia($(".ge-result-body"), result);
    if (tool === "Optimize" || tool === "Downsizing") {
      const percent = (1 - result.bytes.length / source.bytes.length) * 100;
      $(".ge-comparison").textContent = percent >= 0.05 ? "원본 대비 " + percent.toFixed(1) + "% 감소"
        : result.keptOriginal ? "이 옵션으로는 용량이 줄지 않아 원본 GIF를 유지했어요." : "원본과 같은 용량이에요.";
    }
    panel.hidden = false;
    $(".ge-original").open = false;
  }

  async function save() {
    const item = result;
    const filename = baseName + "_ed." + item.ext;
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({ id: filePickerId, suggestedName: filename,
          ...(sourceHandle ? { startIn: sourceHandle } : {}),
          types: [{ description: pickerTypes[item.ext], accept: { [mime[item.ext]]: ["." + item.ext] } }] });
        const writer = await handle.createWritable();
        await writer.write(item.blob);
        await writer.close();
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
        if (!["SecurityError", "NotAllowedError", "TypeError"].includes(error.name)) {
          showError("저장을 완료하지 못했어요. 다시 시도해 주세요.");
          return;
        }
      }
    }
    const name = window.prompt("저장할 파일 이름을 입력해 주세요. 저장 위치는 브라우저의 다운로드 설정을 따릅니다.", filename)?.trim();
    if (name) downloadLink(item.url, name.toLowerCase().endsWith("." + item.ext) ? name : name + "." + item.ext);
  }

  $(".ge-upload").addEventListener("dragover", (event) => {
    event.preventDefault();
    $(".ge-upload").classList.add("is-dragging");
  });
  $(".ge-upload").addEventListener("dragleave", (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) $(".ge-upload").classList.remove("is-dragging");
  });
  $(".ge-upload").addEventListener("drop", async (event) => {
    event.preventDefault();
    $(".ge-upload").classList.remove("is-dragging");
    const { files, items } = event.dataTransfer;
    if (files.length !== 1) {
      ++loadVersion;
      showError("GIF(.gif) 파일 한 개만 끌어다 놓아 주세요.");
      return;
    }
    const file = files[0];
    const handle = await items[0]?.getAsFileSystemHandle?.()?.catch(() => undefined);
    load(file, handle?.kind === "file" ? handle : undefined);
  });
  $("#ge-pick").addEventListener("click", async () => {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({ id: filePickerId, multiple: false,
          types: [{ description: "GIF 이미지", accept: { "image/gif": [".gif"] } }] });
        await load(await handle.getFile(), handle);
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    $("#ge-file").click();
  });
  $("#ge-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) load(file);
    event.target.value = "";
  });

  editor.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || busy) return;
    if (button.dataset.tool) {
      showError("");
      renderTools(button.dataset.tool);
      $(".ge-form").querySelector("input,select,button").focus();
    }
    if (button.id === "ge-back") {
      const previous = activeTool;
      showError("");
      renderTools();
      [...editor.querySelectorAll("[data-tool]")].find((item) => item.dataset.tool === previous)?.focus();
    }
    if (button.id === "ge-lock") {
      const locked = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(locked));
      button.innerHTML = icon(locked ? "locked" : "unlocked");
      if (locked) $("#ge-x").dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (button.id === "ge-download") downloadLink(result.url, result.name);
    if (button.id === "ge-save") save();
    if (button.id === "ge-reset") {
      ++loadVersion;
      URL.revokeObjectURL(source.url);
      source = undefined;
      sourceHandle = undefined;
      revokeResult();
      $(".ge-original-body").replaceChildren();
      toggleWorkspace(false);
      showError("");
      $("#ge-pick").focus();
    }
  });

  editor.addEventListener("input", (event) => {
    const input = event.target;
    if (input.name === "cropMode") $("#ge-fill").hidden = input.value !== "contain";
    if (input.type !== "range") return;
    const update = (axis) => { axis.previousElementSibling.value = axis.value + axis.dataset.suffix; };
    update(input);
    if (activeTool === "Resize" && $("#ge-lock").getAttribute("aria-pressed") === "true") {
      const fromX = input.name === "x";
      const other = $(fromX ? "#ge-y" : "#ge-x");
      const ratio = source.meta.width / source.meta.height;
      other.value = String(Math.round(Number(input.value) * (fromX ? 1 / ratio : ratio)));
      update(other);
    }
  });

  editor.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!source || busy) return;
    showError("");
    const tool = activeTool;
    const options = Object.fromEntries(new FormData(event.target));
    if (tool === "Downsizing" && !Object.keys(options).length) {
      showError("용량을 줄일 방법을 한 가지 이상 선택해 주세요.");
      return;
    }
    if (tool === "Cut" && Number(options.end) - Number(options.start) < 0.0199) {
      showError("시작과 끝 시간은 최소 0.02초 차이가 나야 해요.");
      return;
    }
    busy = true;
    const buttons = [...editor.querySelectorAll(".ge-workspace button, .ge-form input, .ge-form select")];
    buttons.forEach((element) => { element.disabled = true; });
    $(".ge-progress").textContent = "편집 중…";
    try {
      const item = await editGif(source, tool, options);
      const keptOriginal = tool === "Downsizing" && item.bytes.length > source.bytes.length;
      if (keptOriginal) item.bytes = source.bytes;
      const prefix = resultTitles[tool]?.split(" ")[0] || "Converted";
      const blob = new Blob([item.bytes], { type: mime[item.ext] });
      const meta = item.ext === "gif" ? readGif(item.bytes) : undefined;
      revokeResult();
      result = { ...item, meta, blob, url: URL.createObjectURL(blob), keptOriginal,
        name: tool === "Resize" ? "Resized_" + source.name : prefix + "_" + baseName + "." + item.ext };
      renderResult(tool);
      $(".ge-progress").textContent = "편집 완료";
    } catch (error) {
      $(".ge-progress").textContent = "";
      showError(error.message);
    } finally {
      busy = false;
      buttons.forEach((element) => { element.disabled = false; });
    }
  });

  window.addEventListener("hashchange", showPage);
  showPage();
})();
