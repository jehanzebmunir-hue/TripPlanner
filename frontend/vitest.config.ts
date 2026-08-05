import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    // The default 5000ms per-test timeout is tight for a real multi-step
    // userEvent + async-render test under genuine parallel-worker resource
    // contention (confirmed live: several different, unrelated tests each
    // individually pass in well under a second in isolation, but the whole
    // suite intermittently timed out a different one each run once run in
    // full parallel). A single global increase here, not a pile of
    // per-test timeout overrides chasing whichever test loses that day.
    testTimeout: 15000,
  },
});
