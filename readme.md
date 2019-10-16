> Helps sequence clips on demand


### Setup
```sh
# Fetch latest from github
npm i thewhodidthis/seamless
```

### Usage
```js
import { Seamless, SeamlessClip } from '@thewhodidthis/seamless'

// Need builtin extends polyfill for Safari
const video = new Seamless()

Array.from({ length: 4 })
    .map((_, i) => `fragment-${i}.mp4`)
    .forEach((src) => {
        const clip = new SeamlessClip()

        clip.src = src

        video.appendChild(clip)
    })

// Attempt to create a composite clip once connected
document.body.appendChild(video)
```

### Encoding
```sh
# Add keyframes for segmenting, eg. every second
# https://superuser.com/questions/908280/what-is-the-correct-way-to-fix-keyframes-in-ffmpeg-for-dash
ffmpeg -i input -c:v libx264 -r 24 -x264opts keyint=24:min-keyint=24 master.mp4

# Print keyframes
ffprobe -select_streams v:0 -skip_frame nokey -show_entries frame=pkt_pts_time master.mp4

# Create segments, eg. every second
ffmpeg -i input -c copy -map 0 -segment_time 1 -f segment -reset_timestamps 1 clip-%03d.mp4

# Create fragments
for f in clip-*.mp4; do mp4fragment --fragment-duration 1000 $f ${f%.mp4}-fragment.mp4; done
```

### References
- [simpl.info/mse](https://simpl.info/mse)
- [developers.google.com/web/fundamentals/media/mse/seamless-playback](https://developers.google.com/web/fundamentals/media/mse/seamless-playback)
- [github.com/w3c/media-source/issues/190](https://github.com/w3c/media-source/issues/190)
