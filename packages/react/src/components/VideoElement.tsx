import { useEffect, useRef } from "react"

export default function VideoElement() {
    const ref = useRef<HTMLVideoElement>(null)

    return (
        <video ref={ref} className="w-full flex" controls>
            <source src="https://ik.imagekit.io/ikmedia/docs_images/examples/Videos/example_video_2.mp4" type="video/mp4" />
        </video>
    )
}