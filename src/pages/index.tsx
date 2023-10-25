import Image from "next/image";
import { Inter } from "next/font/google";
import { useMoralis, useWeb3Contract } from "react-moralis";
import Navbar from "@/components/Navbar";
import generateSalt from "@/utils/generateSalt";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const { enableWeb3, isWeb3Enabled } = useMoralis();
  console.log("...isweb3 enabled", isWeb3Enabled);

  const handleSaltGeneration = () => {
    const salt = generateSalt();
    console.log("generated salt is...", salt);
  };

  return (
    <div>
      <Navbar />
      <div>Hello world</div>
      <div>
        <button onClick={handleSaltGeneration}>Generate Salt</button>
      </div>
    </div>
  );
}
