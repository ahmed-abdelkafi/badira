import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware as proxy } from "@/middleware";

function req(path: string, init: { cookie?: string; lang?: string } = {}) {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.lang) headers.set("accept-language", init.lang);
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

describe("proxy — admin gate (optimistic)", () => {
  it("redirects protected admin routes to login without a session cookie", () => {
    for (const p of ["/admin", "/admin/reservations", "/admin/users"]) {
      const res = proxy(req(p));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
    }
  });

  it("lets login, 2FA and password-reset pages through", () => {
    for (const p of ["/admin/login", "/admin/login/verify", "/admin/reset-password", "/admin/reset-password/abc"]) {
      expect(proxy(req(p)).headers.get("location")).toBeNull();
    }
  });

  it("passes requests that carry a session cookie (validated later by the DAL)", () => {
    expect(proxy(req("/admin/reservations", { cookie: "lb_admin_session=x" })).headers.get("location")).toBeNull();
  });
});

describe("proxy — locale routing", () => {
  it("redirects locale-less paths using Accept-Language", () => {
    expect(new URL(proxy(req("/suites", { lang: "en-GB,en;q=0.9" })).headers.get("location")!).pathname).toBe("/en/suites");
    expect(new URL(proxy(req("/", { lang: "ar-TN,ar;q=0.9" })).headers.get("location")!).pathname).toBe("/ar");
    expect(new URL(proxy(req("/", { lang: "de-DE" })).headers.get("location")!).pathname).toBe("/fr");
  });

  it("prefers the remembered locale cookie", () => {
    expect(new URL(proxy(req("/spa", { lang: "fr", cookie: "lb_locale=en" })).headers.get("location")!).pathname).toBe("/en/spa");
  });

  it("serves localized paths directly", () => {
    expect(proxy(req("/ar/suites/nour")).headers.get("location")).toBeNull();
  });
});
