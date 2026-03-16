interface VideoPlayerProps {
  src: string
  className?: string
}

export default function VideoPlayer({ src, className = '' }: VideoPlayerProps) {
  return (
    <div className={`overflow-hidden rounded-xl bg-black shadow-lg shadow-black/20 ${className}`}>
      <video
        src={src}
        controls
        className="h-full w-full"
        controlsList="nodownload"
        playsInline
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
