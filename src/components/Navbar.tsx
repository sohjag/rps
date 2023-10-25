import { useMoralis, useWeb3Contract } from "react-moralis";

export default function Navbar() {
  const { enableWeb3, isWeb3Enabled, account } = useMoralis();

  return (
    <div>
      {account ? (
        <div>
          Connected to{" "}
          <span>
            {account?.slice(0, 6)}...{account?.slice(account.length - 4)}
          </span>
        </div>
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
  );
}
