(() => {
  "use strict";
  const native = window.AndroidGif;
  if (!native) return;

  window.saveAndroidGif = async (blob, name) => {
    if (!native.begin()) throw new Error("다른 파일을 저장하는 중이에요.");
    try {
      const chunkSize = 192 * 1024;
      for (let offset = 0; offset < blob.size; offset += chunkSize) {
        const encoded = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",", 2)[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob.slice(offset, offset + chunkSize));
        });
        if (!native.append(encoded)) throw new Error("저장할 파일을 준비하지 못했어요.");
      }
      native.finish(name, blob.type || "application/octet-stream");
    } catch (error) {
      native.cancel();
      throw error;
    }
  };
})();
