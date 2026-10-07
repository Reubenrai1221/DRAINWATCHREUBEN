import { DEPTH_INFO } from '../config/flood';

// SVG fill patterns for the two flood depths. Map shapes and legend swatches
// both reference these by id (fill="url(#dw-deep)"), so depth is shown with
// dots vs. stripes as well as light vs. dark blue.
export function FloodPatternDefs() {
  return (
    <svg className="pattern-defs" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="dw-nuisance" width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill="#a9d8f5" />
          <circle cx="3.5" cy="3.5" r="1.4" fill="#1f6fae" />
        </pattern>
        <pattern id="dw-deep" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#2463c4" />
          <rect width="3" height="7" fill="#0a2a66" />
        </pattern>
      </defs>
    </svg>
  );
}

export function DepthSwatch({ depth, size = 18 }) {
  const { pattern } = DEPTH_INFO[depth];
  return (
    <svg className="swatch" width={size} height={size} aria-hidden="true" focusable="false">
      <rect
        x="0.5"
        y="0.5"
        width={size - 1}
        height={size - 1}
        rx="3"
        fill={pattern ? `url(#${pattern})` : '#ffffff'}
        stroke={pattern ? '#0a2a66' : '#6b7a90'}
        strokeDasharray={pattern ? undefined : '3 2'}
      />
    </svg>
  );
}
