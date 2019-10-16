import '../index.mjs'

const clips = document.querySelectorAll('very-seamless-clip[alt]')
const assets = Array.from(clips).map(o => o.getAttribute('alt'))

const blob = createPlaylist(...assets)
const src = window.URL.createObjectURL(blob)

// Safari: need append a `<source>` element instead of setting the video `src` attribute
const source = document.createElement('source')

source.setAttribute('src', src)
source.setAttribute('type', blob.type)

const video = document.querySelector('video')

video.addEventListener('error', (e) => {
  console.log('oops!', e.message)
})

video.appendChild(source)

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
    .join('\n')

  return new Blob([data], { type: 'application/x-mpegURL' })
}
