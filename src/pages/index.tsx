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
import { useSetRecoilState, useRecoilValue } from "recoil";
import { userGames } from "@/store/atoms/userGames";
import { useEffect, useState } from "react";

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
  let salt: any;
  let _c1hash: any;
  const move = 1;
  const j2Address = "0x4C9201d8bF9A70b7550585DAc1738D4F7Dfd5108";
  const user = useRecoilValue(userGames);
  const setUserGames = useSetRecoilState(userGames);
  const [selectedTab, setSelectedTab] = useState("p1");
  const [selectedGame, setSelectedGame] = useState(null);

  const handleTabChange = (tab: any) => {
    setSelectedTab(tab);
    setSelectedGame(null); // Reset selected game when tab changes
  };

  const handleGameSelect = (event: any) => {
    const selectedAddress = event.target.value;
    const games = selectedTab === "p1" ? user.games_as_p1 : user.games_as_p2;
    const game = games.find(
      (item: any) => item.game_address === selectedAddress
    );
    setSelectedGame(game);
  };
  const currentGames =
    selectedTab === "p1" ? user.games_as_p1 : user.games_as_p2;

  const getGames = async () => {
    try {
      console.log("getting gamesdata for account...", account);
      console.log("getting types of gamesdata for account...", typeof account);

      const gamesData = await axios({
        method: "GET",
        url: "/api/game-test/getGamesByFirstUser",
        params: {
          p1_address: account,
        },
      });
      console.log("gamesData received is...", gamesData);
      if (gamesData) {
        setUserGames({
          isLoading: false,
          games_as_p1: gamesData.data.games_as_p1,
          games_as_p2: gamesData.data.games_as_p2,
        });
      }
    } catch (e) {
      console.log("Error while fetching games", e);
      alert("Error while fetching games");
    }
  };

  useEffect(() => {
    getGames();
    console.log("userGames set to..", user);
  }, [account]);

  const handleSaltGeneration = () => {
    salt = generateSalt();
    console.log("generated salt is...", salt);
    console.log("typeof salt is...", typeof salt);
    // const saltHex = ethers.utils.hexlify(salt); // Convert salt to a properly formatted hexadecimal string
    // console.log("hexlified salt is...", saltHex);

    const moveHex = ethers.utils.hexlify(move);
    console.log("moveHex is...", moveHex);
    _c1hash = calculateHash(moveHex, salt);
  };

  console.log("provider is...", provider);
  console.log("signer is...", signer);

  const handleCreateGame = async () => {
    if (!salt && !_c1hash) {
      alert("please generate salt first");
      return;
    }
    //@ts-ignore
    const contractFactory = new ethers.ContractFactory(
      rpcAbi,
      RPC_BYTECODE,
      signer
    );
    console.log("deploying contract, please wait...");

    const contract = await contractFactory.deploy(_c1hash, j2Address);
    await contract.deployed();
    console.log(
      "contract deployed,adding to db, please wait...",
      contract.address
    );

    console.log("creating game record with move salt...", salt);

    //db actions
    const response = await axios({
      method: "POST",
      url: "/api/game/createGame",
      data: {
        p1_address: account,
        p2_address: j2Address,
        game_address: contract.address,
        p1_move_salt: salt,
      },
    });

    console.log("game created response...", response);
    salt = null;
    _c1hash = null;

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

    if (auth.status === 200) {
      try {
        console.log("getting gamesdata for account...", account);

        const gamesData = await axios({
          method: "GET",
          url: "/api/game-test/getGamesByFirstUser",
          params: {
            p1_address: account,
          },
        });
        if (gamesData) {
          console.log("gamesData received is...", gamesData);
          setUserGames({
            isLoading: false,
            games_as_p1: gamesData.data.games_as_p1,
            games_as_p2: gamesData.data.games_as_p2,
          });
        }
      } catch (e) {
        console.log("Error while fetching games", e);
        alert("Error while fetching games");
      }
    }
    console.log(auth);
    console.log("usergames set to...", user);
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
      <div>
        <div>
          <button
            className={`px-4 py-2 rounded-md ${
              selectedTab === "p1" ? "bg-blue-500 text-white font-bold" : ""
            }`}
            onClick={() => handleTabChange("p1")}
          >
            As Player 1
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              selectedTab === "p2" ? "bg-blue-500 text-white font-bold" : ""
            }`}
            onClick={() => handleTabChange("p2")}
          >
            As Player 2
          </button>
        </div>

        <label>Select a game:</label>
        <select className="text-black" onChange={handleGameSelect}>
          <option value="">-- Select a game --</option>
          {currentGames &&
            currentGames.map((item: any) => (
              <option key={item.game_address} value={item.game_address}>
                {item.game_address}
              </option>
            ))}
        </select>

        {selectedGame && (
          <div>
            <h3>Selected Game:</h3>
            <pre>{JSON.stringify(selectedGame, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
