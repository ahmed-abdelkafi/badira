import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Public pages render per request from D1 (no ISR), so no incremental/tag
 * cache is needed: admin edits are live immediately. Static assets and
 * optimised images are cached by Cloudflare's CDN.
 */
export default defineCloudflareConfig({});
