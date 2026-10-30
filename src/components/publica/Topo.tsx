import { useId } from 'react';

// La mascota (un topo con anteojos, sin nombre propio) asomando de su pozo, con las mismas piezas del logo (anteojos, pala y currículum).
// Sube del pozo al aparecer, parpadea de vez en cuando y mueve el papel; con "reducir movimiento" queda quieta.
export function Topo({ className }: { className?: string }) {
  const clip = useId();

  return (
    <div className={className} aria-hidden="true">
      <svg viewBox="200 20 280 304" focusable="false">
        <defs>
          <clipPath id={clip}>
            <rect x="200" y="20" width="280" height="274" />
          </clipPath>
        </defs>
        <ellipse cx="340" cy="296" rx="150" ry="24" fill="#6E4A29" />
        <g clipPath={`url(#${clip})`}>
          <g className="topo-sube">
            <ellipse cx="340" cy="185" rx="62" ry="70" fill="#9B8778" />
            <ellipse cx="340" cy="150" rx="20" ry="12" fill="#7C6A5D" />
            <g className="topo-parpadeo">
              <ellipse cx="326" cy="152" rx="15" ry="13" fill="#CDE7F0" />
              <ellipse cx="358" cy="152" rx="15" ry="13" fill="#CDE7F0" />
            </g>
            <circle cx="326" cy="152" r="16" fill="none" stroke="#2B2B2B" strokeWidth="4" />
            <circle cx="358" cy="152" r="16" fill="none" stroke="#2B2B2B" strokeWidth="4" />
            <line x1="341" y1="152" x2="343" y2="152" stroke="#2B2B2B" strokeWidth="4" />
            <ellipse cx="342" cy="172" rx="10" ry="7" fill="#E8879A" />
            <path d="M 322 190 Q 342 205 362 190" fill="none" stroke="#5C4A3D" strokeWidth="3" strokeLinecap="round" />
            <rect x="333" y="192" width="8" height="10" fill="#fff" rx="2" />
            <rect x="343" y="192" width="8" height="10" fill="#fff" rx="2" />
            <g transform="translate(288,225) rotate(-20)">
              <rect x="-5" y="-45" width="10" height="60" rx="5" fill="#C97B3D" />
              <path d="M -20 12 Q -24 35 0 40 Q 24 35 20 12 Q 20 2 0 2 Q -20 2 -20 12 Z" fill="#D9DCE1" />
            </g>
            <g transform="translate(390,225) rotate(12)">
              <g className="topo-papel">
                <rect x="-8" y="-30" width="30" height="42" rx="3" fill="#F5EFE3" />
                <line x1="-3" y1="-20" x2="17" y2="-20" stroke="#B7AE9B" strokeWidth="2" />
                <line x1="-3" y1="-12" x2="17" y2="-12" stroke="#B7AE9B" strokeWidth="2" />
                <line x1="-3" y1="-4" x2="17" y2="-4" stroke="#B7AE9B" strokeWidth="2" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
