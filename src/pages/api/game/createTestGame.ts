import { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { ensureDbConnected } from "@/utils/dbConnect";
import { Game } from "@/utils/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const p1_address = "0xD5c4f2A66E031f2C654EDfA06EBD7DF10Eda61d5";
      const p2_address = "0x4C9201d8bF9A70b7550585DAc1738D4F7Dfd5108";
      const game_address = "0x2f136367cA5f665E8a477a5379A3069Ea821F235";
      await ensureDbConnected();

      const gameObj = new Game({ p1_address, p2_address, game_address });
      await gameObj.save();
      res.status(200).json({
        message: "Game object created in db successfully",
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: "Error finding user details" });
    }
  } else {
    res.status(400).json({ message: "Invalid method" });
  }
}
