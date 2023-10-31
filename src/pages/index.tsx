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
import { userAuthenticated } from "@/store/atoms/userAuthenticated";
import { determineGameResult, GameResult, Move } from "@/utils/gameResult";

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
  // console.log("...isweb3 enabled", isWeb3Enabled);
  const ethers = Moralis.web3Library;
  let salt: any;
  let _c1hash: any;
  // const j2Address = "0x4C9201d8bF9A70b7550585DAc1738D4F7Dfd5108";
  const user = useRecoilValue(userGames);
  const setUserGames = useSetRecoilState(userGames);
  const [selectedTab, setSelectedTab] = useState("p1");
  const [j2Address, setj2Address] = useState("");
  const isUserAuthenticated = useRecoilValue(userAuthenticated);

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
        // console.log(
        //   "selectedGame.p1_move_hash account is...",
        //   selectedGame.p1_move_hash
        // );

        // console.log("decoded address is...", p1_move_hash_guess_partial);
        // if (account?.toLowerCase() === decodedAddress.toLowerCase()) {
        //   break;
        // }
        if (
          selectedGame.p1_move_hash === p1_move_hash_guess_partial.toLowerCase()
        ) {
          break;
        }
        // console.log(`Key: ${key}, Value: ${decodedMove}`);
      }
    }
    // console.log("decoded move is..", decodedMove);
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

    const move = await handleDecodeMove();

    // console.log("handling solve with move...", move);
    // console.log("handling solve with salt...", selectedGame.p1_move_salt);

    //generate signed salt
    const signedSalt = await signer.signMessage(`${selectedGame.p1_move_salt}`);
    const signedSaltUint256 = signedSalt.slice(0, 64);

    // console.log("signedSaltUint256 is ...", signedSaltUint256);

    //solve
    const result = await contractWithSigner.solve(move, signedSaltUint256, {
      gasLimit: 600000,
    });
    alert(
      "Solve transaction sent. You will receive a confirmation once transaction is confirmed."
    );
    console.log("solve result is...", result);

    const receipt = await result.wait(1);
    console.log("game solve receipt.. ", receipt);

    if (receipt.status === 1) {
      const gameResult = determineGameResult(move, selectedGame.p2_move);
      const response = await axios({
        method: "PATCH",
        url: "/api/game/updateGameResult",
        data: {
          game_address: selectedGame.game_address,
          game_result: gameResult,
        },
      });
      getGames();
      console.log("updated game result in db..", response);
      alert(
        `CONFIRMED: Game (game address: ${selectedGame.game_address})  solved!`
      );
    } else {
      alert("Error solving game. Try again.");
    }
  };

  const handleGetRefund = async () => {
    if (!selectedGame) {
      alert("please select a game first");
      return;
    }
    console.log("getting refund..");
    try {
      const contract = new ethers.Contract(
        selectedGame.game_address,
        rpcAbi,
        provider
      );
      const contractWithSigner = contract.connect(signer);
      const result = await contractWithSigner.j2Timeout({
        gasLimit: 100000,
      });
      const receipt = await result.wait(1);
      console.log("receipt from refund ", receipt);
      console.log("refund receipt status is ", receipt.status);

      if (receipt.status === 1) {
        console.log("updating refund in db ");

        axios({
          method: "PATCH",
          url: "/api/game/updateGameResult",
          data: {
            game_address: selectedGame.game_address,
            game_result: "3",
          },
        });
        getGames();
        alert("refund processed");
      } else {
        alert(
          "Cannot process refund now. Please check game status or try again later."
        );
      }
    } catch (e) {
      alert("Something went wrong.");
      console.log("e");
    }
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
    alert(
      "Your move transaction has been sent. You will get a confirmation once your move tranasction is successful."
    );
    console.log("play move result...", result);
    const receipt = await result.wait(1);
    console.log("receipt after 5 block confirmations..", receipt);

    if (receipt.status === 1) {
      console.log("tx successful confirmed. Ingesting in db");
      axios({
        method: "PATCH",
        url: "/api/game/updateGame",
        data: {
          game_address: selectedGame.game_address,
          p2_move: moveHexValues[selectedMove],
        },
      });
      getGames();
      alert(
        `CONFIRMED: ${selectedMove} played for game: ${selectedGame.game_address}`
      );
    }
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

  const handleGameSelect = async (event: any) => {
    const selectedAddress = event.target.value;
    const games = selectedTab === "p1" ? user.games_as_p1 : user.games_as_p2;
    const game = games.find(
      (item: any) => item.game_address === selectedAddress
    );
    setSelectedGame(game);
    // console.log("selected game is....", selectedGame);
    // const balance = await provider.getBalance(selectedAddress);
    // console.log(
    //   `ETH Balance of Contract ${selectedAddress}: ${ethers.utils.formatEther(
    //     balance
    //   )} ETH`
    // );
    // console.log("type of balance", typeof balance._hex);
  };
  let currentGames = selectedTab === "p1" ? user.games_as_p1 : user.games_as_p2;

  const getGames = async () => {
    try {
      // console.log("getting gamesdata for account...", account);
      // console.log("getting types of gamesdata for account...", typeof account);

      const gamesData = await axios({
        method: "GET",
        url: "/api/game-test/getGamesByFirstUser",
        params: {
          p1_address: account,
        },
      });
      // console.log("gamesData received is...", gamesData);
      if (gamesData) {
        setUserGames({
          isLoading: false,
          games_as_p1: gamesData.data.games_as_p1,
          games_as_p2: gamesData.data.games_as_p2,
        });

        if (selectedGame) {
          const currGameAddress = selectedGame.game_address;
          const games =
            selectedTab === "p1" ? user.games_as_p1 : user.games_as_p2;
          const game = games.find(
            (item: any) => item.game_address === currGameAddress
          );
          setSelectedGame(game);
        }
      }
    } catch (e) {
      console.log("Error while fetching games", e);
      // alert("Error while fetching games");
    }
  };

  useEffect(() => {
    getGames();
  }, [account]);

  const handleSaltGeneration = async () => {
    salt = generateSalt();
    // console.log("generated salt is...", salt);
    // console.log("typeof salt is...", typeof salt);
    // const saltHex = ethers.utils.hexlify(salt); // Convert salt to a properly formatted hexadecimal string
    // console.log("hexlified salt is...", saltHex);

    // const moveHex = ethers.utils.hexlify(move);
    // console.log("moveHex is...", moveHex);
    // _c1hash = calculateHash(moveHexValues[selectedMove], salt);

    const contract = new ethers.Contract(hasherContract, hasherAbi, provider);
    const contractWithSigner = contract.connect(signer);

    //generate signed salt
    const signedSalt = await signer.signMessage(`${salt}`);
    const signedSaltUint256 = signedSalt.slice(0, 64);
    // console.log("signedSaltUint256 =>", signedSaltUint256);
    // const signedSaltUint256 = "0x" + signedSaltUint256_partial;

    // console.log("signedSaltUint256 is ...", signedSaltUint256);

    _c1hash = await contractWithSigner.hash(
      moveHexValues[selectedMove],
      signedSaltUint256
    );
    console.log("hash from hasher contract is...", _c1hash);
    alert("Salt and move hash generated.");

    // console.log(
    //   "ethers parsed inputValue is",
    //   ethers.utils.parseEther(inputValue)
    // );
  };

  // console.log("provider is...", provider);
  // console.log("signer is...", signer);

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
    // console.log("p1_move_hash_partial is...", p1_move_hash_partial);

    // const p1_move_hash = await signMessage(moveHexValues[selectedMove]);

    // const value = 1234567891234567;
    // const valueHex = ethers.utils.hexlify(value);

    const value = ethers.utils.parseEther(etherValue);

    const contract = await contractFactory.deploy(_c1hash, j2Address, {
      value: value._hex,
    });
    alert(
      "Game contract being deployed. You will receive confirmation upon successful deployment."
    );
    await contract.deployed();
    const receipt = await contract.deployTransaction.wait(1); // Wait for 1 confirmations

    // console.log("contract obj after deployment...", contract);
    // console.log(
    //   "contract deployed,adding to db, please wait...",
    //   contract.address
    // );

    // console.log("creating game record with move salt...", salt);
    // console.log("creating game record with move hash...", _c1hash);

    if (receipt.status === 1) {
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
      getGames();
      alert(`Contract deployed at address: ${contract.address}`);
      console.log(`Contract deployed at address: ${contract.address}`);
      return;
    }
    alert(
      "Error deploying game contract. Please check player 2 address and stake amount or try again later."
    );

    // console.log("game created response...", response);
    salt = null;
    _c1hash = null;
  };

  return (
    <div className="bg-black text-white">
      <Navbar />
      {account && isUserAuthenticated.userAuthenticated ? (
        <div>
          <div>
            IMPORTANT: Make sure you are on{" "}
            <a
              href="https://chainlist.org/chain/11155111"
              className="text-blue-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sepolia testnet.
            </a>
          </div>
          <div className="bg-gray-900 p-2 mb-5">
            <h1 className="text-lg font-bold">Create Game Section</h1>
            <div className="p-2 m-2">
              <div>
                <label>Step 1: Choose your move</label>
              </div>
              <div className="p-2 m-2">
                {["Rock", "Paper", "Scissors", "Spock", "Lizard"].map(
                  (move) => (
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
                  )
                )}
              </div>
            </div>
            <div className="p-2 m-2">
              <label>Step 2: Generate Salt & move hash</label>
            </div>
            <div>
              <button
                className="rounded-xl p-2 ml-4 bg-[#32255a] hover:bg-[#5941a1] border-white border-solid"
                onClick={handleSaltGeneration}
              >
                Generate
              </button>
            </div>
            <div className="p-2 m-2">
              <label>
                Step 3: Enter player 2 address and ETH amount to bet
              </label>
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
                  className="rounded-xl p-3 ml-4 bg-[#32255a] hover:bg-[#5941a1] border-white border-solid"
                  onClick={handleCreateGame}
                >
                  Create game
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-2 pb-10">
            <h1 className="text-lg font-bold">Interact with games</h1>
            <div>
              <div className="p-2 m-2">
                <button
                  className={`px-4 py-2 rounded-md ${
                    selectedTab === "p1"
                      ? "bg-blue-500 text-white font-bold"
                      : ""
                  }`}
                  onClick={() => handleTabChange("p1")}
                >
                  As Player 1
                </button>
                <button
                  className={`px-4 py-2 rounded-md ${
                    selectedTab === "p2"
                      ? "bg-blue-500 text-white font-bold"
                      : ""
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
                  className="rounded-xl p-3 ml-2 bg-[#32255a] hover:bg-[#5941a1] border-white border-solid"
                  onClick={getGames}
                >
                  Refresh games list
                </button>
              </div>

              {selectedGame && (
                <div className="mb-2 ml-2">
                  <h3 className="mb-2">Selected Game:</h3>
                  {/* <pre>{JSON.stringify(selectedGame, null, 2)}</pre> */}
                  <div>
                    <span className="font-bold">Game Address: </span>
                    <span>{selectedGame.game_address}</span>
                  </div>
                  <div>
                    <span className="font-bold">Your opponent address: </span>
                    <span>
                      {selectedTab === "p1"
                        ? selectedGame.p2_address
                        : selectedGame.p1_address}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold">Stake: </span>
                    <span>
                      {ethers.utils.formatUnits(
                        ethers.utils.hexValue(selectedGame.stake),
                        "ether"
                      )}{" "}
                      ETH
                    </span>
                  </div>
                  <div>
                    <span className="font-bold">Game created at: </span>
                    <span>
                      {new Date(selectedGame.createdAt).toLocaleString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          timeZone: "UTC",
                        }
                      )}{" "}
                      UTC
                    </span>
                  </div>

                  {selectedTab === "p1" && (
                    <div>
                      <span className="font-bold">Has opponent played: </span>
                      <span>{selectedGame.has_p2_played.toString()}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="ml-2 mb-2">
                <span className="font-bold">Game result:</span>

                <span>
                  {selectedGame &&
                    selectedGame.game_result === (null || "") && (
                      <span> No result yet</span>
                    )}
                  {selectedGame && selectedGame.game_result === "0" && (
                    <span> Game tied</span>
                  )}
                  {selectedGame && selectedGame.game_result === "1" && (
                    <span> Player 1 won</span>
                  )}
                  {selectedGame && selectedGame.game_result === "2" && (
                    <span> Player 2 won</span>
                  )}
                  {selectedGame && selectedGame.game_result === "3" && (
                    <span> Game cancelled</span>
                  )}
                </span>
              </div>
            </div>

            {selectedTab === "p1" ? (
              <div className="ml-2">
                {selectedGame &&
                  selectedGame.has_p2_played &&
                  selectedGame.game_result === (null || "") && (
                    <button
                      className="rounded-xl p-3 bg-[#32255a] hover:bg-[#5941a1] border-white border-solid"
                      onClick={handleSolve}
                    >
                      Solve
                    </button>
                  )}
                {selectedGame && selectedGame?.game_result === (null || "") && (
                  <button
                    className="rounded-xl p-3 bg-[#32255a] hover:bg-[#5941a1] border-white border-solid"
                    onClick={handleGetRefund}
                  >
                    Refund
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="p-2 m-2">
                  {["Rock", "Paper", "Scissors", "Spock", "Lizard"].map(
                    (move) => (
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
                    )
                  )}
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
      ) : (
        <div>
          Please connect your wallet and sign in to continue. Make sure you are
          on{" "}
          <a
            href="https://chainlist.org/chain/11155111"
            className="text-blue-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sepolia testnet.
          </a>
        </div>
      )}
    </div>
  );
}
