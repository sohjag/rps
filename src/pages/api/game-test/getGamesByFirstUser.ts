import { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { ensureDbConnected } from "@/utils/dbConnect";
import { Game } from "@/utils/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const { p1_address } = req.body;

      await ensureDbConnected();

      const record = await Game.find({});

      res.status(200).json({
        message: "hi",
        record,
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: "Error finding user details" });
    }
  } else {
    res.status(400).json({ message: "Invalid method" });
  }
}
