import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// Public default key for DEV/TEST convenience only. Using this in production
// would mean every user-supplied API key (BYOK) is encrypted with a value
// checked into git — i.e. recoverable by anyone who reads the repo. Production
// must set a unique ENCRYPTION_KEY; getKeyHex() refuses to run otherwise.
const DEFAULT_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 chars = 32 bytes

// Resolved lazily inside encrypt/decrypt rather than at module load. `next build`
// evaluates route modules in production mode without runtime secrets (the build
// does not serve users and may legitimately lack ENCRYPTION_KEY); resolving at
// module load would break the build. Laziness means:
//   - `next build` succeeds (encrypt/decrypt are not invoked during build).
//   - A misconfigured production runtime fails loudly on the first BYOK
//     encrypt/decrypt, instead of silently using a publicly-known key.
function getKeyHex(): string {
  const keyHex = process.env.ENCRYPTION_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (!keyHex) {
    if (isProduction) {
      throw new Error(
        "FATAL: ENCRYPTION_KEY is not set in production. User API keys cannot be safely encrypted. Set the ENCRYPTION_KEY environment variable to a 64-char hex string (32 bytes)."
      );
    }
    return DEFAULT_KEY_HEX;
  }

  if (keyHex === DEFAULT_KEY_HEX && isProduction) {
    throw new Error(
      "FATAL: ENCRYPTION_KEY is set to the public default value in production. Set a unique ENCRYPTION_KEY environment variable."
    );
  }

  return keyHex;
}

export function encrypt(text: string): string {
  const keyHex = getKeyHex();
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
  // Resolve the key BEFORE the try/catch so a production misconfiguration
  // (missing/default key) throws loudly instead of being swallowed into the
  // DECRYPTION_ERROR sentinel by the catch below.
  const keyHex = getKeyHex();
  try {
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