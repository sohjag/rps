import Image from "next/image";
import { Inter } from "next/font/google";
import { useMoralis, useWeb3Contract } from "react-moralis";
import Navbar from "@/components/Navbar";
import generateSalt from "@/utils/generateSalt";
import Moralis from "moralis-v1";
import { ethers } from "ethers";
import rpcAbi from "../contracts/abi/rpc-abi.json";
import { RPC_BYTECODE } from "@/contracts/bytecode";
import calculateHash from "@/utils/calcHash";
import axios from "axios";

const inter = Inter({ subsets: ["latin"] });

let provider: any;
let signer: any;
if (typeof window !== "undefined") {
  //@ts-ignore
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
}

export default function Home() {
  const { enableWeb3, isWeb3Enabled, account } = useMoralis();
  console.log("...isweb3 enabled", isWeb3Enabled);
  const ethers = Moralis.web3Library;
  let salt;
  let _c1hash: any;
  const move = 1;
  const j2Address = "0x4C9201d8bF9A70b7550585DAc1738D4F7Dfd5108";

  const handleSaltGeneration = () => {
    salt = generateSalt();
    console.log("generated salt is...", salt);
    const saltHex = ethers.utils.hexlify(salt); // Convert salt to a properly formatted hexadecimal string
    console.log("hexlified salt is...", saltHex);

    _c1hash = calculateHash(move, salt);
  };

  console.log("provider is...", provider);
  console.log("signer is...", signer);

  const handleCreateGame = async () => {
    //@ts-ignore
    const contractFactory = new ethers.ContractFactory(
      rpcAbi,
      RPC_BYTECODE,
      signer
    );

    const contract = await contractFactory.deploy(_c1hash, j2Address);
    await contract.deployed();
    alert(`Contract deployed at address: ${contract.address}`);
    console.log(`Contract deployed at address: ${contract.address}`);
  };

  async function signMessage(nonce: any) {
    return new Promise(async (resolve, reject) => {
      try {
        const signature = await signer.signMessage(`${nonce}`);
        resolve(signature);
      } catch (error) {
        reject(error);
      }
    });
  }

  const handleSignIn = async () => {
    const nonce = await axios({
      method: "GET",
      url: "/api/auth-test/getNonce",
      params: {
        userAddress: account,
      },
    });
    console.log(nonce);
    // const signature = signer.signMessage(`${nonce.data.nonce}`);
    const signature = await signMessage(nonce.data.nonce);
    const auth = await axios({
      method: "POST",
      url: "/api/auth-test/verify",
      data: {
        address: account,
        signature: signature,
        nonce: nonce.data.nonce,
      },
    });
    console.log(auth);
  };

  return (
    <div>
      <Navbar />
      <div>Hello world</div>
      <div>
        <button
          className="bg-[#1b1430] rounded-xl p-3 hover:bg-[#35275e]"
          onClick={handleSaltGeneration}
        >
          Generate Salt
        </button>
      </div>
      <div>
        <button
          className="bg-[#1b1430] rounded-xl p-3 hover:bg-[#35275e]"
          onClick={handleSignIn}
        >
          Sign In
        </button>
      </div>
      <div>
        <button
          className="bg-[#1b1430] rounded-xl p-3 hover:bg-[#35275e]"
          onClick={handleCreateGame}
        >
          Create game
        </button>
      </div>
    </div>
  );
}
