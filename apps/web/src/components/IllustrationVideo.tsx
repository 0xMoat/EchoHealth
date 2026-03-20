export default function IllustrationVideo({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={`w-full h-full ${className}`} 
      viewBox="0 0 800 600" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vid_grad_1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        <linearGradient id="vid_grad_2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        
        <filter id="vid_shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="24" stdDeviation="32" floodColor="#0f172a" floodOpacity="0.12" />
        </filter>
        <filter id="vid_inner_shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.04" />
        </filter>

        <filter id="vid_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="16" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Decorative backdrop blobs */}
      <circle cx="650" cy="150" r="280" fill="#0891b2" opacity="0.04" />
      <circle cx="150" cy="450" r="180" fill="#0ea5e9" opacity="0.05" />

      {/* The Video Player Container */}
      <g transform="translate(140, 120)" filter="url(#vid_shadow)">
        <rect x="0" y="0" width="520" height="340" rx="20" fill="#ffffff" />
        
        {/* Video Screen Area */}
        <rect x="16" y="16" width="488" height="260" rx="12" fill="#f8fafc" filter="url(#vid_inner_shadow)" />
        
        {/* Dynamic Health Data within Video */}
        {/* Bar Chart */}
        <rect x="60" y="120" width="24" height="100" rx="4" fill="#e2e8f0" />
        <rect x="100" y="80" width="24" height="140" rx="4" fill="url(#vid_grad_1)" opacity="0.5" />
        <rect x="140" y="160" width="24" height="60" rx="4" fill="#e2e8f0" />
        <rect x="180" y="50" width="24" height="170" rx="4" fill="url(#vid_grad_1)" />
        
        {/* Line Chart / Waveform overlay */}
        <path d="M 260 200 Q 290 140 320 180 T 380 120 T 440 160" stroke="#0ea5e9" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
        {/* Dot on Line Chart */}
        <circle cx="380" cy="120" r="8" fill="#ffffff" stroke="#0ea5e9" strokeWidth="4" />
        
        {/* Video Progress Bar Area */}
        <rect x="16" y="296" width="488" height="36" rx="18" fill="#f1f5f9" />
        <rect x="16" y="296" width="240" height="36" rx="18" fill="url(#vid_grad_1)" opacity="0.1" />
        
        {/* Progress Bar Playhead */}
        <rect x="40" y="312" width="400" height="4" rx="2" fill="#cbd5e1" />
        <rect x="40" y="312" width="200" height="4" rx="2" fill="#06b6d4" />
        <circle cx="240" cy="314" r="8" fill="#0891b2" />
      </g>

      {/* Big Play Button Overlay - Center Focus */}
      <g transform="translate(400, 260)" filter="url(#vid_glow)">
        <circle cx="0" cy="0" r="50" fill="url(#vid_grad_1)" />
        <circle cx="0" cy="0" r="40" fill="#ffffff" opacity="0.2" />
        {/* Play Triangle */}
        <path d="M -10 -16 L 16 0 L -10 16 Z" fill="#ffffff" />
      </g>

    </svg>
  )
}
