import { UserNonce } from "@/utils/db";
import { ensureDbConnected } from "@/utils/dbConnect";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const { userAddress } = req.query;
      await ensureDbConnected();

      console.log("use address received is...", userAddress);

      const existingNonce = await UserNonce.findOne({
        user_address: userAddress,
      });

      if (existingNonce) {
        // Check if the existing nonce has not expired
        const currentTime = new Date();

        const tenSecondsLater = new Date(existingNonce.createdAt);
        tenSecondsLater.setSeconds(existingNonce.createdAt.getSeconds() + 10);
        console.log("current time is ....", currentTime);
        console.log("nonce time is ....", existingNonce.createdAt);
        console.log("tenSecondsLater time is ....", tenSecondsLater);

        if (tenSecondsLater > currentTime) {
          console.log("nonce still valid");
          let currentNonce = existingNonce.nonce;
          res.status(200).json({ nonce: currentNonce });
        } else {
          console.log("nonce now INVALID");

          // The existing nonce has expired, generate a new one
          const newNonce = generateRandom8DigitNumber();
          // Remove the existing document
          console.log(
            "ID of existingnonce to be deleted...",
            existingNonce._id
          );
          await UserNonce.findByIdAndDelete(existingNonce._id);

          // Create a new document with the new nonce
          const newUserNonce = new UserNonce({
            user_address: userAddress,
            nonce: newNonce,
            createdAt: new Date(),
          });
          await newUserNonce.save();
          res.status(200).json({ nonce: newNonce });
        }
      } else {
        const newNonce = generateRandom8DigitNumber();

        const newUserNonce = new UserNonce({
          user_address: userAddress,
          nonce: newNonce,
          createdAt: new Date(),
        });

        await newUserNonce.save();
        res.status(200).json({ nonce: newNonce });
      }
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: "internal server error" });
    }
  } else {
    res.status(400).json({ message: "Invalid method" });
  }
}

function generateRandom8DigitNumber() {
  // Generate a random number between 10000000 (inclusive) and 99999999 (inclusive)
  const min = 10000000;
  const max = 99999999;
  const random8DigitNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return random8DigitNumber;
}
