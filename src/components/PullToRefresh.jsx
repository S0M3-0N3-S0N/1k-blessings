import { useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(null);
  const THRESHOLD = 70;

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      setPulling(true);
      setPullDistance(Math.min(delta, THRESHOLD + 20));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(0);
      setPulling(false);
      await onRefresh();
      setRefreshing(false);
    } else {
      setPulling(false);
      setPullDistance(0);
    }
    startY.current = null;
  }, [pullDistance, onRefresh]);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative"
    >
      {(pulling || refreshing) && (
        <div
          className="flex items-center justify-center transition-all duration-200"
          style={{ height: refreshing ? 48 : pullDistance }}
        >
          <Loader2
            className={`w-5 h-5 text-primary ${refreshing ? "animate-spin" : ""}`}
            style={{ opacity: Math.min(pullDistance / THRESHOLD, 1) }}
          />
        </div>
      )}
      {children}
    </div>
  );
}