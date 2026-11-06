export function createRenewalJob({
  intervalMs,
  thresholdSeconds,
  onTick,
}: {
  intervalMs: number;
  thresholdSeconds: number;
  onTick: () => Promise<void> | void;
}) {
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    start() {
      if (timer) return;
      timer = setInterval(() => {
        void onTick();
      }, intervalMs);
      return true;
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = undefined;
    },
    thresholdSeconds,
  };
}
