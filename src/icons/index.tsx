import type { SVGProps } from "react";

/**
 * Hand-rolled 24×24 icon set — currentColor, 2px strokes, square joins to
 * match the brutalist borders. No external icon libraries (strict CSP).
 */
type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const IconMoney = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v18M7 7.5h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8" />
  </svg>
);

export const IconCrowd = (p: P) => (
  <svg {...base(p)}>
    <circle cx="7" cy="8" r="3" />
    <circle cx="17" cy="8" r="3" />
    <path d="M2 20c0-3 2.5-5 5-5s5 2 5 5M12 20c0-3 2.5-5 5-5s5 2 5 5" />
  </svg>
);

export const IconCritic = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 4l6 6-10 10H4v-6L14 4zM12 6l6 6" />
  </svg>
);

export const IconLegacy = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 3c-2 5-2 10 6 18 8-8 8-13 6-18M6 3c3 1 9 1 12 0" />
  </svg>
);

export const IconVision = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconDirector = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 10h14M7 10l-2 10M17 10l2 10M8 10V5h8v5M8 14h8" />
  </svg>
);

export const IconWriter = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 4c-8 1-13 6-15 16 6-1 12-6 13-14M5 20c3-6 7-10 12-13" />
  </svg>
);

export const IconActor = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2l2.9 6.3L21 9.2l-4.8 4.4L17.8 20 12 16.6 6.2 20l1.6-6.4L3 9.2l6.1-.9L12 2z" />
  </svg>
);

export const IconScript = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 2h12v20H6zM9 7h6M9 11h6M9 15h4" />
  </svg>
);

export const IconCamera = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="7" width="13" height="12" />
    <path d="M15 11l7-4v10l-7-4" />
  </svg>
);

export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="16" />
    <path d="M3 10h18M8 2v6M16 2v6" />
  </svg>
);

export const IconDice = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" />
    <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" strokeWidth={3} />
  </svg>
);

export const IconShield = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2l8 3v7c0 5-3.5 8-8 10-4.5-2-8-5-8-10V5l8-3z" />
  </svg>
);

export const IconScissors = (p: P) => (
  <svg {...base(p)}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M8.5 8L21 20M8.5 16L21 4" />
  </svg>
);

export const IconMegaphone = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 10v4h3l8 5V5l-8 5H3zM18 8a6 6 0 0 1 0 8" />
  </svg>
);

export const IconTrophy = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 3h10v6a5 5 0 0 1-10 0V3zM7 5H3v2a4 4 0 0 0 4 4M17 5h4v2a4 4 0 0 1-4 4M12 14v4M8 21h8M12 18v3" />
  </svg>
);

export const IconReel = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="7.5" r="1.6" />
    <circle cx="7.5" cy="12" r="1.6" />
    <circle cx="16.5" cy="12" r="1.6" />
    <circle cx="12" cy="16.5" r="1.6" />
    <path d="M12 21h9" />
  </svg>
);

export const IconHandshake = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 8l5-3 5 4 5-4 5 3M4 9v7l8 6 8-6V9M9 13l3 3 3-3" />
  </svg>
);

export const IconFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2c1 4-5 6-5 12a5 5 0 0 0 10 0c0-3-1.5-4.5-2.5-6-1 1.5-1.5 2-2.5 2 .5-3 .5-5 0-8z" />
  </svg>
);

export const IconWarning = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3L2 21h20L12 3zM12 10v5M12 18v.01" />
  </svg>
);

export const IconLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="10" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const IconChevron = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4l8 8-8 8" />
  </svg>
);

export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);

export const IconInfo = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" />
    <path d="M12 8v.01M12 11v6" />
  </svg>
);

export const IconPopcorn = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 9l2 12h8l2-9M5 9c-2-5 3-7 5-5 1-3 7-3 7 1 3 0 4 4 0 5-4 1-9 1-12-1z" />
  </svg>
);

export const IconPalette = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3a9 9 0 1 0 0 18c2 0 2-1.4 1.4-2.4-.8-1.4.2-2.6 1.8-2.6H17a5 5 0 0 0 4-5c0-5-4-8-9-8z" />
    <path d="M8 9h.01M8 14h.01M12 7h.01M16 9h.01" strokeWidth={3} />
  </svg>
);
