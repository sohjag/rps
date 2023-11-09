import { NextApiRequest, NextApiResponse } from "next";
import { ensureDbConnected } from "@/utils/dbConnect";
import { Game } from "@/utils/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const { game_address } = req.query;

      await ensureDbConnected();

      const game = await Game.findOne({ game_address: game_address });

      if (game) {
        res.status(200).json({
          game,
        });
      } else {
        res.status(404).json({ message: "Not found" });
      }
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: "Error finding games" });
    }
  } else {
    res.status(400).json({ message: "Invalid method" });
  }
}
