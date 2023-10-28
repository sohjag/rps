import { UserNonce } from "@/utils/db";
import { ensureDbConnected } from "@/utils/dbConnect";
import { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";
import * as jose from "jose";
import cookie from "cookie";
import { User } from "@/utils/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { address, signature, nonce } = req.body;
      let authenticated = false;
      await ensureDbConnected();

      //get nonce from db
      const existingNonce = await UserNonce.findOne({
        user_address: address,
      });
      const currentTime = new Date();

      const tenSecondsLater = new Date(existingNonce.createdAt);
      tenSecondsLater.setSeconds(existingNonce.createdAt.getSeconds() + 10);

      if (existingNonce && tenSecondsLater > currentTime) {
        const decodedAddress = ethers.utils.verifyMessage(
          existingNonce.nonce,
          signature
        );
        console.log("decoded address is...", decodedAddress);

        if (address === decodedAddress.toLowerCase()) {
          console.log("inside IF block...");
          console.log("address is ....", address);
          console.log("decoded address is...", decodedAddress.toLowerCase());
          const jwtToken = await new jose.SignJWT({ userAddress: address })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(new TextEncoder().encode(process.env.SECRET_KEY));

          console.log("jwtToken is...", jwtToken);

          const cookies = cookie.serialize("rps-token", jwtToken, {
            httpOnly: true,
            maxAge: 3600, // 1 hour in seconds
            sameSite: "strict",
            path: "/",
          });

          console.log("cookies created...", cookies);

          res.setHeader("Set-Cookie", cookies);

          console.log("response header set with cookies");

          //check if user exists
          const existingUser = await User.findOne({
            user_address: address,
          });
          console.log("checked if user exists");

          //if not,create new
          if (!existingUser) {
            console.log("user not found..creating new user");
            const userObj = new User({ user_address: address });
            await userObj.save();
          }

          authenticated = true;

          console.log("authenticated set to true...");
          return res.status(200).json({ authenticated, jwtToken });
        }
        return res.status(400).json({ authenticated });
      }
      return res.status(401).json({ message: "Nonce expired or not found" });
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: "internal server error" });
    }
  } else {
    res.status(400).json({ message: "Invalid method" });
  }
}
