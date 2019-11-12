(function () {
  'use strict';

  class SeamlessClip extends HTMLElement {
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
    get encoding() {
      if (this.hasAttribute('encoding')) {
        return this.getAttribute('encoding')
      }

      // A bit of a pain the codec part, another option might be
      // 'video/webm; codecs="vorbis, vp8"'
      return 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
    }

    set encoding(v) {
      if (v) {
        this.setAttribute('encoding', v);
      }
    }

    connectedCallback() {
      const name = this.hasAttribute('is') ? this.getAttribute('is') : 'very-seamless';

      // Allow for attaching event listeners in time
      window.customElements.whenDefined(name).then(() => {
        // Make sure fetching avoided unless tag has context
        if (this.isConnected) {
          // Collect `src` urls, tracks only
          const children = this.querySelectorAll(`${name}-clip[src]`);
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
        throw MediaError({ code: 3, message: 'Unsupported mime type / codec' })
      }

      const mediaSource = new MediaSource();

      // Collect errors locally
      const promises = assets.map(asset => fetch(asset)
        .then(response => (response.ok ? response.arrayBuffer() : Promise.reject(response)))
        .catch(e => e)
      );

      // Batch download
      const resultsMaybe = await Promise.all(promises);
      const results = resultsMaybe.filter(o => !(o instanceof Error)).map(o => new Uint8Array(o));

      if (results.length === 0) {
        throw MediaError({ code: 4, message: 'Nothing to play back' })
      }

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

        window.URL.revokeObjectURL(this.src);
      }, { once: true });

      // This makes Safari flicker on first play. Using a source element seemed to help, but
      // somehow won't trigger the `sourceopen` event, which however Safari
      // don't need for playback anyway? Autoplay related maybe?
      this.src = window.URL.createObjectURL(mediaSource);
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

  video.addEventListener('error', ({ message = 'playback error' }) => {
    console.log('oops!', message);
  });

  video.appendChild(source);

  /* eslint func-style: warn */
  function createPlaylist(...list) {
    const data = list
      // Get full path
      .map(item => document.location.href + item)
      // Add duration for each clip
      .reduce((crop, item) => crop.concat('#EXTINF:1', item), [
        // Head
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-MEDIA-SEQUENCE:0',
        '#EXT-X-TARGETDURATION:2'
      ])
      // Foot
      .concat('#EXT-X-ENDLIST')
      .join('\n');

    return new Blob([data], { type: 'application/x-mpegURL' })
  }

}());
