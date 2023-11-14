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
import { url } from "inspector";

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
  let salt: string | null;
  let signedSaltUint256: string | null;
  let _c1hash: string | null;
  // const j2Address = "0x4C9201d8bF9A70b7550585DAc1738D4F7Dfd5108";
  const user = useRecoilValue(userGames);
  const setUserGames = useSetRecoilState(userGames);
  const [selectedTab, setSelectedTab] = useState("p1");
  const [j2Address, setj2Address] = useState("");
  const isUserAuthenticated = useRecoilValue(userAuthenticated);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [etherValue, setEtherValue] = useState<string>("");
  const [selectedMove, setSelectedMove] = useState("Rock");
  const moveHexValues: { [key: string]: number } = {
    Rock: 1,
    Paper: 2,
    Scissors: 3,
    Spock: 4,
    Lizard: 5,
  };
  const hasherContract = "0x073a7767009B2a6da4cd254B552f9F50C3E26043";
  const sepoliaApi = "https://api-sepolia.etherscan.io/api";

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

    // let move: Number;
    // console.log("p1_move_hash is ...", selectedGame.p1_move_hash);
    // console.log("p1_move is...", selectedGame.p1_move);
    // if (selectedGame.p1_move_hash !== "" || null || undefined) {
    //   move = await handleDecodeMove();
    // } else {
    const move = selectedGame.p1_move;
    // }

    // console.log("handling solve with move...", move);
    // console.log("handling solve with salt...", selectedGame.p1_move_salt);

    //generate signed salt
    const signedSalt = await signer.signMessage(`${selectedGame.p1_move_salt}`);
    const signedSaltUint256 = signedSalt.slice(0, 64);

    // console.log("signedSaltUint256 is ...", signedSaltUint256);
    // return;
    const gameResult = determineGameResult(move, selectedGame.p2_move);

    //solve
    const result = await contractWithSigner.solve(move, signedSaltUint256, {
      gasLimit: 600000,
    });

    const updatedSelectedGame = {
      ...selectedGame,
      game_result: gameResult.toString(),
    };
    setSelectedGame(updatedSelectedGame);
    alert(
      "Solve transaction sent. You will receive a confirmation once transaction is confirmed."
    );
    console.log("solve result is...", result);

    const receipt = await result.wait(1);
    console.log("game solve receipt.. ", receipt);

    if (receipt.status === 1) {
      // const gameResult = determineGameResult(move, selectedGame.p2_move);
      const response = await axios({
        method: "PATCH",
        url: "/api/game/updateGameResult",
        data: {
          game_address: selectedGame.game_address,
          game_result: gameResult,
        },
      });
      // getGames();
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

      let result;
      if (selectedTab === "p1") {
        result = await contractWithSigner.j2Timeout({
          gasLimit: 100000,
        });
      } else {
        result = await contractWithSigner.j1Timeout({
          gasLimit: 100000,
        });
      }

      const updatedSelectedGame = {
        ...selectedGame,
        game_result: "3",
      };
      setSelectedGame(updatedSelectedGame);

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
        // getGames();
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
    const updatedSelectedGame = {
      ...selectedGame,
      has_p2_played: true,
      p2_move: moveHexValues[selectedMove],
    };
    setSelectedGame(updatedSelectedGame);
    alert(
      "Your move transaction has been sent. You will get a confirmation once your move tranasction is successful."
    );
    console.log("play move result...", result);
    const receipt = await result.wait(1);
    console.log("receipt after 5 block confirmations..", receipt);

    if (receipt.status === 1) {
      console.log("tx successful confirmed. Ingesting in db");

      const response = await axios({
        method: "PATCH",
        url: "/api/game/updateGame",
        data: {
          game_address: selectedGame.game_address,
          p2_move: moveHexValues[selectedMove],
        },
      });
      // if (response.status === 200) {
      //   getGames();
      // }
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
        url: "/api/game-test/getGamesByUser",
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

  async function pollForTimeout() {
    // if (selectedGame.game_result !== null || "") {
    //   console.log("result found..returning", selectedGame.game_address);
    //   console.log("result ", typeof selectedGame.game_result);

    //   return;
    // }
    try {
      console.log("polling for timeout");
      const params = {
        module: "account",
        action: "txlist",
        address: selectedGame.game_address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 10,
        sort: "desc",
        apikey: "4CDVASTC6ICZF3KA56FTT49S1P1WNTSS5E",
      };

      if (selectedGame.game_result === "" || null) {
        const res = await axios({
          method: "GET",
          url: "/api/game-test/getGameByAddress",
          params: {
            game_address: selectedGame.game_address,
          },
        });
        if (res.status === 200) {
          const game = res.data.game;
          if (game.game_result !== "" || null) {
            const updatedSelectedGame = {
              ...selectedGame,
              game_result: game.game_result,
            };
            setSelectedGame(updatedSelectedGame);
            return;
          }
        }

        const response = await axios.get(sepoliaApi, { params });

        for (let i = 0; i < response.data.result.length; i++) {
          const functionExecuted = response.data.result[i].functionName;
          const status = response.data.result[i].txreceipt_status;

          // console.log("function executed...", functionExecuted);
          if (
            functionExecuted === "solve(uint8 _c1,uint256 _salt)" &&
            status === "1"
          ) {
            const hash = response.data.result[i].hash;
            // console.log("solve function found");

            const res = await axios.get(sepoliaApi, {
              params: {
                module: "account",
                action: "txlistinternal",
                txhash: hash,
                apikey: "4CDVASTC6ICZF3KA56FTT49S1P1WNTSS5E",
              },
            });

            if (res.data.result.length === 2) {
              const updatedSelectedGame = {
                ...selectedGame,
                game_result: "0",
              };
              setSelectedGame(updatedSelectedGame);
              const response = axios({
                method: "PATCH",
                url: "/api/game/updateGameResult",
                data: {
                  game_address: selectedGame.game_address,
                  game_result: "0",
                },
              });
              break;
            } else {
              console.log(res.data);
              const winnerAddress = res.data.result[0].to;
              console.log("winnnerAddress is...", winnerAddress);
              console.log("p1_address is...", selectedGame.p1_address);
              console.log("p2_address is...", selectedGame.p2_address);
              if (winnerAddress === selectedGame.p1_address) {
                const updatedSelectedGame = {
                  ...selectedGame,
                  game_result: "1",
                };
                setSelectedGame(updatedSelectedGame);
                const response = axios({
                  method: "PATCH",
                  url: "/api/game/updateGameResult",
                  data: {
                    game_address: selectedGame.game_address,
                    game_result: "1",
                  },
                });
                break;
              } else if (winnerAddress === selectedGame.p2_address) {
                const updatedSelectedGame = {
                  ...selectedGame,
                  game_result: "2",
                };
                setSelectedGame(updatedSelectedGame);
                const response = axios({
                  method: "PATCH",
                  url: "/api/game/updateGameResult",
                  data: {
                    game_address: selectedGame.game_address,
                    game_result: "2",
                  },
                });
                break;
              }
            }
          }

          if (
            (functionExecuted === "j1Timeout()" ||
              functionExecuted === "j2Timeout()") &&
            (status === "1" || 1)
          ) {
            const updatedSelectedGame = {
              ...selectedGame,
              game_result: "3",
            };
            setSelectedGame(updatedSelectedGame);

            const response = axios({
              method: "PATCH",
              url: "/api/game/updateGameResult",
              data: {
                game_address: selectedGame.game_address,
                game_result: "3",
              },
            });
            break;
          }
        }
      }
    } catch (e) {
      console.log("error occured while checking for timeout ", e);
    }
  }

  async function pollLastAction() {
    try {
      if (!selectedGame.game_address || !selectedGame) {
        return; // Do not poll if there's no game address or the game result is not null
      }

      const contract = new ethers.Contract(
        selectedGame.game_address,
        rpcAbi,
        provider
      );
      const lastAction = await contract.lastAction();
      const player2Move = await contract.c2();
      const timeout = await contract.TIMEOUT();
      // const balance = await provider.getBalance(selectedGame.game_address);
      // const balanceInEth = ethers.utils.formatEther(balance);
      // console.log("balance of contract is", typeof balanceInEth);

      const currentTime = Math.floor(Date.now() / 1000);

      if (player2Move !== 0) {
        // setp2Move(player2Move);
        // console.log("The play function has been called.", player2Move);

        if (currentTime <= lastAction.toNumber() + timeout.toNumber()) {
          // console.log("there is time remaining for this game");
          // The current time is within the timeout range
          const remainingTime =
            lastAction.toNumber() + timeout.toNumber() - currentTime;

          if (remainingTime >= 0) {
            setRemainingTime(remainingTime);
          }
        }

        if (selectedGame.p2_move !== player2Move) {
          const updatedSelectedGame = {
            ...selectedGame,
            has_p2_played: true,
            p2_move: player2Move,
          };
          setSelectedGame(updatedSelectedGame);
          axios({
            method: "PATCH",
            url: "/api/game/updateGame",
            data: {
              game_address: selectedGame.game_address,
              p2_move: player2Move,
            },
          });
        }
      } else {
        if (currentTime <= lastAction.toNumber() + timeout.toNumber()) {
          // console.log("there is time remaining for this game");
          // The current time is within the timeout range
          const remainingTime =
            lastAction.toNumber() + timeout.toNumber() - currentTime;

          if (remainingTime >= 0) {
            setRemainingTime(remainingTime);
          }
        }
        // console.log("The play function has not been called yet.");
      }
      // console.log(
      //   "Last action timestamp:",
      //   new Date(lastAction.toNumber() * 1000)
      // );
      // console.log("Timeout:", new Date(timeout.toNumber() * 1000));
    } catch (error) {
      console.error("Error:", error);
    }
  }
  useEffect(() => {
    if (selectedGame) {
      const interval = setInterval(pollLastAction, 1000);
      const timeoutInterval = setInterval(pollForTimeout, 4000);

      return () => {
        clearInterval(interval);
        clearInterval(timeoutInterval);
      };
    }
  }, [selectedGame]);

  useEffect(() => {}, [remainingTime, selectedGame, selectedGame?.game_result]);

  const handleSaltGeneration = async () => {
    salt = generateSalt();

    const contract = new ethers.Contract(hasherContract, hasherAbi, provider);
    const contractWithSigner = contract.connect(signer);

    //generate signed salt
    const signedSalt = await signer.signMessage(`${salt}`);
    signedSaltUint256 = signedSalt.slice(0, 64);
    // console.log("signedSaltUint256 =>", signedSaltUint256);
    // const signedSaltUint256 = "0x" + signedSaltUint256_partial;

    console.log("signedSaltUint256 is ...", signedSaltUint256);

    _c1hash = await contractWithSigner.hash(
      moveHexValues[selectedMove],
      signedSaltUint256
    );
    console.log("hash from hasher contract is...", _c1hash);
    alert("Salt and move hash generated.");
  };

  const handleCreateGame = async () => {
    if (!salt && !_c1hash) {
      alert("please generate salt first");
      return;
    }
    if (!j2Address) {
      alert("Please set player 2 address");
      return;
    }
    if (!ethers.utils.isAddress(j2Address)) {
      alert("Please enter valid Eth address.");
      return;
    }
    const regex = /^-?\d*\.?\d+$/;
    if (!regex.test(etherValue)) {
      alert(
        "Please enter valid ETH amount to stake. Make sure you have enough balance."
      );
      return;
    }

    //@ts-ignore
    const contractFactory = new ethers.ContractFactory(
      rpcAbi,
      RPC_BYTECODE,
      signer
    );
    console.log("deploying contract, please wait...");

    // const p1_move_hash = await signer.signMessage(
    //   `${moveHexValues[selectedMove]}`
    // );

    // const p1_move_hash_partial = p1_move_hash.slice(
    //   Math.floor(p1_move_hash.length / 2)
    // );

    const value = ethers.utils.parseEther(etherValue);

    const contract = await contractFactory.deploy(_c1hash, j2Address, {
      value: value._hex,
    });
    alert(
      "Game contract being deployed. You will receive confirmation upon successful deployment."
    );
    await contract.deployed();
    const receipt = await contract.deployTransaction.wait(1); // Wait for 1 confirmations

    if (receipt.status === 1) {
      //db actions
      const response = await axios({
        method: "POST",
        url: "/api/game/createGame",
        data: {
          p1_address: account,
          p2_address: j2Address,
          game_address: contract.address,
          p1_move: moveHexValues[selectedMove],
          p1_move_salt: salt,
          stake: value._hex.toString(),
        },
      });
      getGames();
      alert(`Contract deployed at address: ${contract.address} . Your Move and Salt for this game are: \n
      Salt: ${signedSaltUint256}\n
      Move: ${selectedMove}\n
      Please store your Salt and Move safely. The encrypted version of the same will be stored in a database.`);
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

            {selectedGame && selectedGame?.game_result === (null || "") && (
              <div className="ml-2 font-bold">
                <div>Seconds left before timeout:</div>
                <div id="timer"></div>
                <div className="text-lg">{remainingTime}</div>
              </div>
            )}

            {selectedTab === "p1" ? (
              <div className="ml-2">
                {selectedGame &&
                  selectedGame.has_p2_played &&
                  selectedGame?.game_result === (null || "") && (
                    <button
                      className="rounded-xl p-3 mr-2 bg-[#32255a] hover:bg-[#5941a1] border-white border-solid"
                      onClick={handleSolve}
                    >
                      Solve
                    </button>
                  )}
                {selectedGame &&
                  selectedGame?.game_result === (null || "") &&
                  remainingTime <= 1 && (
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
                {selectedGame &&
                  !selectedGame.has_p2_played &&
                  selectedGame?.game_result === (null || "") && (
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
                  )}
                {selectedGame && selectedGame.has_p2_played ? (
                  <label>You have entered move for this game </label>
                ) : (
                  <div>
                    {selectedGame?.game_result === (null || "") && (
                      <button
                        className="rounded-xl p-3 mr-2 bg-[#32255a] hover:bg-[#5941a1] border-white border-solid"
                        onClick={handlePlayMove}
                        id="playMove"
                      >
                        Play your move
                      </button>
                    )}
                  </div>
                )}
                {selectedGame &&
                  selectedGame?.game_result === (null || "") &&
                  remainingTime <= 1 &&
                  selectedGame?.has_p2_played && (
                    <button
                      className="rounded-xl p-3 bg-[#32255a] hover:bg-[#5941a1] border-white border-solid"
                      onClick={handleGetRefund}
                    >
                      Refund
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
