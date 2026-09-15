/**
 * KairoID brand mark - official transparent logo asset.
 *
 * Single source of truth for the KairoID logo across the Admin Portal.
 * Swap the asset here to change every logo instance at once.
 */
import kairoLogoUrl from "@/assets/kairo-logo.png";
import { cn } from "@/lib/utils";

export interface KairoLogoProps {
  className?: string;
  /** Width in px. Height auto-scales to the logo's aspect ratio. */
  width?: number;
  /** Accessible label. */
  title?: string;
}

// Native aspect ratio of the approved transparent wordmark asset.
const LOGO_ASPECT = 2019 / 492;

export function KairoLogo({ className, width = 150, title = "KairoID" }: KairoLogoProps) {
  const height = Math.round(width / LOGO_ASPECT);
  return (
    <img
      src={kairoLogoUrl}
      alt={title}
      width={width}
      height={height}
      className={cn("inline-block select-none object-contain", className)}
      draggable={false}
    />
  );
}
