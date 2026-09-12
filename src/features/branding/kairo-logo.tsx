/**
 * KairoID brand mark — official logo asset.
 *
 * Single source of truth for the KairoID logo across the Admin Portal.
 * Swap the asset here to change every logo instance at once.
 */
import kairoLogoUrl from "@/assets/kairoid-logo-primary.png";
import { cn } from "@/lib/utils";

export interface KairoLogoProps {
  className?: string;
  /** Width in px. Height auto-scales to the logo's aspect ratio. */
  width?: number;
  /** When false, render a compact mark-only crop (chevron only). */
  showWordmark?: boolean;
  /** Accessible label. */
  title?: string;
}

const LOGO_ASPECT = 728 / 192;

export function KairoLogo({
  className,
  width = 150,
  showWordmark = true,
  title = "KairoID",
}: KairoLogoProps) {
  if (showWordmark) {
    const height = Math.round(width / LOGO_ASPECT);
    return (
      <img
        src={kairoLogoUrl}
        alt={title}
        width={width}
        height={height}
        className={cn("inline-block select-none", className)}
        draggable={false}
      />
    );
  }

  return (
    <img
      src="/kairo-mark.png"
      alt={title}
      width={width}
      height={width}
      className={cn("inline-block select-none", className)}
      draggable={false}
    />
  );
}
