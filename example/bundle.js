(() => {
  // ../main.js
  var SeamlessClip = class extends HTMLElement {
    get src() {
      return this.getAttribute("src");
    }
    set src(v) {
      if (v) {
        this.setAttribute("src", v);
      }
    }
  };
  var Seamless = class extends HTMLVideoElement {
    get encoding() {
      if (this.hasAttribute("encoding")) {
        return this.getAttribute("encoding");
      }
      return 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
    }
    set encoding(v) {
      if (v) {
        this.setAttribute("encoding", v);
      }
    }
    connectedCallback() {
      const name = this.hasAttribute("is") ? this.getAttribute("is") : "very-seamless";
      window.customElements.whenDefined(name).then(() => {
        if (this.isConnected) {
          const children = this.querySelectorAll(`${name}-clip[src]`);
          const assets = Array.from(children).map((o) => o.getAttribute("src"));
          this.render(...assets).catch(({ message }) => {
            const error = new ErrorEvent("error", { message });
            this.dispatchEvent(error);
          });
        }
      });
    }
    async render(...assets) {
      if (MediaSource.isTypeSupported(this.encoding) === false) {
        throw MediaError({ code: 3, message: "Unsupported mime type / codec" });
      }
      const mediaSource = new MediaSource();
      const promises = assets.map((asset) => fetch(asset).then((response) => response.ok ? response.arrayBuffer() : Promise.reject(response)).catch((e) => e));
      const resultsMaybe = await Promise.all(promises);
      const results = resultsMaybe.filter((o) => !(o instanceof Error)).map((o) => new Uint8Array(o));
      if (results.length === 0) {
        throw MediaError({ code: 4, message: "Nothing to play back" });
      }
      mediaSource.addEventListener("sourceopen", () => {
        const sourceBuffer = mediaSource.addSourceBuffer(this.encoding);
        const { mode } = sourceBuffer;
        if (mode === "segments") {
          sourceBuffer.mode = "sequence";
        }
        sourceBuffer.appendBuffer(results.shift());
        sourceBuffer.addEventListener("updateend", () => {
          if (results.length) {
            sourceBuffer.appendBuffer(results.shift());
          } else if (mediaSource.readyState === "open" && sourceBuffer.updating === false) {
            mediaSource.endOfStream();
          }
        });
        window.URL.revokeObjectURL(this.src);
      }, { once: true });
      this.src = window.URL.createObjectURL(mediaSource);
    }
  };
  window.customElements.define("very-seamless-clip", SeamlessClip);
  window.customElements.define("very-seamless", Seamless, { extends: "video" });

  // index.js
  var host = document.querySelector("video");
  var type = "application/x-mpegURL";
  if (host.canPlayType(type)) {
    const observer = new MutationObserver((mutations) => {
      const isReady = mutations.some((m) => m.attributeName === "src");
      if (isReady) {
        host.removeAttribute("src");
      }
    });
    observer.observe(host, { attributeFilter: ["src"] });
    const list = document.querySelectorAll("very-seamless-clip[alt]");
    const data = Array.from(list).map((clip) => clip.getAttribute("alt")).map((item) => document.location.href + item).reduce((crop, item) => crop.concat("#EXTINF:1", item), [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-MEDIA-SEQUENCE:0",
      "#EXT-X-TARGETDURATION:2"
    ]).concat("#EXT-X-ENDLIST").join("\n");
    const blob = new Blob([data], { type });
    const src = window.URL.createObjectURL(blob);
    const source = document.createElement("source");
    source.setAttribute("type", type);
    source.setAttribute("src", src);
    host.appendChild(source);
  }
  host.addEventListener("error", ({ message = "playback error" }) => {
    console.log("oops!", message);
  });
})();
