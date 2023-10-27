import { NextApiRequest, NextApiResponse } from "next";
import { ensureDbConnected } from "@/utils/dbConnect";
import { Game } from "@/utils/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "PATCH") {
    try {
      const { game_address } = req.body;
      const game = await Game.findOne({ game_address: game_address });

      if (game) {
        // Update the document
        game.has_p2_played = true;
        await game.save(); // Save the updated document
        res.status(200).json({ message: "update successful" });
      } else {
        res.status(400).json({ message: "update unsuccessful" });
      }
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: "Error updating game" });
    }
  } else {
    res.status(400).json({ message: "Invalid method" });
  }
}
