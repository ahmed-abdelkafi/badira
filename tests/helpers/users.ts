import { derivePasswordProof } from "@/lib/password";
import { createAdminUser } from "@/server/auth/service";

const cache = new Map<string, string>();

/** PBKDF2 (600k iterations) is deliberately slow — cache proofs across tests. */
export async function proofFor(email: string, password: string): Promise<string> {
  const key = `${email.toLowerCase()}\u0000${password}`;
  if (!cache.has(key)) cache.set(key, await derivePasswordProof(email, password));
  return cache.get(key)!;
}

export async function makeAdmin(email: string, roleKey = "owner", password = "Correct-Horse-42", name = "Test User") {
  return createAdminUser({ email, name, roleKey, proof: await proofFor(email, password) });
}
