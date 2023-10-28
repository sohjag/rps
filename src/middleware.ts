import { NextRequest, NextResponse } from "next/server";
import cookie from "cookie";
import * as jose from "jose";

const secret = process.env.SECRET_KEY || "";

export async function middleware(req: NextRequest, res: NextResponse) {
  try {
    let token: any = req.cookies.get("rps-token");
    // console.log("token received in middleware is...", token);
    if (!token) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    const { payload: jwtData } = await jose.jwtVerify(
      token.value,
      new TextEncoder().encode(process.env.SECRET_KEY)
    );
    // console.log("JWT data is...", jwtData);

    if (jwtData.userAddress) {
      // Check if the token has not expired
      const currentTime = Date.now() / 1000; // Convert to seconds
      if (jwtData.exp && jwtData.exp < currentTime) {
        // Token has expired
        console.log("Token has expired");
        return new Response("Token has expired", { status: 401 });
      }

      // Continue with the request if the token is valid
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  } catch (error) {
    console.error("Authentication middleware error:", error);
  }
}

export const config = {
  matcher: [
    "/testPage",
    "/api/game-test/:path*",
    "/api/game/:path*",

    // "/dashboard/:path*",
    // "/api/hello",
    // "/api/admin/:path*",
    // "/browsecourses",
    // "/course/:path*",
    // "/addcourse",
  ],
};
