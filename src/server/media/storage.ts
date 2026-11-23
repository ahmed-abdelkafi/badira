import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Object storage for media originals (Cloudflare R2 in production). */
export interface MediaStorage {
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; contentType: string; size: number } | null>;
  remove(key: string): Promise<void>;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_-]*\.[a-z0-9]{2,5}$/;

export function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key) || key.includes("..") || key.includes("//")) throw new Error("Unsafe storage key");
}

class R2Storage implements MediaStorage {
  private bucket() {
    const bucket = getCloudflareContext().env.MEDIA;
    if (!bucket) throw new Error("R2 binding `MEDIA` is not configured (see wrangler.jsonc)");
    return bucket;
  }
  async put(key: string, data: Uint8Array, contentType: string) {
    assertSafeKey(key);
    await this.bucket().put(key, data, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" } });
  }
  async get(key: string) {
    assertSafeKey(key);
    const obj = await this.bucket().get(key);
    if (!obj) return null;
    return { body: obj.body, contentType: obj.httpMetadata?.contentType ?? "application/octet-stream", size: obj.size };
  }
  async remove(key: string) {
    assertSafeKey(key);
    await this.bucket().delete(key);
  }
}

/** In-memory storage for tests. */
export class MemoryStorage implements MediaStorage {
  files = new Map<string, { data: Uint8Array; contentType: string }>();
  async put(key: string, data: Uint8Array, contentType: string) {
    assertSafeKey(key);
    this.files.set(key, { data, contentType });
  }
  async get(key: string) {
    const f = this.files.get(key);
    if (!f) return null;
    return { body: new Blob([f.data.slice()]).stream(), contentType: f.contentType, size: f.data.byteLength };
  }
  async remove(key: string) {
    this.files.delete(key);
  }
}

const g = globalThis as unknown as { __badiraStorage?: MediaStorage };
export function setTestStorage(s: MediaStorage | undefined) {
  g.__badiraStorage = s;
}

export function storage(): MediaStorage {
  return g.__badiraStorage ?? new R2Storage();
}
