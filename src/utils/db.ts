import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  p1_address: String,
  p2_address: String,
  game_address: String,
});

const Game = mongoose.models.Game || mongoose.model("Game", gameSchema);

export { Game };
