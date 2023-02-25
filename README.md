## about

Helps sequence clips on demand.

## setup

Load via HTML script tag:

```html
<!-- Just an IIFE namespaced `seamless` -->
<script src="https://thewhodidthis.github.io/seamless/seamless.js"></script>
```

Source from an import map:

```json
{
  "imports": {
    "@thewhodidthis/seamless": "https://thewhodidthis.github.io/seamless/main.js"
  }
}
```

Download from GitHub directly if using a package manager:

```sh
# Add to package.json
pnpm install thewhodidthis/seamless
```

## usage

Instantiate a customized `<video>` element fed with seamless tracks.

```js
import { Seamless, SeamlessClip } from "@thewhodidthis/seamless"

// Extends `HTMLVideoElement` built-in, Safari needs polyfilling.
const video = new Seamless()

for (let i = 0; i < 4; i += 1) {
  const clip = new SeamlessClip()

  clip.setAttribute("src", `fragment-${i}.mp4`)
  video.appendChild(clip)
}

// Render via `connectedCallback`.
document.body.appendChild(video)
```

Proper encoding is half the work. For example,

```sh
# Add keyframes for segmenting, eg. every second:
# https://superuser.com/questions/908280
ffmpeg -i input -c:v libx264 -r 24 -x264opts keyint=24:min-keyint=24 master.mp4

# Print keyframes.
ffprobe -select_streams v:0 -skip_frame nokey -show_entries frame=pkt_pts_time master.mp4

# Create segments, eg. every second:
ffmpeg -i input -c copy -map 0 -segment_time 1 -f segment -reset_timestamps 1 clip-%03d.mp4

# Create fragments.
for f in clip-*.mp4; do mp4fragment --fragment-duration 1000 $f ${f%.mp4}-fragment.mp4; done
```

## see also

- [simpl.info/mse](https://simpl.info/mse)
- [developers.google.com/web/fundamentals/media/mse/seamless-playback](https://developers.google.com/web/fundamentals/media/mse/seamless-playback)
- [github.com/w3c/media-source/issues/190](https://github.com/w3c/media-source/issues/190)
