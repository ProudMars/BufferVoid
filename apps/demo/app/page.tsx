'use client'

import BufferVoid from "@repo/video-player/src/buffer-void.ts"
import { useEffect } from "react"

export default function Home() {
  useEffect(() => {
    const bv = new BufferVoid('buffer-void', {
      muted: true,
      autoplay: true,
      width: 680,
      height: 400,
      src: "https://ik.imagekit.io/ikmedia/docs_images/examples/Videos/example_video_2.mp4",
      controls: true,
      preload: "metadata"
    })

    const player = bv.getPlayer()
    player?.autoPlay()

  }, [])

  return (
    <div className="w-4xl">
      <div id="buffer-void" className="relative">
        <div className="absolute bottom-0 h-12 text-white border w-[calc(100%-40px)]">
          hello
        </div>
      </div>
    </div>
  )
}
