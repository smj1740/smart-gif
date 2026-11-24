(() => {
  "use strict";

  const join = (parts) => {
    const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  };

  function readGif(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const word = (offset) => view.getUint16(offset, true);
    const header = String.fromCharCode(...bytes.subarray(0, 6));
    if (!["GIF87a", "GIF89a"].includes(header) || bytes.length < 14) {
      throw new Error("GIF 형식(.gif)의 파일 한 개를 선택해 주세요.");
    }
    const paletteSize = (flags) => flags & 128 ? 3 * (2 ** ((flags & 7) + 1)) : 0;
    const width = word(6);
    const height = word(8);
    const palette = bytes.subarray(13, 13 + paletteSize(bytes[10]));
    const headerEnd = 13 + palette.length;
    let cursor = headerEnd;
    let control;
    let loop = -1;
    const blocks = [];
    const frames = [];
    function subBlocks() {
      const chunks = [];
      while (cursor < bytes.length) {
        const size = bytes[cursor++];
        if (!size) return chunks;
        if (cursor + size > bytes.length) break;
        chunks.push(bytes.subarray(cursor, cursor + size));
        cursor += size;
      }
      throw new Error("GIF 데이터가 중간에 끊겨 있어요.");
    }

    while (cursor < bytes.length) {
      const start = cursor;
      const type = bytes[cursor++];
      if (type === 0x3b && width && height && frames.length) {
        return { width, height, loop, palette, headerEnd, blocks, frames,
          duration: frames.reduce((sum, frame) => sum + frame.delay, 0) / 100 };
      }
      if (type === 0x21) {
        const label = bytes[cursor++];
        const chunks = subBlocks();
        const block = { start, end: cursor, label };
        blocks.push(block);
        if (label === 0xf9 && chunks[0]?.length === 4) control = block;
        if (label === 0x01) control = undefined;
        if (label === 0xff && ["NETSCAPE2.0", "ANIMEXTS1.0"].includes(
          String.fromCharCode(...(chunks[0] || []))) && chunks[1]?.length >= 3) {
          loop = chunks[1][1] | (chunks[1][2] << 8);
        }
        continue;
      }
      if (type !== 0x2c || cursor + 9 > bytes.length) break;
      const localPaletteLength = paletteSize(bytes[cursor + 8]);
      const dataStart = cursor + 9 + localPaletteLength;
      cursor = dataStart + 1;
      const chunks = subBlocks();
      const rawDelay = control ? word(control.start + 4) : 0;
      const frame = { start, end: cursor, control, dataStart, chunks, delay: rawDelay >= 2 ? rawDelay : 10 };
      frames.push(frame);
      blocks.push(frame);
      control = undefined;
    }
    throw new Error("읽을 수 없는 GIF예요. 다른 GIF 파일을 선택해 주세요.");
  }

  function setDelays(bytes, delays) {
    const meta = readGif(bytes);
    if (meta.frames.length !== delays.length) throw new Error("편집된 GIF의 프레임 수를 확인할 수 없어요.");
    let cursor = 0;
    const output = [];
    meta.frames.forEach((frame, index) => {
      const offset = frame.control?.start ?? frame.start;
      output.push(bytes.subarray(cursor, offset));
      const gce = frame.control
        ? bytes.slice(offset, frame.control.end)
        : Uint8Array.of(0x21, 0xf9, 4, 0, 0, 0, 0, 0);
      const delay = Math.min(65535, Math.max(2, Math.round(delays[index])));
      gce[4] = delay & 255;
      gce[5] = delay >> 8;
      output.push(gce);
      cursor = frame.control?.end ?? frame.start;
    });
    output.push(bytes.subarray(cursor));
    const result = join(output);
    result[4] = 57; // GIF89a supports Graphic Control Extensions.
    return result;
  }

  function optimize(bytes, meta) {
    const output = [bytes.subarray(0, meta.headerEnd)];
    for (const block of meta.blocks) {
      if (block.label === 0xfe) continue;
      if (!block.chunks) {
        output.push(bytes.subarray(block.start, block.end));
        continue;
      }
      const colors = bytes.subarray(block.start + 10, block.dataStart);
      const samePalette = colors.length && colors.length === meta.palette.length
        && colors.every((value, index) => value === meta.palette[index]);
      if (samePalette) {
        const descriptor = bytes.slice(block.start, block.start + 10);
        descriptor[9] &= 0x78;
        output.push(descriptor, bytes.subarray(block.dataStart, block.dataStart + 1));
      } else {
        output.push(bytes.subarray(block.start, block.dataStart + 1));
      }
      const packed = join(block.chunks);
      for (let offset = 0; offset < packed.length; offset += 255) {
        const chunk = packed.subarray(offset, offset + 255);
        output.push(Uint8Array.of(chunk.length), chunk);
      }
      output.push(Uint8Array.of(0));
    }
    output.push(Uint8Array.of(0x3b));
    return join(output);
  }

  function fitFilter(width, height, targetWidth, targetHeight, mode, fill) {
    const scale = mode === "cover"
      ? Math.max(targetWidth / width, targetHeight / height)
      : Math.min(targetWidth / width, targetHeight / height);
    const scaledWidth = Math.max(1, Math.round(width * scale));
    const scaledHeight = Math.max(1, Math.round(height * scale));
    const size = "scale=" + scaledWidth + ":" + scaledHeight;
    if (mode === "cover") return size + ",crop=" + targetWidth + ":" + targetHeight + ":exact=1";
    return size + ",pad=" + targetWidth + ":" + targetHeight + ":(ow-iw)/2:(oh-ih)/2:color=0x" + fill.slice(1);
  }

  async function editGif(source, tool, options) {
    const { bytes, meta } = source;
    const { width, height, frames, loop } = meta;
    if (tool === "Optimize") return { bytes: optimize(bytes, meta), ext: "gif" };
    if (tool === "Speed") {
      return { bytes: setDelays(bytes, frames.map((frame) => frame.delay / options.speed)), ext: "gif" };
    }
    const filters = ["format=rgba"];
    let ext = "gif";
    let colors = 256;
    let delays = frames.map((frame) => frame.delay);

    if (tool === "Resize") filters.push("scale=" + options.x + ":" + options.y + ":flags=lanczos");
    if (tool === "Crop") {
      const [x, y] = options.ratio.split(":").map(Number);
      const useWidth = width / height >= x / y;
      const canvasWidth = useWidth ? width : Math.max(1, Math.round(height * x / y));
      const canvasHeight = useWidth ? Math.max(1, Math.round(width * y / x)) : height;
      filters.push(fitFilter(width, height, canvasWidth, canvasHeight, options.cropMode, options.fill));
    }
    if (tool === "Downsizing") {
      if (options.scale) filters.push("scale=max(1\\,round(iw*0.65)):max(1\\,round(ih*0.65))");
      if (options.frames) {
        filters.push("select=not(mod(n\\,2))");
        delays = delays.filter((_, index) => index % 2 === 0)
          .map((delay, index) => delay + (frames[index * 2 + 1]?.delay || 0));
      }
      if (options.resolution) {
        filters.push("scale=max(1\\,round(iw/2)):max(1\\,round(ih/2)):flags=area",
          "scale=" + (options.scale ? Math.max(1, Math.round(width * 0.65)) + ":" + Math.max(1, Math.round(height * 0.65)) : width + ":" + height) + ":flags=neighbor");
        colors = 96;
      }
    }
    if (tool === "Format Convert") ext = options.format;
    if (tool === "Rotate") filters.push({
      90: "transpose=clock", 180: "hflip,vflip", 270: "transpose=cclock", horizontal: "hflip", vertical: "vflip"
    }[options.rotation]);
    if (tool === "Reverse") {
      filters.push("reverse");
      delays.reverse();
    }
    if (tool === "Cut") {
      const start = Math.round(options.start * 100);
      const end = Math.round(options.end * 100);
      let position = 0;
      let first = -1;
      let last = -1;
      delays = [];
      frames.forEach((frame, index) => {
        const overlap = Math.min(position + frame.delay, end) - Math.max(position, start);
        if (overlap > 0) {
          if (first < 0) first = index;
          last = index;
          delays.push(overlap);
        }
        position += frame.delay;
      });
      if (first < 0) throw new Error("재생 구간 안에서 시작과 끝 시간을 지정해 주세요.");
      filters.push("select=between(n\\," + first + "\\," + last + ")");
    }

    const ffmpeg = await window.getGifFFmpeg();
    const key = "editor-" + Date.now();
    const input = key + ".gif";
    const output = key + "-out." + ext;
    await ffmpeg.writeFile(input, bytes.slice());
    try {
      const args = ["-ignore_loop", "1", "-i", input, "-an"];
      if (ext === "gif") {
        filters.push("setpts=N/(25*TB)");
        const graph = "[0:v]" + filters.join(",") +
          ",split[pixels][sample];[sample]palettegen=max_colors=" + colors +
          ":reserve_transparent=1[palette];[pixels][palette]paletteuse=dither=bayer:diff_mode=rectangle";
        args.push("-filter_complex", graph, "-fps_mode", "passthrough", "-loop", String(loop));
      }
      if (ext === "mp4") {
        args.push("-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p",
          "-fps_mode", "vfr", "-c:v", "libx264", "-preset", "veryfast", "-movflags", "+faststart");
      }
      if (ext === "jpg") args.push("-frames:v", "1", "-q:v", "2", "-update", "1");
      const exit = await ffmpeg.exec([...args, output]);
      if (exit !== 0) throw new Error("이 GIF를 처리하지 못했어요. 크기나 편집 옵션을 바꿔 다시 시도해 주세요.");
      const encoded = await ffmpeg.readFile(output);
      return { bytes: ext === "gif" ? setDelays(encoded, delays) : encoded, ext };
    } finally {
      await Promise.allSettled([ffmpeg.deleteFile(input), ffmpeg.deleteFile(output)]);
    }
  }
  window.gifEditorEngine = { readGif, editGif };
})();