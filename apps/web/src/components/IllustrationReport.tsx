export default function IllustrationReport({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={`w-full h-full ${className}`} 
      viewBox="0 0 800 600" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="glow_grad_1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        
        <linearGradient id="glow_grad_2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>

        <filter id="soft_shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="16" stdDeviation="24" floodColor="#0f172a" floodOpacity="0.08" />
        </filter>
        
        <filter id="neon_glow_1" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Decorative backdrop blobs */}
      <circle cx="200" cy="150" r="180" fill="#0891b2" opacity="0.05" />
      <circle cx="650" cy="450" r="220" fill="#0ea5e9" opacity="0.06" />

      {/* The Medical Report Paper */}
      <g transform="translate(240, 100)" filter="url(#soft_shadow)">
        <rect x="0" y="0" width="320" height="420" rx="16" fill="#ffffff" />
        {/* Document Header Line */}
        <rect x="40" y="50" width="160" height="12" rx="6" fill="#cbd5e1" />
        <rect x="40" y="80" width="80" height="8" rx="4" fill="#e2e8f0" />
        <rect x="230" y="50" width="50" height="38" rx="8" fill="#f1f5f9" />
        
        {/* Document Content List */}
        <rect x="40" y="140" width="240" height="8" rx="4" fill="#f1f5f9" />
        <rect x="40" y="160" width="200" height="8" rx="4" fill="#f1f5f9" />
        
        {/* Mock Heartbeat Chart inside the document */}
        <rect x="40" y="200" width="240" height="120" rx="8" fill="#f8fafc" />
        <path d="M 40 260 L 90 260 L 110 230 L 140 300 L 170 260 L 280 260" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        
        <rect x="40" y="340" width="180" height="8" rx="4" fill="#f1f5f9" />
        <rect x="40" y="360" width="140" height="8" rx="4" fill="#f1f5f9" />
      </g>

      {/* Futuristic AI Scanning Interface Overlays */}
      <g transform="translate(200, 240)">
        {/* Floating AI Glass Panel */}
        <rect x="0" y="0" width="400" height="120" rx="16" fill="#ffffff" fillOpacity="0.4" stroke="#06b6d4" strokeOpacity="0.5" strokeWidth="2" style={{backdropFilter: 'blur(8px)'}} filter="url(#soft_shadow)" />
        
        {/* Scanning Laser Beam */}
        <rect x="0" y="55" width="400" height="4" fill="url(#glow_grad_2)" />
        <line x1="0" y1="57" x2="400" y2="57" stroke="#06b6d4" strokeWidth="3" filter="url(#neon_glow_1)" strokeLinecap="round" />

        {/* Floating Data Nodes (Left Side) */}
        <circle cx="30" cy="30" r="12" fill="#0891b2" opacity="0.1" />
        <circle cx="30" cy="30" r="4" fill="#0891b2" />
        <line x1="30" y1="30" x2="60" y2="60" stroke="#0891b2" strokeWidth="2" strokeDasharray="4,4" />
        
        {/* Floating Data Nodes (Right Side) */}
        <circle cx="360" cy="80" r="16" fill="#0ea5e9" opacity="0.1" />
        <circle cx="360" cy="80" r="6" fill="#0ea5e9" />
        <line x1="360" y1="80" x2="330" y2="50" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="4,4" />
        
        {/* Central Data Sparkle/Processor */}
        <path d="M 200 40 L 206 50 L 216 52 L 206 54 L 200 64 L 194 54 L 184 52 L 194 50 Z" fill="url(#glow_grad_1)" filter="url(#neon_glow_1)" />
      </g>
    </svg>
  )
}
