// How we describe each flood depth. Depth is always shown as words + a
// pattern (dots vs. stripes), never by color alone.

export const DEPTH_INFO = {
  deep: { label: 'Deep flooding', detail: '1 ft or more of water', pattern: 'dw-deep' },
  nuisance: { label: 'Nuisance flooding', detail: '4 in to 1 ft of water', pattern: 'dw-nuisance' },
  none: { label: 'No modeled flooding', detail: 'Under 4 in or dry', pattern: null },
};
