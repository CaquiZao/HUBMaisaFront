import { useId } from "react";

/**
 * Ícones — inline SVG, 16px, stroke 1.5px currentColor.
 * Não usar biblioteca de ícones (sem dependência extra).
 */

type IconProps = {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
};

const base = ({ size = 16, className }: IconProps) => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className,
});

export function IconHome(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="M2.5 7.5 8 3l5.5 4.5" />
      <path d="M4 7v6h8V7" />
    </svg>
  );
}

export function IconArchive(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <rect x="2.5" y="3" width="11" height="3" rx="1" />
      <path d="M3.5 6v6.5A.5.5 0 0 0 4 13h8a.5.5 0 0 0 .5-.5V6" />
      <path d="M6.5 9h3" />
    </svg>
  );
}

export function IconKanban(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <rect x="2.5" y="2.5" width="3" height="11" rx="0.5" />
      <rect x="6.5" y="2.5" width="3" height="7" rx="0.5" />
      <rect x="10.5" y="2.5" width="3" height="9" rx="0.5" />
    </svg>
  );
}

export function IconBulb(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="M8 2.5a4 4 0 0 0-2.5 7.1V11h5V9.6A4 4 0 0 0 8 2.5Z" />
      <path d="M6.5 13h3" />
      <path d="M7 14.5h2" />
    </svg>
  );
}

export function IconSettings(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <circle cx="8" cy="8" r="1.6" />
      <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M12.2 3.8l-1 1M4.8 11.2l-1 1" />
    </svg>
  );
}

export function IconBell(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="M8 2.5a3.5 3.5 0 0 0-3.5 3.5v2.8L3.2 11h9.6l-1.3-2.2V6A3.5 3.5 0 0 0 8 2.5Z" />
      <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

export function IconSearch(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <circle cx="7" cy="7" r="4.2" />
      <path d="m10.2 10.2 3 3" />
    </svg>
  );
}

export function IconPin({
  size = 16,
  className,
  filled,
}: IconProps & { filled?: boolean } = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1v3.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

export function IconStar({
  filled,
  ...p
}: IconProps & { filled?: boolean } = {}) {
  return (
    <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
      <path d="m8 2.5 1.6 3.4 3.7.4-2.7 2.6.7 3.7L8 10.8 4.7 12.6l.7-3.7L2.7 6.3l3.7-.4Z" />
    </svg>
  );
}

export function IconFile(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="M4 2.5h5l3 3V13a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 4 13Z" />
      <path d="M9 2.5V5.5H12" />
    </svg>
  );
}

export function IconLink(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="M7 9a2.5 2.5 0 0 1 0-3.5l2-2a2.5 2.5 0 0 1 3.5 3.5l-1 1" />
      <path d="M9 7a2.5 2.5 0 0 1 0 3.5l-2 2a2.5 2.5 0 0 1-3.5-3.5l1-1" />
    </svg>
  );
}

export function IconDoc(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <rect x="3.5" y="2.5" width="9" height="11" rx="0.5" />
      <path d="M5.5 5.5h5M5.5 7.5h5M5.5 9.5h3" />
    </svg>
  );
}

export function IconAta(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="2.5" width="10" height="11" rx="0.5" />
      <path d="M5.5 5.5h5M5.5 7.5h5M5.5 9.5h2" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconPlus(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function IconChevronRight(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="m6 3.5 4 4.5-4 4.5" />
    </svg>
  );
}

export function IconChevronUp(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="m3.5 10 4.5-4 4.5 4" />
    </svg>
  );
}

export function IconExternal(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="M6 3.5H3.5v9h9V10" />
      <path d="M9 3.5h3.5V7" />
      <path d="m7 9 5.5-5.5" />
    </svg>
  );
}

export function IconClose(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

export function IconCornerDown(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="M3 3v5.5a2 2 0 0 0 2 2h7" />
      <path d="m9.5 8.5 3 2-3 2" />
    </svg>
  );
}

export function IconImage(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <rect x="2.5" y="3" width="11" height="10" rx="1" />
      <circle cx="6" cy="6.5" r="1" />
      <path d="m3 11 3-3 3 2 2-2 2 3" />
    </svg>
  );
}

export function IconGrid(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.75" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="0.75" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="0.75" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="0.75" />
    </svg>
  );
}

export function IconList(p: IconProps = {}) {
  return (
    <svg {...base(p)}>
      <path d="M5 4h8M5 8h8M5 12h8" />
      <circle cx="3" cy="4" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="3" cy="8" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MaisaLogoIcon({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const pathId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="48" fill="#133863" />
      <path
        id={pathId}
        d="M 50 14.5 A 35.5 35.5 0 1 1 49.99 14.5"
        fill="none"
        stroke="none"
      />
      <text
        fill="#F7C948"
        fontSize="14.5"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        <textPath
          href={`#${pathId}`}
          startOffset="0%"
          textLength="223"
          lengthAdjust="spacing"
        >
          maisa maisa maisa maisa
        </textPath>
      </text>
    </svg>
  );
}
