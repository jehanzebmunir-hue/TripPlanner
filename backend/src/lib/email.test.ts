import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./email";

describe("sendEmail", () => {
  const originalWebhook = process.env.EMAIL_WEBHOOK_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalResendKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.EMAIL_FROM;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("setTimeout", (fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    });
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.EMAIL_WEBHOOK_URL = originalWebhook;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.RESEND_API_KEY = originalResendKey;
    process.env.EMAIL_FROM = originalFrom;
  });

  it("logs and no-ops when no provider is configured outside production, rather than throwing", async () => {
    delete process.env.EMAIL_WEBHOOK_URL;
    process.env.NODE_ENV = "development";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(sendEmail({ to: "a@b.com", subject: "Hi", text: "body" })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();

    warn.mockRestore();
  });

  it("refuses to silently log a raw reset token in production when no provider is configured", async () => {
    delete process.env.EMAIL_WEBHOOK_URL;
    process.env.NODE_ENV = "production";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      sendEmail({ to: "a@b.com", subject: "Reset", text: "token: super-secret-raw-token" })
    ).rejects.toThrow(/No email provider configured/);
    // The whole point: this secret must never reach console/log output in production.
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });

  it("posts to the configured webhook when one is set", async () => {
    process.env.EMAIL_WEBHOOK_URL = "https://example.com/send";
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await sendEmail({ to: "a@b.com", subject: "Hi", text: "body" });

    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/send",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws if the configured webhook rejects the send", async () => {
    process.env.EMAIL_WEBHOOK_URL = "https://example.com/send";
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    await expect(sendEmail({ to: "a@b.com", subject: "Hi", text: "body" })).rejects.toThrow(/Email send failed/);
  });

  describe("with a real Resend key", () => {
    it("calls Resend's real API with Bearer auth, taking priority over EMAIL_WEBHOOK_URL", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.EMAIL_WEBHOOK_URL = "https://example.com/send"; // should be ignored
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: "abc" }), { status: 200 }));

      await sendEmail({ to: "me@example.com", subject: "Reset", text: "token: xyz" });

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("https://api.resend.com/emails");
      expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer re_test_key" });
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).toMatchObject({ to: "me@example.com", subject: "Reset", text: "token: xyz" });
    });

    it("defaults the sender to Resend's sandbox address when no domain is verified", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: "abc" }), { status: 200 }));

      await sendEmail({ to: "me@example.com", subject: "Hi", text: "body" });

      const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
      expect(body.from).toBe("onboarding@resend.dev");
    });

    it("uses EMAIL_FROM when a real sending domain is configured", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.EMAIL_FROM = "reset@realtripplanner.com";
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: "abc" }), { status: 200 }));

      await sendEmail({ to: "me@example.com", subject: "Hi", text: "body" });

      const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
      expect(body.from).toBe("reset@realtripplanner.com");
    });

    it("throws with Resend's real error body on failure, rather than swallowing it", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: "You can only send to your own email" }), { status: 403 })
      );

      await expect(sendEmail({ to: "someone-else@example.com", subject: "Hi", text: "body" })).rejects.toThrow(
        /Resend send failed: 403/
      );
    });
  });
});
