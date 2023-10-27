import { NextRequest, NextResponse } from "next/server";
import cookie from "cookie";
import * as jose from "jose";

const secret = process.env.SECRET_KEY || "";

export async function middleware(req: NextRequest, res: NextResponse) {
  try {
    let token: any = req.cookies.get("rps-token");
    if (!token) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    const { payload: jwtData } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(process.env.SECRET_KEY)
    );

    if (jwtData.userAddress) {
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

    // "/dashboard/:path*",
    // "/api/hello",
    // "/api/admin/:path*",
    // "/browsecourses",
    // "/course/:path*",
    // "/addcourse",
  ],
};
