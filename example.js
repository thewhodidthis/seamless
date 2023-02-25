import "./main.js"

const host = document.querySelector("video")
const type = "application/x-mpegURL"

if (host.canPlayType(type)) {
  const observer = new MutationObserver((mutations) => {
    const isReady = mutations.some(m => m.attributeName === "src")

    // This a non MSE browser most likely.
    if (isReady) {
      host.removeAttribute("src")
    }
  })

  observer.observe(host, { attributeFilter: ["src"] })

  const list = document.querySelectorAll("very-seamless-clip[alt]")
  const data = Array.from(list)
    // Get full path.
    .map(clip => clip.getAttribute("alt"))
    .map(item => document.location.href + item)
    // Add duration for each clip.
    .reduce((crop, item) => crop.concat("#EXTINF:1", item), [
      // Head
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-MEDIA-SEQUENCE:0",
      "#EXT-X-TARGETDURATION:2",
    ])
    // Foot
    .concat("#EXT-X-ENDLIST")
    .join("\n")

  const blob = new Blob([data], { type })
  const src = window.URL.createObjectURL(blob)

  // Safari: need append a `<source>` element instead of setting the video `src` attribute.
  const source = document.createElement("source")

  source.setAttribute("type", type)
  source.setAttribute("src", src)

  host.appendChild(source)
}

host.addEventListener("error", ({ message = "playback error" }) => {
  console.log("oops!", message)
})
