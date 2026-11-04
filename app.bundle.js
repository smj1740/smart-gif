window.GifEnc=(function(){
var X={signature:"GIF",version:"89a",trailer:59,extensionIntroducer:33,applicationExtensionLabel:255,graphicControlExtensionLabel:249,imageSeparator:44,signatureSize:3,versionSize:3,globalColorTableFlagMask:128,colorResolutionMask:112,sortFlagMask:8,globalColorTableSizeMask:7,applicationIdentifierSize:8,applicationAuthCodeSize:3,disposalMethodMask:28,userInputFlagMask:2,transparentColorFlagMask:1,localColorTableFlagMask:128,interlaceFlagMask:64,idSortFlagMask:32,localColorTableSizeMask:7};function F(t=256){let e=0,s=new Uint8Array(t);return{get buffer(){return s.buffer},reset(){e=0},bytesView(){return s.subarray(0,e)},bytes(){return s.slice(0,e)},writeByte(r){n(e+1),s[e]=r,e++},writeBytes(r,o=0,i=r.length){n(e+i);for(let c=0;c<i;c++)s[e++]=r[c+o]},writeBytesView(r,o=0,i=r.byteLength){n(e+i),s.set(r.subarray(o,o+i),e),e+=i}};function n(r){var o=s.length;if(o>=r)return;var i=1024*1024;r=Math.max(r,o*(o<i?2:1.125)>>>0),o!=0&&(r=Math.max(r,256));let c=s;s=new Uint8Array(r),e>0&&s.set(c.subarray(0,e),0)}}var O=12,J=5003,lt=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function at(t,e,s,n,r=F(512),o=new Uint8Array(256),i=new Int32Array(J),c=new Int32Array(J)){let x=i.length,a=Math.max(2,n);o.fill(0),c.fill(0),i.fill(-1);let l=0,f=0,g=a+1,h=g,b=!1,w=h,_=(1<<w)-1,u=1<<g-1,k=u+1,B=u+2,p=0,A=s[0],z=0;for(let y=x;y<65536;y*=2)++z;z=8-z,r.writeByte(a),I(u);let d=s.length;for(let y=1;y<d;y++){t:{let m=s[y],v=(m<<O)+A,M=m<<z^A;if(i[M]===v){A=c[M];break t}let V=M===0?1:x-M;for(;i[M]>=0;)if(M-=V,M<0&&(M+=x),i[M]===v){A=c[M];break t}I(A),A=m,B<1<<O?(c[M]=B++,i[M]=v):(i.fill(-1),B=u+2,b=!0,I(u))}}return I(A),I(k),r.writeByte(0),r.bytesView();function I(y){for(l&=lt[f],f>0?l|=y<<f:l=y,f+=w;f>=8;)o[p++]=l&255,p>=254&&(r.writeByte(p),r.writeBytesView(o,0,p),p=0),l>>=8,f-=8;if((B>_||b)&&(b?(w=h,_=(1<<w)-1,b=!1):(++w,_=w===O?1<<w:(1<<w)-1)),y==k){for(;f>0;)o[p++]=l&255,p>=254&&(r.writeByte(p),r.writeBytesView(o,0,p),p=0),l>>=8,f-=8;p>0&&(r.writeByte(p),r.writeBytesView(o,0,p),p=0)}}}var $=at;function D(t,e,s){return t<<8&63488|e<<2&992|s>>3}function G(t,e,s,n){return t>>4|e&240|(s&240)<<4|(n&240)<<8}function j(t,e,s){return t>>4<<8|e&240|s>>4}function R(t,e,s){return t<e?e:t>s?s:t}function T(t){return t*t}function tt(t,e,s){var n=0,r=1e100;let o=t[e],i=o.cnt,c=o.ac,x=o.rc,a=o.gc,l=o.bc;for(var f=o.fw;f!=0;f=t[f].fw){let h=t[f],b=h.cnt,w=i*b/(i+b);if(!(w>=r)){var g=0;s&&(g+=w*T(h.ac-c),g>=r)||(g+=w*T(h.rc-x),!(g>=r)&&(g+=w*T(h.gc-a),!(g>=r)&&(g+=w*T(h.bc-l),!(g>=r)&&(r=g,n=f))))}}o.err=r,o.nn=n}function Q(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function ut(t,e){let s=e==="rgb444"?4096:65536,n=new Array(s),r=t.length;if(e==="rgba4444")for(let o=0;o<r;++o){let i=t[o],c=i>>24&255,x=i>>16&255,a=i>>8&255,l=i&255,f=G(l,a,x,c),g=f in n?n[f]:n[f]=Q();g.rc+=l,g.gc+=a,g.bc+=x,g.ac+=c,g.cnt++}else if(e==="rgb444")for(let o=0;o<r;++o){let i=t[o],c=i>>16&255,x=i>>8&255,a=i&255,l=j(a,x,c),f=l in n?n[l]:n[l]=Q();f.rc+=a,f.gc+=x,f.bc+=c,f.cnt++}else for(let o=0;o<r;++o){let i=t[o],c=i>>16&255,x=i>>8&255,a=i&255,l=D(a,x,c),f=l in n?n[l]:n[l]=Q();f.rc+=a,f.gc+=x,f.bc+=c,f.cnt++}return n}function H(t,e,s={}){let{format:n="rgb565",clearAlpha:r=!0,clearAlphaColor:o=0,clearAlphaThreshold:i=0,oneBitAlpha:c=!1}=s;if(!t||!t.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(t instanceof Uint8Array)&&!(t instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let x=new Uint32Array(t.buffer),a=s.useSqrt!==!1,l=n==="rgba4444",f=ut(x,n),g=f.length,h=g-1,b=new Uint32Array(g+1);for(var w=0,u=0;u<g;++u){let C=f[u];if(C!=null){var _=1/C.cnt;l&&(C.ac*=_),C.rc*=_,C.gc*=_,C.bc*=_,f[w++]=C}}T(e)/w<.022&&(a=!1);for(var u=0;u<w-1;++u)f[u].fw=u+1,f[u+1].bk=u,a&&(f[u].cnt=Math.sqrt(f[u].cnt));a&&(f[u].cnt=Math.sqrt(f[u].cnt));var k,B,p;for(u=0;u<w;++u){tt(f,u,!1);var A=f[u].err;for(B=++b[0];B>1&&(p=B>>1,!(f[k=b[p]].err<=A));B=p)b[B]=k;b[B]=u}var z=w-e;for(u=0;u<z;){for(var d;;){var I=b[1];if(d=f[I],d.tm>=d.mtm&&f[d.nn].mtm<=d.tm)break;d.mtm==h?I=b[1]=b[b[0]--]:(tt(f,I,!1),d.tm=u);var A=f[I].err;for(B=1;(p=B+B)<=b[0]&&(p<b[0]&&f[b[p]].err>f[b[p+1]].err&&p++,!(A<=f[k=b[p]].err));B=p)b[B]=k;b[B]=I}var y=f[d.nn],m=d.cnt,v=y.cnt,_=1/(m+v);l&&(d.ac=_*(m*d.ac+v*y.ac)),d.rc=_*(m*d.rc+v*y.rc),d.gc=_*(m*d.gc+v*y.gc),d.bc=_*(m*d.bc+v*y.bc),d.cnt+=y.cnt,d.mtm=++u,f[y.bk].fw=y.fw,f[y.fw].bk=y.bk,y.mtm=h}let M=[];var V=0;for(u=0;;++V){let L=R(Math.round(f[u].rc),0,255),C=R(Math.round(f[u].gc),0,255),Y=R(Math.round(f[u].bc),0,255),E=255;if(l){if(E=R(Math.round(f[u].ac),0,255),c){let st=typeof c=="number"?c:127;E=E<=st?0:255}r&&E<=i&&(L=C=Y=o,E=0)}let K=l?[L,C,Y,E]:[L,C,Y];if(xt(M,K)||M.push(K),(u=f[u].fw)==0)break}return M}function xt(t,e){for(let s=0;s<t.length;s++){let n=t[s],r=n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2],o=n.length>=4&&e.length>=4?n[3]===e[3]:!0;if(r&&o)return!0}return!1}function U(t,e){var s=0,n;for(n=0;n<t.length;n++){let r=t[n]-e[n];s+=r*r}return s}function P(t,e){return e>1?Math.round(t/e)*e:t}function et(t,{roundRGB:e=5,roundAlpha:s=10,oneBitAlpha:n=null}={}){let r=new Uint32Array(t.buffer);for(let o=0;o<r.length;o++){let i=r[o],c=i>>24&255,x=i>>16&255,a=i>>8&255,l=i&255;if(c=P(c,s),n){let f=typeof n=="number"?n:127;c=c<=f?0:255}l=P(l,e),a=P(a,e),x=P(x,e),r[o]=c<<24|x<<16|a<<8|l<<0}}function nt(t,e,s="rgb565"){if(!t||!t.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(t instanceof Uint8Array)&&!(t instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(e.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(t.buffer),r=n.length,o=s==="rgb444"?4096:65536,i=new Uint8Array(r),c=new Array(o),x=s==="rgba4444";if(s==="rgba4444")for(let a=0;a<r;a++){let l=n[a],f=l>>24&255,g=l>>16&255,h=l>>8&255,b=l&255,w=G(b,h,g,f),_=w in c?c[w]:c[w]=gt(b,h,g,f,e);i[a]=_}else{let a=s==="rgb444"?j:D;for(let l=0;l<r;l++){let f=n[l],g=f>>16&255,h=f>>8&255,b=f&255,w=a(b,h,g),_=w in c?c[w]:c[w]=bt(b,h,g,e);i[l]=_}}return i}function gt(t,e,s,n,r){let o=0,i=1e100;for(let c=0;c<r.length;c++){let x=r[c],a=x[3],l=q(a-n);if(l>i)continue;let f=x[0];if(l+=q(f-t),l>i)continue;let g=x[1];if(l+=q(g-e),l>i)continue;let h=x[2];l+=q(h-s),!(l>i)&&(i=l,o=c)}return o}function bt(t,e,s,n){let r=0,o=1e100;for(let i=0;i<n.length;i++){let c=n[i],x=c[0],a=q(x-t);if(a>o)continue;let l=c[1];if(a+=q(l-e),a>o)continue;let f=c[2];a+=q(f-s),!(a>o)&&(o=a,r=i)}return r}function rt(t,e,s=5){if(!t.length||!e.length)return;let n=t.map(i=>i.slice(0,3)),r=s*s,o=t[0].length;for(let i=0;i<e.length;i++){let c=e[i];c.length<o?c=[c[0],c[1],c[2],255]:c.length>o?c=c.slice(0,3):c=c.slice();let x=N(n,c.slice(0,3),U),a=x[0],l=x[1];l>0&&l<=r&&(t[a]=c)}}function q(t){return t*t}function W(t,e,s=U){let n=Infinity,r=-1;for(let o=0;o<t.length;o++){let i=t[o],c=s(e,i);c<n&&(n=c,r=o)}return r}function N(t,e,s=U){let n=Infinity,r=-1;for(let o=0;o<t.length;o++){let i=t[o],c=s(e,i);c<n&&(n=c,r=o)}return[r,n]}function ot(t,e,s=U){return t[W(t,e,s)]}function ct(t={}){let{initialCapacity:e=4096,auto:s=!0}=t,n=F(e),r=5003,o=new Uint8Array(256),i=new Int32Array(r),c=new Int32Array(r),x=!1;return{reset(){n.reset(),x=!1},finish(){n.writeByte(X.trailer)},bytes(){return n.bytes()},bytesView(){return n.bytesView()},get buffer(){return n.buffer},get stream(){return n},writeHeader:a,writeFrame(l,f,g,h={}){let{transparent:b=!1,transparentIndex:w=0,delay:_=0,palette:u=null,repeat:k=0,colorDepth:B=8,dispose:p=-1}=h,A=!1;if(s?x||(A=!0,a(),x=!0):A=Boolean(h.first),f=Math.max(0,Math.floor(f)),g=Math.max(0,Math.floor(g)),A){if(!u)throw new Error("First frame must include a { palette } option");pt(n,f,g,u,B),it(n,u),k>=0&&dt(n,k)}let z=Math.round(_/10);wt(n,p,z,b,w);let d=Boolean(u)&&!A;ht(n,f,g,d?u:null),d&&it(n,u),yt(n,l,f,g,B,o,i,c)}};function a(){ft(n,"GIF89a")}}function wt(t,e,s,n,r){t.writeByte(33),t.writeByte(249),t.writeByte(4),r<0&&(r=0,n=!1);var o,i;n?(o=1,i=2):(o=0,i=0),e>=0&&(i=e&7),i<<=2;let c=0;t.writeByte(0|i|c|o),S(t,s),t.writeByte(r||0),t.writeByte(0)}function pt(t,e,s,n,r=8){let o=1,i=0,c=Z(n.length)-1,x=o<<7|r-1<<4|i<<3|c,a=0,l=0;S(t,e),S(t,s),t.writeBytes([x,a,l])}function dt(t,e){t.writeByte(33),t.writeByte(255),t.writeByte(11),ft(t,"NETSCAPE2.0"),t.writeByte(3),t.writeByte(1),S(t,e),t.writeByte(0)}function it(t,e){let s=1<<Z(e.length);for(let n=0;n<s;n++){let r=[0,0,0];n<e.length&&(r=e[n]),t.writeByte(r[0]),t.writeByte(r[1]),t.writeByte(r[2])}}function ht(t,e,s,n){if(t.writeByte(44),S(t,0),S(t,0),S(t,e),S(t,s),n){let r=0,o=0,i=Z(n.length)-1;t.writeByte(128|r|o|0|i)}else t.writeByte(0)}function yt(t,e,s,n,r=8,o,i,c){$(s,n,e,r,t,o,i,c)}function S(t,e){t.writeByte(e&255),t.writeByte(e>>8&255)}function ft(t,e){for(var s=0;s<e.length;s++)t.writeByte(e.charCodeAt(s))}function Z(t){return Math.max(Math.ceil(Math.log2(t)),1)}var Bt=ct;


return {GIFEncoder:ct, quantize:H, applyPalette:nt};
})();

(() => {
  "use strict";

  const TARGET_FPS = 30;
  const MAX_GIF_WIDTH = 480;
  const MAX_CLIP_SEC = 20;
  const PREVIEW_EVERY_N = 5;
  const MAX_PREVIEW_FRAMES = 24;
  const MIN_CLIP_SEC = 0.2;
  const DATA_URL_MAX_BYTES = 80 * 1024 * 1024; // file:// 안정화용
  const IS_FILE_PROTOCOL = location.protocol === "file:";

  const SUPPORTED_FORMATS = [
    { ext: "mp4", color: "#1aa6d6", label: "MP4" },
    { ext: "webm", color: "#2faf7d", label: "WebM" },
    { ext: "mov", color: "#6b5ce7", label: "MOV" },
    { ext: "m4v", color: "#3b8ddd", label: "M4V" },
    { ext: "ogv", color: "#e07a3a", label: "OGV" },
    { ext: "ogg", color: "#d4652a", label: "OGG" },
    { ext: "3gp", color: "#3f8f6b", label: "3GP" },
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

  // 숨김 input은 동적 생성만 사용 (포맷 필터 안정화)
  const hiddenInputHost = document.getElementById("fileInput");
  if (hiddenInputHost) hiddenInputHost.remove();

  let gifBlob = null;
  let downloadName = "output.gif";
  let converting = false;
  let objectUrl = null;
  let currentFile = null;
  let videoDuration = 0;
  let expectedExt = null; // null이면 전체 허용, 'mp4' 등이면 해당 확장자만

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

  /**
   * 매번 새 <input type="file"> 를 만들어 accept를 적용합니다.
   * (기존 input의 accept를 바꿔도 Windows/Chrome에서 필터가 안 바뀌는 문제 방지)
   * @param {string|null} extOnly 예: "mp4" / null(전체)
   */
  function openFilePicker(extOnly) {
    if (converting) return;

    expectedExt = extOnly || null;
    const accept = extOnly ? `.${extOnly}` : ALL_EXTENSIONS;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;width:1px;height:1px;";
    document.body.appendChild(input);

    const cleanup = () => {
      setTimeout(() => {
        if (input.parentNode) input.parentNode.removeChild(input);
      }, 0);
    };

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      cleanup();
      if (file) handleFile(file, expectedExt);
    });

    // accept 반영 후 클릭 (브라우저 버그 대응)
    setTimeout(() => {
      try {
        input.click();
      } catch (err) {
        cleanup();
        console.error(err);
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

  function isSupportedFile(file) {
    return supportedExtSet.has(getExtension(file.name));
  }

  function showErrorModal(message) {
    errorTitle.textContent = message || "변환 불가능한 파일입니다";
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
    progressTrack.setAttribute("aria-valuenow", String(value));
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
    if (objectUrl) {
      if (String(objectUrl).startsWith("blob:")) {
        URL.revokeObjectURL(objectUrl);
      }
      objectUrl = null;
    }
  }

  function waitEvent(el, eventName, timeoutMs = 20000) {
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

    try {
      await video.play();
      await new Promise((r) => setTimeout(r, 250));
      video.pause();
      if (Number.isFinite(video.duration) && video.duration > 0 && video.duration !== Infinity) {
        return video.duration;
      }
      if (video.currentTime > 0) return Math.max(video.currentTime, 0.5);
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

  function showFileInfo(file, meta) {
    const ext = getExtension(file.name);
    fileInfo.innerHTML = `
      <dt>파일명</dt><dd>${escapeHtml(file.name)}</dd>
      <dt>확장자</dt><dd>.${escapeHtml(ext || "-")}</dd>
      <dt>MIME 타입</dt><dd>${escapeHtml(file.type || MIME_BY_EXT[ext] || "알 수 없음")}</dd>
      <dt>파일 크기</dt><dd>${formatBytes(file.size)}</dd>
      <dt>재생 시간</dt><dd>${formatClock(meta.duration)}</dd>
      <dt>해상도</dt><dd>${meta.width} × ${meta.height}</dd>
      <dt>변환 설정</dt><dd>${TARGET_FPS} FPS · GIF 너비 최대 ${MAX_GIF_WIDTH}px</dd>
    `;
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("filereader-failed"));
      reader.readAsDataURL(file);
    });
  }

  async function createPlayableUrl(file) {
    const ext = getExtension(file.name);
    const mime = file.type || MIME_BY_EXT[ext] || "application/octet-stream";

    // file:// 에서는 Data URL이 캔버스 오염/디코딩 이슈가 가장 적음
    if (IS_FILE_PROTOCOL && file.size <= DATA_URL_MAX_BYTES) {
      try {
        return await readAsDataURL(file);
      } catch (_) {
        /* fallback below */
      }
    }

    try {
      return URL.createObjectURL(file);
    } catch (_) {
      const buffer = await file.arrayBuffer();
      return URL.createObjectURL(new Blob([buffer], { type: mime }));
    }
  }

  async function loadVideoToPreview(file) {
    revokeObjectUrl();
    objectUrl = await createPlayableUrl(file);

    previewVideo.pause();
    // load() 호출로 error 이벤트가 먼저 뜨는 레이스를 피함
    previewVideo.removeAttribute("src");
    previewVideo.muted = true;
    previewVideo.defaultMuted = true;
    previewVideo.playsInline = true;
    previewVideo.preload = "auto";
    previewVideo.setAttribute("playsinline", "");
    previewVideo.setAttribute("webkit-playsinline", "");

    const metaReady = waitEvent(previewVideo, "loadedmetadata", 30000);
    previewVideo.src = objectUrl;
    await metaReady;

    if (previewVideo.readyState < 2) {
      await waitEvent(previewVideo, "loadeddata", 30000).catch(() => {});
    }

    if (!previewVideo.videoWidth || !previewVideo.videoHeight) {
      try {
        const playPromise = previewVideo.play();
        if (playPromise && typeof playPromise.then === "function") {
          await playPromise.catch(() => {});
        }
        previewVideo.pause();
      } catch (_) {
        /* ignore */
      }
      await seekVideo(previewVideo, 0);
    }

    if (!previewVideo.videoWidth || !previewVideo.videoHeight) {
      throw new Error("no-video-track");
    }

    const duration = await resolveDuration(previewVideo);
    return {
      duration,
      width: previewVideo.videoWidth,
      height: previewVideo.videoHeight,
    };
  }

  function appendPreviewFrame(canvas) {
    if (framePreview.querySelector(".preview-placeholder")) {
      framePreview.innerHTML = "";
    }
    const thumbs = framePreview.querySelectorAll(".frame-thumb");
    if (thumbs.length >= MAX_PREVIEW_FRAMES) thumbs[0].remove();
    const img = document.createElement("img");
    img.className = "frame-thumb";
    img.alt = "GIF 프레임 미리보기";
    try {
      img.src = canvas.toDataURL("image/jpeg", 0.72);
      framePreview.appendChild(img);
    } catch (_) {
      /* ignore preview failure */
    }
  }

  function encodeGif(frames, width, height, delayMs) {
    if (!window.GifEnc || !window.GifEnc.GIFEncoder) {
      throw new Error("gif-lib-missing");
    }
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
    try {
      return Uint8Array.from(ctx.getImageData(0, 0, width, height).data);
    } catch (err) {
      // file:// 오염 시: 새 캔버스로 한 번 더 시도
      const tmp = document.createElement("canvas");
      tmp.width = width;
      tmp.height = height;
      const tctx = tmp.getContext("2d");
      tctx.drawImage(video, 0, 0, width, height);
      return Uint8Array.from(tctx.getImageData(0, 0, width, height).data);
    }
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
        // 디코딩 안정화
        await new Promise((r) => requestAnimationFrame(r));
        const pixels = readFramePixels(ctx, video, width, height);
        frames.push(pixels);

        if (i % PREVIEW_EVERY_N === 0 || i === totalFrames - 1) {
          appendPreviewFrame(canvas);
        }
        setProgress(((i + 1) / totalFrames) * 70);
        if (i % 2 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      gifBlob = encodeGif(frames, width, height, delayMs);
      setProgress(100);
      downloadBtn.disabled = false;
    } catch (err) {
      console.error("변환 실패:", err);
      showErrorModal("변환 불가능한 파일입니다");
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
    // 포맷 아이콘으로 연 경우 해당 확장자만 허용
    if (requiredExt && ext !== requiredExt) {
      showErrorModal("변환 불가능한 파일입니다");
      return;
    }

    try {
      const meta = await loadVideoToPreview(file);
      currentFile = file;
      showFileInfo(file, meta);
      setupTrimControls(meta.duration);
      editorSection.classList.remove("hidden");
      convertSection.classList.add("hidden");
      resetConversionUI();
      editorSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error("동영상 로드 실패:", err);
      currentFile = null;
      editorSection.classList.add("hidden");
      convertSection.classList.add("hidden");
      showErrorModal("변환 불가능한 파일입니다");
    }
  }

  function downloadGif() {
    if (!gifBlob) return;
    const a = document.createElement("a");
    const url = URL.createObjectURL(gifBlob);
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
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
    if (previewVideo && Number.isFinite(start)) {
      previewVideo.currentTime = start;
    }
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
    openFilePicker(null); // 전체 포맷
  });

  dropzone.addEventListener("click", (e) => {
    if (e.target.closest("#videoToGifBtn")) return;
    openFilePicker(null);
  });

  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker(null);
    }
  });

  ["dragenter", "dragover"].forEach((type) => {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((type) => {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
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
  downloadBtn.addEventListener("click", downloadGif);
  errorConfirmBtn.addEventListener("click", hideErrorModal);
  errorModal.addEventListener("click", (e) => {
    if (e.target === errorModal) hideErrorModal();
  });

  renderFormatIcons();
})();
