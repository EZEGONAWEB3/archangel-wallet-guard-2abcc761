import { cn } from "@/lib/utils";

/** ArchAngel mark: a shield flanked by stylised wings. Uses currentColor + primary tokens. */
export function ShieldMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={cn("size-8", className)}>
      <defs>
        <linearGradient id="aa-shield" x1="10" y1="4" x2="38" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--primary-glow)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <path
        d="M4 14c4 1 7 3 9 6-3-.5-5.5 0-7.5 1.5C7 18.5 6 16 4 14Zm40 0c-4 1-7 3-9 6 3-.5 5.5 0 7.5 1.5C41 18.5 42 16 44 14Z"
        fill="var(--primary-glow)"
        opacity=".55"
      />
      <path
        d="M24 5 12 9.5v11.2c0 9 5.2 16.4 12 20.3 6.8-3.9 12-11.3 12-20.3V9.5L24 5Z"
        fill="url(#aa-shield)"
      />
      <path
        d="M24 9.2 15.5 12.4v8.4c0 6.6 3.6 12.2 8.5 15.3 4.9-3.1 8.5-8.7 8.5-15.3v-8.4L24 9.2Z"
        fill="var(--background)"
        opacity=".55"
      />
      <path d="m19.5 23 3.2 3.2 6-6.4" stroke="var(--primary-glow)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
