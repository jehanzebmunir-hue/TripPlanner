import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import "../i18n"; // initializes i18next once for every test, defaulting to English

afterEach(() => {
  cleanup();
});
