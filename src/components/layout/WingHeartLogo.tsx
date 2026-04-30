interface WingHeartLogoProps {
  className?: string;
}

/** Custom mark: wings forming a heart (from design reference). */
export function WingHeartLogo({ className }: WingHeartLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M12 21.5C12 21.5 2.5 15.5 2.5 8.5C2.5 5 5 3 8 3C10 3 12 6.5 12 6.5"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M12 21.5C12 21.5 21.5 15.5 21.5 8.5C21.5 5 19 3 16 3C14 3 12 6.5 12 6.5"
        fill="currentColor"
        stroke="none"
      />
      <path d="M12 11C10 8.5 7.5 7.5 4 8.5" stroke="white" strokeWidth="1.5" />
      <path d="M12 15C10 12.5 6.5 11.5 3 13" stroke="white" strokeWidth="1.5" />
      <path d="M12 19C10 17 7.5 16 4 17.5" stroke="white" strokeWidth="1.5" />
      <path d="M12 11C14 8.5 16.5 7.5 20 8.5" stroke="white" strokeWidth="1.5" />
      <path d="M12 15C14 12.5 17.5 11.5 21 13" stroke="white" strokeWidth="1.5" />
      <path d="M12 19C14 17 16.5 16 20 17.5" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}
