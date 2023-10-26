import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  p1_address: String,
  p2_address: String,
  game_address: String,
  createdAt: { type: Date, default: new Date() },
});

const userNonceSchema = new mongoose.Schema({
  user_address: String,
  nonce: String,
  //   createdAt: Date,
  createdAt: { type: Date, expires: 10000, default: new Date() }, // Expires in 10 seconds
});

const userSchema = new mongoose.Schema({
  user_address: String,
  createdAt: { type: Date, default: new Date() },
});

const Game = mongoose.models.Game || mongoose.model("Game", gameSchema);
const UserNonce =
  mongoose.models.UserNonce || mongoose.model("UserNonce", userNonceSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

export { Game, UserNonce, User };
