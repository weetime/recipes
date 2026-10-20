export function AtlasMark({ className = "" }) {
  return (
    <span
      className={"relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-[#102e2d] text-[#b5f5d7] shadow-[inset_0_0_0_1px_rgba(191,244,222,0.24)] " + className}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" fill="none" className="h-7 w-7">
        <path d="M20 5 34 20 20 35 6 20 20 5Z" stroke="currentColor" strokeWidth="1.5" opacity=".65" />
        <path d="M20 11v18M11 20h18" stroke="currentColor" strokeWidth="1.5" opacity=".75" />
        <circle cx="20" cy="20" r="4.5" fill="#80e7bd" />
        <circle cx="20" cy="5" r="2" fill="#f4c67b" />
        <circle cx="34" cy="20" r="2" fill="#f4c67b" />
        <circle cx="20" cy="35" r="2" fill="#f4c67b" />
        <circle cx="6" cy="20" r="2" fill="#f4c67b" />
      </svg>
    </span>
  );
}
