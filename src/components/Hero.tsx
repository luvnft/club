import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import ClubspaceNeon from "@/assets/svg/clubspace-neon.svg";
import ClubspaceSoftGlow from "@/assets/svg/soft-glow-filter.svg";
import useIsMounted from "@/hooks/useIsMounted";
import useHasBadge from "@/hooks/useHasBadge";
import { useLensLogin, useLensRefresh } from "@/hooks/useLensLogin";
import { useGetProfilesOwned } from "@/services/lens/getProfile";
import { ConnectWallet } from "@/components/ConnectWallet";
import { IM_WITH_THE_DJ, GOOGLE_FORM_WAITLIST_URL } from "@/lib/consts";
import ActivityFeed from "./ActivityFeed";
import {UpcomingFeed} from "./UpcomingFeed";

const JamProviderWrapper = dynamic(() => import("@/components/JamProviderWrapper"), { ssr: false });
const CreateSpace = dynamic(() => import("@/components/CreateSpace"), { ssr: false });

export const Hero = () => {
  const isMounted = useIsMounted();
  let [modalOpen, setModalOpen] = useState(false);
  const { isConnected, address } = useAccount();
  const { data: lensLoginData, refetch: loginWithLens } = useLensLogin();
  const { data: lensRefreshData } = useLensRefresh();
  const { data: profilesResponse } = useGetProfilesOwned({}, address);
  const { data: hasBadge, isLoading: isLoadingBadge } = useHasBadge();

  useEffect(() => {
    if (!isLoadingBadge && !hasBadge) {
      toast.error("ClubSpace is currently in closed beta", { duration: 10000, icon: "🚧" });
    }
  }, [isLoadingBadge, hasBadge]);

  if (!isMounted) return null;

  return (
    <div className="relative overflow-hidden flex-1 min-h-screen">
      <div className="hidden sm:absolute sm:inset-0 sm:block" aria-hidden="true">
        <svg
          className="absolute bottom-0 right-0 mb-48 translate-x-1/2 transform text-gray-700 lg:top-0 lg:mt-28 lg:mb-0 xl:translate-x-0 xl:transform-none"
          width={364}
          height={384}
          viewBox="0 0 364 384"
          fill="none"
        >
          <defs>
            <pattern
              id="eab71dd9-9d7a-47bd-8044-256344ee00d0"
              x={0}
              y={0}
              width={20}
              height={20}
              patternUnits="userSpaceOnUse"
            >
              <rect x={0} y={0} width={4} height={4} fill="currentColor" />
            </pattern>
          </defs>
          <rect width={364} height={384} fill="url(#eab71dd9-9d7a-47bd-8044-256344ee00d0)" />
        </svg>
      </div>
      <section className="w-full">
        <div className="w-full text-secondary mt-12 sm:mt-32 flex flex-col gap-8 mix-blend-lighten px-16 items-center justify-center">
          <ClubspaceSoftGlow />
          <ClubspaceNeon className="min-w-fit svg-logo" />
          <h2 className="uppercase text-6xl tracking-wide w-full font-ownersx text-center text-[37px] landing-page-subtext-shadow">
            <span className="block">PROMOTE YOUR MUSIC NFTs</span>
            <span className="block">
              WITH A <span className="text-primary italic mix-blend-lighten text-club-red font-extrabold">LIVE</span>{" "}
              LISTENING PARTY
            </span>
          </h2>

          {isConnected ? (
            <>
              {!(lensLoginData || lensRefreshData) ? (
                <button onClick={() => loginWithLens()} className="btn max-w-[200px] btn justify-center items-center">
                  Login with Lens
                </button>
              ) : (
                <>
                  {!isLoadingBadge && (hasBadge || IM_WITH_THE_DJ.includes(address)) ? (
                    <button
                      onClick={() => setModalOpen(true)}
                      className="btn-create-space relative overflow-hidden inline-flex capitalize w-fit font-sf-pro-text bg-white text-black text-xl py-3 px-6 rounded-md font-bold duration-300 transition-all hover:-translate-y-[2px] hover:text-white"
                    >
                      <span className="z-10">Create a space</span>
                    </button>
                  ) : (
                    <>
                      <button
                        disabled
                        className="relative overflow-hidden inline-flex capitalize w-fit font-sf-pro-text bg-white text-black text-xl py-3 px-6 rounded-md font-bold"
                      >
                        <span className="z-10">Closed Beta</span>
                      </button>
                      <span className="z-10">
                        Get access with our{" "}
                        <a
                          href="https://playground.sismo.io/madfi-lens-followers-s01"
                          target="_blank"
                          rel="noreferrer"
                          className="text-club-red font-extrabold"
                        >
                          Sismo Badge
                        </a>{" "}
                        or get on the{" "}
                        <a
                          href={GOOGLE_FORM_WAITLIST_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="text-club-red font-extrabold"
                        >
                          Creator Waitlist
                        </a>
                      </span>
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <ConnectWallet showBalance={false} />
          )}
          <UpcomingFeed />
          <ActivityFeed />
        </div>
        <div className="w-full">
          <JamProviderWrapper>
            <CreateSpace isOpen={modalOpen} setIsOpen={setModalOpen} />
          </JamProviderWrapper>
        </div>
      </section>
    </div>
  );
};
