import { NextApiRequest, NextApiResponse } from "next";
import { ensureDbConnected } from "@/utils/dbConnect";
import { Game } from "@/utils/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const { p1_address } = req.query;
      console.log("account address received is...", p1_address);
      console.log("type of account address received is...", typeof p1_address);

      await ensureDbConnected();

      const games_as_p1 = await Game.find({ p1_address: p1_address });
      const games_as_p2_temp = await Game.find({ p2_address: p1_address });

      // Remove 'p1_move_salt' field from each game
      const games_as_p2 = games_as_p2_temp.map((game) => {
        const { p1_move_salt, ...gameWithoutP1MoveSalt } = game.toObject();
        return gameWithoutP1MoveSalt;
      });

      // console.log("games_as_p1 is...", games_as_p1);
      // console.log("games_as_p2 is...", games_as_p2);

      res.status(200).json({
        message: "hi",
        games_as_p1,
        games_as_p2,
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: "Error finding games" });
    }
  } else {
    res.status(400).json({ message: "Invalid method" });
  }
}
