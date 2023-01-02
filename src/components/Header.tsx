import { useAccount } from "wagmi";
import { ConnectWallet } from "./ConnectWallet";
import { useGetProfilesOwned } from "@/services/lens/getProfile";
import { useLensLogin, useLensRefresh } from "@/hooks/useLensLogin";
import ClubspaceNeonHeader from "@/assets/svg/clubspace-neon-header.svg";

export const Header = () => {
  const { isConnected, address } = useAccount();
  const { data: profilesResponse } = useGetProfilesOwned({}, address);
  const { data: lensRefreshData } = useLensRefresh();
  const { data: lensLoginData, refetch: loginWithLens } = useLensLogin();

  return (
    <header className="flex items-center justify-between py-6 px-4 xs:px-8 bg-black relative z-10 border-b-[0.1px] border-b-slate-700">
      <div className="logo -ml-16 md:ml-0">
        <div className="flex gap-x-2 items-center flex-col xs:flex-row">
          <a href="/" className="realtive group">
            <ClubspaceNeonHeader height={65} />
          </a>
          <div className="beta-tag -ml-12 -mb-3 border-[0.1px] border-slate-500 p-1 pl-1.5 pr-1.5 rounded-md bg-[color:var(--club-red-dark)] mr-4">
            <span>BETA</span>
          </div>
        </div>
      </div>
      {/**!isLandingPage && (
        <div className="sponsor abs-center">
          <a href="https://www.11captainsclub.io" target="_blank" rel="noreferrer" className="realtive group">
            <img
              src="https://images.squarespace-cdn.com/content/v1/634560daa851a4455c79fb20/58b4cc9d-7973-4235-a915-c382875f68f7/E11EVEN+White+LOGO.png?format=1500w"
              alt=""
              style={{ maxWidth: "150px", height: "auto" }}
            />
            <span className="abs-center opacity-0 scale-50 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-[22px] group-hover:scale-100 text-sm text-gray-200 whitespace-nowrap">
              [ SPONSORED BY ]
            </span>
          </a>
        </div>
      )*/}
      <div className="connect md:right-5 xs:relative">
        <div className="md:flex gap-4 justify-center md:min-w-[220px] scale-[0.8] xs:scale-100">
          <div className="mb-2">
            <ConnectWallet showBalance={false} />
          </div>
          {isConnected && (
            <button
              disabled={lensLoginData || lensRefreshData}
              onClick={() => loginWithLens()}
              className="btn btn-lens justify-center items-center"
            >
              {!(lensLoginData || lensRefreshData) ? "Login with Lens" : (profilesResponse?.defaultProfile.handle || 'No Lens')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
