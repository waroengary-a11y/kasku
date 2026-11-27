"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Selesaikan animasi progress bar begitu pathname berubah
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isNavigating) {
      const finishTimer = setTimeout(() => {
        setProgress(100);
        timer = setTimeout(() => {
          setIsNavigating(false);
          setProgress(0);
        }, 200);
      }, 0);
      return () => {
        clearTimeout(finishTimer);
        clearTimeout(timer);
      };
    }
  }, [pathname, isNavigating]);

  // Intersep klik pada link internal untuk langsung memicu feedback progress bar
  useEffect(() => {
    let progressTimer: NodeJS.Timeout;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        target.target !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const currentUrl = window.location.pathname + window.location.search;
        if (href !== currentUrl) {
          setIsNavigating(true);
          setProgress(35);

          progressTimer = setTimeout(() => {
            setProgress((prev) => (prev >= 35 && prev < 85 ? 75 : prev));
          }, 150);
        }
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      clearTimeout(progressTimer);
    };
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-amber-400 transition-all ease-out duration-300 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: "width, opacity",
        }}
      />
    </div>
  );
}
