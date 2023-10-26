import mongoose from "mongoose";
let alreadyDone = false;

export async function ensureDbConnected() {
  if (alreadyDone) {
    return;
  }
  alreadyDone = true;
  mongoose.connect(process.env.MONGO_URL || "");
}
