// DrainWatch logo: a map pin with a storm-drain grate inside it.
export function LogoMark({ size = 36 }) {
  return (
    <svg width={size * (40 / 52)} height={size} viewBox="0 0 40 52" aria-hidden="true" focusable="false">
      <path d="M20 1C9.5 1 1 9.5 1 20c0 13.5 19 31 19 31s19-17.5 19-31C39 9.5 30.5 1 20 1Z" fill="#fff" />
      <rect x="8.5" y="12" width="23" height="16" rx="4.5" fill="#17325a" />
      <g fill="#fff">
        <rect x="12" y="15" width="2.6" height="10" rx="1.3" />
        <rect x="16.6" y="15" width="2.6" height="10" rx="1.3" />
        <rect x="21.2" y="15" width="2.6" height="10" rx="1.3" />
        <rect x="25.8" y="15" width="2.6" height="10" rx="1.3" />
      </g>
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo-word">DrainWatch</span>
      <span className="logo-badge">NYC</span>
    </span>
  );
}
