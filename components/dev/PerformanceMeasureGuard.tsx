"use client";

import { useEffect } from "react";

/**
 * Next.js / React Turbopack dev bug: when a Server Component aborts via
 * notFound()/redirect() before children finish, React calls
 * performance.measure() with childrenEndTime = -Infinity and the browser
 * throws. Production builds are unaffected.
 *
 * @see https://github.com/vercel/next.js/issues/86060
 */
export function PerformanceMeasureGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof performance === "undefined" || typeof performance.measure !== "function") {
      return;
    }

    const original = performance.measure.bind(performance);
    performance.measure = ((...args: Parameters<typeof performance.measure>) => {
      try {
        return original(...args);
      } catch (error) {
        if (
          error instanceof Error &&
          /negative time stamp|cannot be negative/i.test(error.message)
        ) {
          return undefined as unknown as PerformanceMeasure;
        }
        throw error;
      }
    }) as typeof performance.measure;

    return () => {
      performance.measure = original;
    };
  }, []);

  return null;
}
