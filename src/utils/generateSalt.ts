import BN from "bn.js";

export default function generateSalt() {
  // Generate a random 256-bit (32-byte) salt
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);

  // Convert the byte array to a Big-Endian uint256
  let salt = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    salt[i] = randomBytes[31 - i];
  }

  // Convert salt to a valid hexadecimal string with '0x' prefix
  const saltUint256 = "0x" + new BN(salt).toString("hex");

  return saltUint256;
}
