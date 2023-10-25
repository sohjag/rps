import Image from "next/image";
import { Inter } from "next/font/google";
import { useMoralis, useWeb3Contract } from "react-moralis";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const { enableWeb3, isWeb3Enabled } = useMoralis();
  return (
    <div>
      <div>
        {isWeb3Enabled ? (
          <div>Connected!</div>
        ) : (
          <div>
            <button
              onClick={() => {
                enableWeb3();
              }}
            >
              Connect wallet
            </button>
          </div>
        )}
      </div>
      <div>Hello world</div>
    </div>
  );
}
