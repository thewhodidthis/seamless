export class SeamlessClip extends HTMLElement {
  constructor(src) {
    super()

    this.src = src
  }

  get src() {
    return this.getAttribute('src')
  }

  set src(v) {
    if (v) {
      this.setAttribute('src', v)
    }
  }
}

export class Seamless extends HTMLVideoElement {
  constructor(encoding = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"') {
    super()

    // A bit of a pain, eg. 'video/webm; codecs="vorbis, vp8"'
    // More, https://tools.ietf.org/html/rfc6381#section-3.3
    this.encoding = encoding
  }

  connectedCallback() {
    const ns = this.getAttribute('is')

    // Allow for attaching event listeners in time
    window.customElements.whenDefined(ns).then(() => {
      // Make sure fetching avoided unless tag has context
      if (this.isConnected) {
        // Collect `src` urls, tracks only
        const children = this.querySelectorAll(`${ns}-clip[src]`)
        const assets = Array.from(children).map(o => o.getAttribute('src'))

        this.render(...assets).catch(({ message }) => {
          const error = new ErrorEvent('error', { message })

          this.dispatchEvent(error)
        })
      }
    })
  }

  async render(...assets) {
    // Collect errors locally
    const promises = assets.map(asset => fetch(asset)
      .then(response => (response.ok ? response.arrayBuffer() : Promise.reject(response)))
      .catch(e => e)
    )

    // Bail out quick
    if (MediaSource.isTypeSupported(this.encoding) === false) {
      throw Error('Unsupported mime type / codec')
    }

    // Batch download
    const resultsMaybe = await Promise.all(promises)
    const results = resultsMaybe
      // Drop errors + blanks
      .filter(result => !(result instanceof Error))
      .filter(result => !!result)
      // Format data
      .map(buffer => new Uint8Array(buffer))

    if (results.length === 0) {
      throw Error('Nothing to play back')
    }

    const mediaSource = new MediaSource()
    const { URL } = window

    mediaSource.addEventListener('sourceopen', () => {
      const sourceBuffer = mediaSource.addSourceBuffer(this.encoding)
      const { mode } = sourceBuffer

      if (mode === 'segments') {
        sourceBuffer.mode = 'sequence'
      }

      sourceBuffer.appendBuffer(results.shift())
      sourceBuffer.addEventListener('updateend', () => {
        if (results.length) {
          sourceBuffer.appendBuffer(results.shift())
        } else if (mediaSource.readyState === 'open' && sourceBuffer.updating === false) {
          mediaSource.endOfStream()
        }
      })

      URL.revokeObjectURL(this.src)
    })

    this.src = URL.createObjectURL(mediaSource)
  }
}

window.customElements.define('very-seamless-clip', SeamlessClip)
window.customElements.define('very-seamless', Seamless, { extends: 'video' })
