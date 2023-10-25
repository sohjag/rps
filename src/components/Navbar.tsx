import { useMoralis, useWeb3Contract } from "react-moralis";

export default function Navbar() {
  const { enableWeb3, isWeb3Enabled } = useMoralis();

  return (
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
  );
}
