import Image from "next/image";
import { Inter } from "next/font/google";
import { useMoralis, useWeb3Contract } from "react-moralis";
import Navbar from "@/components/Navbar";
import generateSalt from "@/utils/generateSalt";
import Moralis from "moralis-v1";
import { ethers } from "ethers";
import rpcAbi from "../contracts/abi/rpc-abi.json";
import hasherAbi from "../contracts/abi/hasher-abi.json";
import { RPC_BYTECODE } from "@/contracts/bytecode";
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
  // const j2Address = "0x4C9201d8bF9A70b7550585DAc1738D4F7Dfd5108";
  const user = useRecoilValue(userGames);
  const setUserGames = useSetRecoilState(userGames);
  const [selectedTab, setSelectedTab] = useState("p1");
  const [j2Address, setj2Address] = useState("");

  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [inputValue, setInputValue] = useState("0");
  const [etherValue, setEtherValue] = useState<any>(null);
  const [selectedMove, setSelectedMove] = useState("Rock");
  const moveHexValues: { [key: string]: any } = {
    Rock: 1,
    Paper: 2,
    Scissors: 3,
    Spock: 4,
    Lizard: 5,
  };
  const hasherContract = "0x073a7767009B2a6da4cd254B552f9F50C3E26043";

  const handleDecodeMove = async () => {
    console.log("decoding the move...");
    let decodedMove;
    alert(
      `You will now be prompted for up to 5 signatures to decode your move for the game ${selectedGame.game_address}`
    );
    for (const key in moveHexValues) {
      if (moveHexValues.hasOwnProperty(key)) {
        decodedMove = moveHexValues[key];

        // const decodedAddress = ethers.utils.verifyMessage(
        //   `${decodedMove}`,
        //   selectedGame.p1_move_hash
        // );
        //p1_move_hash
        const p1_move_hash_guess = await signer.signMessage(`${decodedMove}`);
        const p1_move_hash_guess_partial = p1_move_hash_guess.slice(
          Math.floor(p1_move_hash_guess.length / 2)
        );

        console.log("connected account is...", account);
        console.log(
          "selectedGame.p1_move_hash account is...",
          selectedGame.p1_move_hash
        );

        console.log("decoded address is...", p1_move_hash_guess_partial);
        // if (account?.toLowerCase() === decodedAddress.toLowerCase()) {
        //   break;
        // }
        if (
          selectedGame.p1_move_hash === p1_move_hash_guess_partial.toLowerCase()
        ) {
          break;
        }
        console.log(`Key: ${key}, Value: ${decodedMove}`);
      }
    }
    console.log("decoded move is..", decodedMove);
    return decodedMove;
  };

  const handleSolve = async () => {
    if (!selectedGame) {
      alert("please select a game first");
      return;
    }
    const contract = new ethers.Contract(
      selectedGame.game_address,
      rpcAbi,
      provider
    );
    const contractWithSigner = contract.connect(signer);

    const move = handleDecodeMove();

    console.log("handling solve with move...", move);
    console.log("handling solve with salt...", selectedGame.p1_move_salt);

    //solve
    const result = await contractWithSigner.solve(
      move,
      selectedGame.p1_move_salt,
      {
        gasLimit: 600000,
      }
    );

    console.log("solve result is...", result);
    alert("Game solved!");
  };

  const handleGetRefund = async () => {
    if (!selectedGame) {
      alert("please select a game first");
      return;
    }
    console.log("getting refund..");
    const contract = new ethers.Contract(
      selectedGame.game_address,
      rpcAbi,
      provider
    );
    const contractWithSigner = contract.connect(signer);
    const result = await contractWithSigner.j2Timeout();
    console.log("refund processed...", result);
    alert("refund processed");
  };

  const handlePlayMove = async () => {
    if (!selectedGame) {
      alert("please select a game first");
      return;
    }
    const contract = new ethers.Contract(
      selectedGame.game_address,
      rpcAbi,
      provider
    );
    const contractWithSigner = contract.connect(signer);

    console.log("playing move...", moveHexValues[selectedMove]);
    console.log("stake is...", selectedGame.stake);

    const result = await contractWithSigner.play(moveHexValues[selectedMove], {
      value: selectedGame.stake,
      gasLimit: 200000,
    });
    console.log("play move result...", result);
    axios({
      method: "PATCH",
      url: "/api/game/updateGame",
      data: {
        game_address: selectedGame.game_address,
      },
    });
  };

  const handleMoveClick = (move: any) => {
    setSelectedMove(move);
  };

  // const handleInputChange = (e: any) => {
  //   // Ensure the input is a number or a valid decimal number
  //   if (/^\d*\.?\d*$/.test(e.target.value)) {
  //     setInputValue(e.target.value);
  //     // Convert the input to Ether (wei)
  //     const etherAmount = ethers.utils.parseUnits(e.target.value, "ether");
  //     setEtherValue(etherAmount.toString());
  //   }
  // };

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
    // console.log("selected game is....", selectedGame);
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
    // console.log("userGames set to..", user);
  }, [account]);

  const handleSaltGeneration = async () => {
    salt = generateSalt();
    console.log("generated salt is...", salt);
    console.log("typeof salt is...", typeof salt);
    // const saltHex = ethers.utils.hexlify(salt); // Convert salt to a properly formatted hexadecimal string
    // console.log("hexlified salt is...", saltHex);

    // const moveHex = ethers.utils.hexlify(move);
    // console.log("moveHex is...", moveHex);
    // _c1hash = calculateHash(moveHexValues[selectedMove], salt);

    const contract = new ethers.Contract(hasherContract, hasherAbi, provider);
    const contractWithSigner = contract.connect(signer);

    _c1hash = await contractWithSigner.hash(moveHexValues[selectedMove], salt);
    console.log("hash from hasher contract is...", _c1hash);

    // console.log(
    //   "ethers parsed inputValue is",
    //   ethers.utils.parseEther(inputValue)
    // );
  };

  console.log("provider is...", provider);
  console.log("signer is...", signer);

  const handleCreateGame = async () => {
    if (!salt && !_c1hash) {
      alert("please generate salt first");
      return;
    }
    if (!j2Address) {
      alert("Please set player 2 address");
      return;
    }
    //@ts-ignore
    const contractFactory = new ethers.ContractFactory(
      rpcAbi,
      RPC_BYTECODE,
      signer
    );
    console.log("deploying contract, please wait...");

    const p1_move_hash = await signer.signMessage(
      `${moveHexValues[selectedMove]}`
    );

    const p1_move_hash_partial = p1_move_hash.slice(
      Math.floor(p1_move_hash.length / 2)
    );
    console.log("p1_move_hash_partial is...", p1_move_hash_partial);

    // const p1_move_hash = await signMessage(moveHexValues[selectedMove]);

    // const value = 1234567891234567;
    // const valueHex = ethers.utils.hexlify(value);

    const value = ethers.utils.parseEther(etherValue);

    const contract = await contractFactory.deploy(_c1hash, j2Address, {
      value: value._hex,
    });
    await contract.deployed();
    console.log(
      "contract deployed,adding to db, please wait...",
      contract.address
    );

    console.log("creating game record with move salt...", salt);
    console.log("creating game record with move hash...", _c1hash);

    //db actions
    const response = await axios({
      method: "POST",
      url: "/api/game/createGame",
      data: {
        p1_address: account,
        p2_address: j2Address,
        game_address: contract.address,
        p1_move_salt: salt,
        p1_move_hash: p1_move_hash_partial,
        stake: value._hex.toString(),
      },
    });

    console.log("game created response...", response);
    salt = null;
    _c1hash = null;

    alert(`Contract deployed at address: ${contract.address}`);
    console.log(`Contract deployed at address: ${contract.address}`);
  };

  return (
    <div>
      <Navbar />
      <div className="bg-gray-900 p-2 mb-5">
        <h1 className="text-lg font-bold">Create Game Section</h1>
        <div className="p-2 m-2">
          <div>
            <label>Step 1: Choose your move</label>
          </div>
          <div className="p-2 m-2">
            {["Rock", "Paper", "Scissors", "Spock", "Lizard"].map((move) => (
              <button
                key={move}
                className={`px-4 py-2 rounded-md ${
                  selectedMove === move
                    ? "bg-blue-500 text-white font-bold"
                    : ""
                }`}
                onClick={() => handleMoveClick(move)}
              >
                {move}
              </button>
            ))}
          </div>
        </div>
        <div className="p-2 m-2">
          <label>Step 2: Generate Salt & move hash</label>
        </div>
        <div>
          <button
            className="bg-[#1b1430] rounded-xl p-2 m-2 hover:bg-[#35275e]"
            onClick={handleSaltGeneration}
          >
            Generate
          </button>
        </div>
        <div className="p-2 m-2">
          <label>Step 3: Enter player 2 address and ETH amount to bet</label>
        </div>
        <div>
          <div className="p-2 m-2">
            <input
              type="text"
              placeholder="Enter player 2 address"
              onChange={(e) => {
                setj2Address(e.target.value);
              }}
              className="text-black"
            />
          </div>
          <div className="p-2 m-2">
            <input
              type="text"
              placeholder="Enter eth value"
              onChange={(e) => {
                setEtherValue(e.target.value);
              }}
              className="text-black"
            />
          </div>
          <div className="p-2 m-2">
            <label>Step 4: Create game</label>
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
      </div>

      <div className="bg-gray-900 p-2 mb-5">
        <h1 className="text-lg font-bold">Interact with games</h1>
        <div>
          <div className="p-2 m-2">
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
          <div className="p-2 m-2">
            <select className="text-black" onChange={handleGameSelect}>
              <option value="">-- Select a game --</option>
              {currentGames &&
                currentGames.map((item: any) => (
                  <option key={item.game_address} value={item.game_address}>
                    {item.game_address}
                  </option>
                ))}
            </select>
            <button
              className="bg-[#1b1430] rounded-xl p-3 ml-2 hover:bg-[#35275e]"
              onClick={getGames}
            >
              Refresh games list
            </button>
          </div>

          {selectedGame && (
            <div>
              <h3>Selected Game:</h3>
              <pre>{JSON.stringify(selectedGame, null, 2)}</pre>
            </div>
          )}
        </div>

        {selectedTab === "p1" ? (
          <div>
            {selectedGame && selectedGame.has_p2_played && (
              <button
                className="bg-[#1b1430] rounded-xl p-3 hover:bg-[#35275e]"
                onClick={handleSolve}
              >
                Solve
              </button>
            )}
            <button
              className="bg-[#1b1430] rounded-xl p-3 hover:bg-[#35275e]"
              onClick={handleGetRefund}
            >
              Refund
            </button>
          </div>
        ) : (
          <div>
            <div className="p-2 m-2">
              {["Rock", "Paper", "Scissors", "Spock", "Lizard"].map((move) => (
                <button
                  key={move}
                  className={`px-4 py-2 rounded-md ${
                    selectedMove === move
                      ? "bg-blue-500 text-white font-bold"
                      : ""
                  }`}
                  onClick={() => handleMoveClick(move)}
                >
                  {move}
                </button>
              ))}
            </div>
            {selectedGame && selectedGame.has_p2_played ? (
              <label>You have already entered move for this game</label>
            ) : (
              <button
                className="bg-[#1b1430] rounded-xl p-3 hover:bg-[#35275e]"
                onClick={handlePlayMove}
              >
                Play your move
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
