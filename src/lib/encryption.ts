import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

// No fallback. If ENCRYPTION_KEY is unset the module refuses to encrypt/
// decrypt — this is intentional: a hardcoded default key would let anyone
// decrypt at-rest data (e.g. UserApiKey.encryptedKey). Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// The validation happens at request time (inside encrypt/decrypt), not at
// module load, so that:
//   1. `next build` can evaluate the module without the key present locally.
//   2. A missing key fails only the encrypt/decrypt operations loudly, rather
//      than crashing the entire server on boot (taking down every route).
//   3. The security property holds — no data is encrypted/decrypted without a
//      real 64-char key.
const KEY_HEX_RAW = process.env.ENCRYPTION_KEY;

let keyValidated = false;
function assertEncryptionKey(): string {
  if (keyValidated) return KEY_HEX_RAW as string;
  keyValidated = true;
  if (!KEY_HEX_RAW || KEY_HEX_RAW.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be set to a 64-char hex string (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return KEY_HEX_RAW;
}

export function encrypt(text: string): string {
  const keyHex = assertEncryptionKey();
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(keyHex, "hex");
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:encrypted:authTag
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

export function decrypt(hash: string): string {
  try {
    const keyHex = assertEncryptionKey();
    const parts = hash.split(":");
    if (parts.length !== 3) throw new Error("Invalid encrypted format");

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], "hex");

    const key = Buffer.from(keyHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    // Don't log err — it may include ciphertext fragments. Caller checks for
    // the DECRYPTION_ERROR sentinel and handles the failure explicitly.
    return "DECRYPTION_ERROR";
  }
}
