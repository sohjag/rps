import Image from "next/image";
import { Inter } from "next/font/google";
import { useMoralis, useWeb3Contract } from "react-moralis";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const { enableWeb3, isWeb3Enabled } = useMoralis();
  console.log("...isweb3 enabled", isWeb3Enabled);
  return (
    <div>
      <Navbar />
      <div>Hello world</div>
    </div>
  );
}
