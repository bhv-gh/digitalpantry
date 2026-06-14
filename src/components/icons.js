/* Minimal inline SVG icons — keeps bundle small and avoids icon-lib deps. */
const base = (children) => ({ className = "w-6 h-6", ...rest } = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    {children}
  </svg>
);

export const HomeIcon   = base(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></>);
export const ScanIcon   = base(<><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M3 12h18" /></>);
export const PantryIcon = base(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 9h16" /><path d="M4 15h16" /><path d="M9 6v0" /><path d="M9 12v0" /><path d="M9 18v0" /></>);
export const CartIcon   = base(<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h2l2.5 12h11l2-8H6" /></>);
export const ChefIcon   = base(<><path d="M6 13a4 4 0 1 1 4-7 4 4 0 0 1 8 .5A4 4 0 0 1 18 13" /><path d="M6 13h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6Z" /><path d="M10 17v2" /><path d="M14 17v2" /></>);
export const GearIcon   = base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>);

export const MicIcon    = base(<><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></>);
export const CameraIcon = base(<><path d="M4 8h3l2-3h6l2 3h3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" /><circle cx="12" cy="13" r="3.5" /></>);
export const PlusIcon   = base(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
export const TrashIcon  = base(<><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /><path d="M9 7V4h6v3" /></>);
export const CheckIcon  = base(<><path d="M5 12l5 5L20 7" /></>);
export const SendIcon   = base(<><path d="M4 20l16-8L4 4l3 8-3 8Z" /><path d="M7 12h8" /></>);
export const SparkIcon  = base(<><path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="M6 6l2.5 2.5" /><path d="M15.5 15.5 18 18" /><path d="M6 18l2.5-2.5" /><path d="M15.5 8.5 18 6" /></>);
export const BackIcon   = base(<><path d="M15 6l-6 6 6 6" /></>);
