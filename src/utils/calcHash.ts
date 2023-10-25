import { ethers } from "ethers";

export default function calculateHash(move: any, salt: any) {
  const moveHex = ethers.utils.hexlify(move); // Convert move to a properly formatted hexadecimal string
  const saltHex = ethers.utils.hexlify(salt); // Convert salt to a properly formatted hexadecimal string

  // Calculate the keccak256 hash
  const hash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["uint8", "uint256"],
      [moveHex, saltHex]
    )
  );

  return hash;
}
