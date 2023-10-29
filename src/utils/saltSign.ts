import { ethers } from "ethers";

export function hexStringToUint256(hexString: any) {
  console.log("param received in hexStringToUint256..", hexString);
  return new Promise((resolve, reject) => {
    try {
      // Create a BigNumber from the hex string
      const bigNumberValue = ethers.BigNumber.from(hexString);

      // Convert the BigNumber to a string representation of uint256
      const uint256String = bigNumberValue.toString();

      resolve(uint256String);
    } catch (error) {
      reject(error);
    }
  });
}
