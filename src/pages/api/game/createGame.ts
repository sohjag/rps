import { NextApiRequest, NextApiResponse } from "next";
import { ensureDbConnected } from "@/utils/dbConnect";
import { Game } from "@/utils/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      let {
        p1_address,
        p2_address,
        game_address,
        p1_move_salt,
        p1_move_hash,
        stake,
      } = req.body;

      p1_address = p1_address.toLowerCase();
      p2_address = p2_address.toLowerCase();
      game_address = game_address.toLowerCase();
      p1_move_salt = p1_move_salt.toLowerCase();
      stake = stake.toLowerCase();
      p1_move_hash = p1_move_hash.toString().toLowerCase();

      console.log("creating game for p1_address...", p1_address);
      console.log("creating game for p2_address...", p2_address);
      console.log("creating game for game_address...", game_address);
      console.log("creating game for p1_move_salt...", p1_move_salt);
      console.log("creating game for stake...", stake);
      console.log("creating game for p1_move_hash...", p1_move_hash);

      await ensureDbConnected();

      const gameObj = new Game({
        p1_address: p1_address,
        p2_address: p2_address,
        game_address: game_address,
        p1_move_salt: p1_move_salt,
        p1_move_hash: p1_move_hash,
        stake: stake,
      });
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
