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

const inter = Inter({ subsets: ["latin"] });

let provider: any;
let signer: any;
if (typeof window !== "undefined") {
  //@ts-ignore
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
}

export default function Home() {
  const { enableWeb3, isWeb3Enabled } = useMoralis();
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

  // console.log("provider is...", provider);
  // console.log("signer is...", signer);

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

  return (
    <div>
      <Navbar />
      <div>Hello world</div>
      <div>
        <button onClick={handleSaltGeneration}>Generate Salt</button>
      </div>
      <div>
        <button onClick={handleCreateGame}>Create game</button>
      </div>
    </div>
  );
}
