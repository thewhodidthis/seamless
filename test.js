import 'cutaway'
import { report, assert } from 'tapeless'
import { Seamless } from './index.mjs'

const { ok, notOk, equal } = assert

equal
  .describe('will export default class')
  .test(typeof Seamless, 'function')

try {
  customElements.define('very-seamless', Seamless)
} catch (e) {
  ok
    .describe('will define `&lt;very-seamless&gt;`')
    .test(e)
}

ok
  .describe('tag known')
  .test(document.createElement('very-seamless') instanceof HTMLElement)

notOk
  .describe('tag not unknown')
  .test(document.createElement('very-seamless') instanceof HTMLVideoElement)

const obj = new Seamless()

ok
  .describe('will construct')
  .test(obj instanceof Seamless)

const tag = document.createElement('very-seamless')

tag.style.display = 'none'
tag.src = ''

document.body.appendChild(tag)

ok
  .describe('will connect')
  .test(tag.isConnected)

report()
