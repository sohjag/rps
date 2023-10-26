import { UserNonce } from "@/utils/db";
import { ensureDbConnected } from "@/utils/dbConnect";
import { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { address, signature, nonce } = req.body;
    let authenticated = false;

    //get nonce from db
    const existingNonce = await UserNonce.findOne({
      user_address: address,
    });
    const currentTime = new Date();

    const tenSecondsLater = new Date(existingNonce.createdAt);
    tenSecondsLater.setSeconds(existingNonce.createdAt.getSeconds() + 10);

    if (existingNonce && tenSecondsLater > currentTime) {
      const decodedAddress = ethers.utils.verifyMessage(
        existingNonce.nonce,
        signature
      );
      console.log("decoded address is...", decodedAddress);

      if (address === decodedAddress.toLowerCase()) {
        console.log("inside IF block...");
        console.log("address is ....", address);
        console.log("decoded address is...", decodedAddress.toLowerCase());
        authenticated = true;
      }
      res.status(200).json({ authenticated });
    }
    res.status(400).json({ message: "Nonce expired or not found" });

    try {
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: "internal server error" });
    }
  } else {
    res.status(400).json({ message: "Invalid method" });
  }
}
