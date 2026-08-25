"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error";

const AvatarContext = React.createContext<{
  status: ImageLoadingStatus;
  setStatus: (status: ImageLoadingStatus) => void;
} | null>(null);

function useAvatarContext(component: string) {
  const context = React.useContext(AvatarContext);
  if (!context) throw new Error(`${component} must be used within <Avatar>`);
  return context;
}

export const Avatar = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const [status, setStatus] = React.useState<ImageLoadingStatus>("idle");
  const context = React.useMemo(() => ({ status, setStatus }), [status]);
  return (
    <AvatarContext.Provider value={context}>
      <span
        ref={ref}
        className={cn(
          "relative flex size-10 shrink-0 overflow-hidden rounded-full",
          className,
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
});
Avatar.displayName = "Avatar";

export type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

// Preloads via an off-DOM Image() (same technique Radix uses) rather than
// rendering a plain <img> straight away -- avoids a flash of the browser's
// broken-image icon before we know whether `src` actually resolves.
export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, ...props }, ref) => {
    const { status, setStatus } = useAvatarContext("AvatarImage");

    React.useEffect(() => {
      if (!src) {
        setStatus("error");
        return;
      }
      setStatus("loading");
      let cancelled = false;
      const preload = new window.Image();
      preload.src = src as string;
      preload.onload = () => {
        if (!cancelled) setStatus("loaded");
      };
      preload.onerror = () => {
        if (!cancelled) setStatus("error");
      };
      return () => {
        cancelled = true;
      };
    }, [src, setStatus]);

    if (status !== "loaded") return null;

    return (
      // Arbitrary, unconfigured-domain avatar URLs (any tenant's user
      // photo) -- next/image requires remotePatterns known up front, which
      // doesn't fit; a small circular avatar is the canonical case where a
      // plain <img> (already preloaded above, so no layout shift) is fine.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn("aspect-square size-full object-cover", className)}
        {...props}
      />
    );
  },
);
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const { status } = useAvatarContext("AvatarFallback");
  if (status === "loaded") return null;
  return (
    <span
      ref={ref}
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = "AvatarFallback";
