(function () {
  'use strict';

  class SeamlessClip extends HTMLElement {
    constructor(src) {
      super();

      this.src = src;
    }

    get src() {
      return this.getAttribute('src')
    }

    set src(v) {
      if (v) {
        this.setAttribute('src', v);
      }
    }
  }

  class Seamless extends HTMLVideoElement {
    constructor(encoding = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"') {
      super();

      // A bit of a pain, eg. 'video/webm; codecs="vorbis, vp8"'
      // More, https://tools.ietf.org/html/rfc6381#section-3.3
      this.encoding = encoding;
    }

    connectedCallback() {
      const ns = this.getAttribute('is');

      // Allow for attaching event listeners in time
      window.customElements.whenDefined(ns).then(() => {
        // Make sure fetching avoided unless tag has context
        if (this.isConnected) {
          // Collect `src` urls, tracks only
          const children = this.querySelectorAll(`${ns}-clip[src]`);
          const assets = Array.from(children).map(o => o.getAttribute('src'));

          this.render(...assets).catch(({ message }) => {
            const error = new ErrorEvent('error', { message });

            this.dispatchEvent(error);
          });
        }
      });
    }

    async render(...assets) {
      // Bail out quick
      if (MediaSource.isTypeSupported(this.encoding) === false) {
        throw Error('Unsupported mime type / codec')
      }

      // Collect errors locally
      const promises = assets.map(asset => fetch(asset)
        .then(response => (response.ok ? response.arrayBuffer() : Promise.reject(response)))
        .catch(e => e)
      );

      // Batch download
      const resultsMaybe = await Promise.all(promises);
      const results = resultsMaybe
        // Drop errors + blanks
        .filter(result => !(result instanceof Error))
        .filter(result => !!result)
        // Format data
        .map(buffer => new Uint8Array(buffer));

      if (results.length === 0) {
        throw Error('Nothing to play back')
      }

      const mediaSource = new MediaSource();
      const { URL } = window;

      mediaSource.addEventListener('sourceopen', () => {
        const sourceBuffer = mediaSource.addSourceBuffer(this.encoding);
        const { mode } = sourceBuffer;

        if (mode === 'segments') {
          sourceBuffer.mode = 'sequence';
        }

        sourceBuffer.appendBuffer(results.shift());
        sourceBuffer.addEventListener('updateend', () => {
          if (results.length) {
            sourceBuffer.appendBuffer(results.shift());
          } else if (mediaSource.readyState === 'open' && sourceBuffer.updating === false) {
            mediaSource.endOfStream();
          }
        });

        URL.revokeObjectURL(this.src);
      });

      this.src = URL.createObjectURL(mediaSource);
    }
  }

  window.customElements.define('very-seamless-clip', SeamlessClip);
  window.customElements.define('very-seamless', Seamless, { extends: 'video' });

  const clips = document.querySelectorAll('very-seamless-clip[alt]');
  const assets = Array.from(clips).map(o => o.getAttribute('alt'));

  const blob = createPlaylist(...assets);
  const src = window.URL.createObjectURL(blob);

  // Safari: need append a `<source>` element instead of setting the video `src` attribute
  const source = document.createElement('source');

  source.setAttribute('src', src);
  source.setAttribute('type', blob.type);

  const video = document.querySelector('video');

  video.appendChild(source);
  video.addEventListener('error', (e) => {
    console.log('oops!', e.message);
  });

  /* eslint func-style: warn */
  function createPlaylist(...list) {
    const data = list
      // Get full path
      .map(item => document.location.href + item)
      // Add duration for each clip
      .reduce((crop, item) => crop.concat('#EXTINF:10', item), [
        // Head
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-MEDIA-SEQUENCE:0',
        '#EXT-X-TARGETDURATION:10'
      ])
      // Foot
      .concat('#EXT-X-ENDLIST')
      .join('\n');

    return new Blob([data], { type: 'application/x-mpegURL' })
  }

}());
