import { useMoralis, useWeb3Contract } from "react-moralis";
import axios from "axios";
import { useSetRecoilState, useRecoilValue } from "recoil";
import { userGames } from "@/store/atoms/userGames";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { userAuthenticated } from "@/store/atoms/userAuthenticated";

let provider: any;
let signer: any;
if (typeof window !== "undefined") {
  //@ts-ignore
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
}

export default function Navbar() {
  const { enableWeb3, isWeb3Enabled, account } = useMoralis();
  const setUserGames = useSetRecoilState(userGames);
  const user = useRecoilValue(userGames);
  //   const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isUserAuthenticated = useRecoilValue(userAuthenticated);
  const setIsUserAuthenticated = useSetRecoilState(userAuthenticated);

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

  const handleSignOut = async () => {
    setUserGames({
      isLoading: false,
      games_as_p1: null,
      games_as_p2: null,
    });
    localStorage.setItem("rps-token", "");
    setIsUserAuthenticated({
      isLoading: true,
      userAuthenticated: false,
    });
  };

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

    setIsUserAuthenticated({
      isLoading: false,
      userAuthenticated: auth.data.authenticated,
    });
    localStorage.setItem("rps-token", auth.data.jwtToken);

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
      {account ? (
        <div className="flex justify-between">
          <div>
            <h1 className="font-bold text-2xl p-2">RPS</h1>
          </div>
          <div>
            Connected to{" "}
            <span>
              {account?.slice(0, 6)}...{account?.slice(account.length - 4)}
            </span>
            {isUserAuthenticated.userAuthenticated ? (
              <button
                className=" rounded-xl p-3 m-2 bg-[#32255a] hover:bg-[#5941a1] border-white border-solid"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            ) : (
              <button
                className="bg-[#32255a] rounded-xl p-3 m-2 hover:bg-[#5941a1] border-white border-solid"
                onClick={handleSignIn}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-between">
          <div>
            <h1 className="font-bold text-2xl p-2">RPS</h1>
          </div>
          <div>
            <div className="p-2">
              <button
                className="bg-[#32255a] rounded-xl p-3 m-2 hover:bg-[#5941a1] border-white border-solid"
                onClick={() => {
                  enableWeb3();
                }}
              >
                Connect wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
