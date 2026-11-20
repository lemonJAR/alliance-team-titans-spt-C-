// One consistent, dependency-free icon set (24x24 stroke icons).
// Replaces the mix of emoji (🏫 🎓 📅), text glyphs (↻ ⏻ @ *) used before.
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

const paths = {
  school: <><path d="M3 10l9-6 9 6" /><path d="M5 10v9h14v-9" /><path d="M10 19v-5h4v5" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2c2.9.2 5 2.4 5 5.8" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  grades: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
  chart: <><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  bell: <><path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z" /><path d="M10 20a2 2 0 004 0" /></>,
  audit: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  pencil: <><path d="M4 20l4-1 11-11a2.1 2.1 0 00-3-3L5 16l-1 4z" /></>,
  refresh: <><path d="M20 11a8 8 0 00-14-4L4 9" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0014 4l2-2" /><path d="M20 20v-5h-5" /></>,
  logout: <><path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4" /><path d="M15 8l4 4-4 4M19 12H9" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
};

export default function Icon({ name, size = 18, style, ...rest }) {
  return (
    <svg {...base} width={size} height={size} style={style} {...rest}>
      {paths[name] || null}
    </svg>
  );
}