import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 chars = 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(KEY_HEX, "hex");
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  // Format: iv:encrypted:authTag
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

export function decrypt(hash: string): string {
  try {
    const parts = hash.split(":");
    if (parts.length !== 3) throw new Error("Invalid encrypted format");
    
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], "hex");
    
    const key = Buffer.from(KEY_HEX, "hex");
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
