// Generates a VAPID key pair (P-256) for Web Push, in the raw base64url format browsers expect.
const toB64Url = (buf) => Buffer.from(buf).toString("base64url");
const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const pub = toB64Url(await crypto.subtle.exportKey("raw", publicKey));
const jwk = await crypto.subtle.exportKey("jwk", privateKey);
console.log(`VAPID_PUBLIC_KEY=${pub}\nVAPID_PRIVATE_KEY=${jwk.d}\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${pub}`);
