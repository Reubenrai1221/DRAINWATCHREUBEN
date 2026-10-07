// Tiny inline icon set so we don't need an icon library.
const PATHS = {
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  home: 'M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10',
  drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z',
  hand: 'M7 11V6a1.5 1.5 0 0 1 3 0v4m0-1V4.5a1.5 1.5 0 0 1 3 0V10m0-4a1.5 1.5 0 0 1 3 0v5m0-2a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 14a1.5 1.5 0 0 1 2.5-1.6L7 14',
  megaphone: 'M3 10v4h4l7 4V6L7 10H3Zm14-1a4 4 0 0 1 0 6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.3-4.3',
  locate: 'M12 2v3m0 14v3M2 12h3m14 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  warning: 'M12 3 2 20h20L12 3Zm0 6v5m0 3v.5',
  pin: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  check: 'M4 12.5 9 17.5 20 6.5',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  external: 'M14 4h6v6m0-6-9 9M18 14v6H4V6h6',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H4a4 4 0 0 0 4 4m8-4h4a4 4 0 0 1-4 4m-4 3v4m-4 3h8',
  close: 'M6 6l12 12M18 6 6 18',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
};

export default function Icon({ name, size = 20, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
