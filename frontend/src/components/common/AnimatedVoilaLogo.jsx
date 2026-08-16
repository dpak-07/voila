import React from 'react';

export function AnimatedVoilaLogo({ size = 64, className = '', isAnimated = true }) {
  return (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Main Gradient */}
          <linearGradient id="voilaMainGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="35%" stopColor="#6366f1" />
            <stop offset="70%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Node Glow Gradient */}
          <linearGradient id="voilaNodeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>

          {/* Bars Gradient */}
          <linearGradient id="voilaBarGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="60%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          {/* Glow Filter */}
          <filter id="voilaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <style>
          {`
            @keyframes voilaDrawPath {
              0% { stroke-dashoffset: 600; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes voilaPulseGlow {
              0%, 100% { transform: scale(1); opacity: 0.9; }
              50% { transform: scale(1.18); opacity: 1; filter: drop-shadow(0 0 8px #38bdf8); }
            }
            @keyframes voilaBarRise {
              0% { transform: scaleY(0.2); transform-origin: bottom; opacity: 0.4; }
              50% { transform: scaleY(1); transform-origin: bottom; opacity: 1; }
              100% { transform: scaleY(0.7); transform-origin: bottom; opacity: 0.8; }
            }
            @keyframes voilaNodeTravel {
              0% { offset-distance: 0%; }
              100% { offset-distance: 100%; }
            }
            @keyframes voilaFloat {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-4px); }
            }
            .voila-animated-root {
              animation: ${isAnimated ? 'voilaFloat 3.5s ease-in-out infinite' : 'none'};
            }
            .voila-path-main {
              stroke-dasharray: 600;
              stroke-dashoffset: 0;
              animation: ${isAnimated ? 'voilaDrawPath 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none'};
            }
            .voila-node-1 {
              animation: ${isAnimated ? 'voilaPulseGlow 2.2s ease-in-out infinite' : 'none'};
            }
            .voila-node-2 {
              animation: ${isAnimated ? 'voilaPulseGlow 2.2s ease-in-out infinite 0.4s' : 'none'};
            }
            .voila-node-3 {
              animation: ${isAnimated ? 'voilaPulseGlow 2.2s ease-in-out infinite 0.8s' : 'none'};
            }
            .voila-bar-1 {
              animation: ${isAnimated ? 'voilaBarRise 2.8s ease-in-out infinite 0.2s' : 'none'};
            }
            .voila-bar-2 {
              animation: ${isAnimated ? 'voilaBarRise 2.8s ease-in-out infinite 0.5s' : 'none'};
            }
            .voila-bar-3 {
              animation: ${isAnimated ? 'voilaBarRise 2.8s ease-in-out infinite 0.8s' : 'none'};
            }
          `}
        </style>

        <g className="voila-animated-root">
          {/* Subtle Ambient Background Ring */}
          <circle 
            cx="100" 
            cy="100" 
            r="88" 
            stroke="url(#voilaMainGrad)" 
            strokeWidth="1.5" 
            strokeOpacity="0.15" 
            strokeDasharray="6 8"
          />

          {/* Ascending Analytical Bars (Right Wing of V) */}
          {/* Bar 1 (Short) */}
          <path
            d="M126 102 L144 54 Q146 48 152 50 L156 52 Q160 55 157 62 L138 112 Z"
            fill="url(#voilaBarGrad)"
            opacity="0.85"
            className="voila-bar-1"
          />

          {/* Bar 2 (Medium) */}
          <path
            d="M142 90 L162 36 Q164 30 170 32 L174 34 Q178 37 175 44 L154 100 Z"
            fill="url(#voilaBarGrad)"
            opacity="0.95"
            className="voila-bar-2"
          />

          {/* Bar 3 (Tall) */}
          <path
            d="M158 78 L178 20 Q180 14 186 16 L190 18 Q194 21 191 28 L170 88 Z"
            fill="url(#voilaBarGrad)"
            className="voila-bar-3"
          />

          {/* Main Conversational 'V' Swoop with Left Speech Bubble */}
          <path
            d="
              M 68 56
              A 32 32 0 1 0 72 108
              L 54 126
              L 76 122
              A 32 32 0 0 0 102 96
              L 122 144
              C 130 162, 142 170, 154 158
              L 182 104
            "
            stroke="url(#voilaMainGrad)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="voila-path-main"
            filter="url(#voilaGlow)"
          />

          {/* Central Connecting Signal Spine Curve */}
          <path
            d="M 64 88 L 102 148 Q 118 174 136 142 L 174 72"
            stroke="url(#voilaMainGrad)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Network Node Signal Line */}
          <path
            d="M 120 110 L 140 100 L 160 118 L 186 86"
            stroke="#38bdf8"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#voilaGlow)"
          />

          {/* Data Nodes (Glowing Signal Circles) */}
          <g className="voila-node-1" style={{ transformOrigin: '120px 110px' }}>
            <circle cx="120" cy="110" r="8" fill="#ffffff" stroke="#0284c7" strokeWidth="3.5" />
            <circle cx="120" cy="110" r="3.5" fill="#38bdf8" />
          </g>

          <g className="voila-node-2" style={{ transformOrigin: '160px 118px' }}>
            <circle cx="160" cy="118" r="8" fill="#ffffff" stroke="#6366f1" strokeWidth="3.5" />
            <circle cx="160" cy="118" r="3.5" fill="#818cf8" />
          </g>

          <g className="voila-node-3" style={{ transformOrigin: '186px 86px' }}>
            <circle cx="186" cy="86" r="9" fill="#ffffff" stroke="#8b5cf6" strokeWidth="4" />
            <circle cx="186" cy="86" r="4" fill="#c084fc" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export default AnimatedVoilaLogo;
