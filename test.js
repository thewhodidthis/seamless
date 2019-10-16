import '@ungap/custom-elements-builtin'
import 'cutaway'
import { report, assert } from 'tapeless'
import { Seamless, SeamlessClip } from './index.mjs'

const { ok, notOk, equal } = assert

equal
  .describe('will export')
  .test(typeof Seamless, 'function')
  .test(typeof SeamlessClip, 'function')

try {
  customElements.define('very-seamless', Seamless, { extends: 'video' })
} catch (e) {
  ok
    .describe('will define `&lt;very-seamless&gt;`')
    .test(e)
}

const video = document.createElement('video', { is: 'very-seamless' })

ok
  .describe('tag known')
  .test(video instanceof HTMLElement)

notOk
  .describe('tag not unknown')
  .test(video instanceof HTMLUnknownElement)

video.style.display = 'none'
video.muted = 'muted'
video.width = 320
video.height = 240

equal
  .describe('will default encoding')
  .test(video.encoding, 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"')

Array.from({ length: 4 })
  .map(() => 'https://cors-anywhere.herokuapp.com/https://github.com/thewhodidthis/seamless')
  .map((a, i) => `${a}/raw/master/example/assets/fragment-${i}.mp4`)
  .forEach((src) => {
    const clip = new SeamlessClip()

    clip.src = src

    video.appendChild(clip)
  })

document.body.appendChild(video)

;(async () => {
  try {
    await video.play()

    ok
      .describe('will play')
      .test(true)
  } catch (e) {
    ok
      .describe('unable to trigger play')
      .test(e instanceof Error)
  } finally {
    report()
  }
})()
