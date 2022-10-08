import { APP_NAME } from "@/lib/consts";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { ConnectWallet } from "./ConnectWallet";
import { useLensLogin } from "@/services/lens/login";
import { Profile, useGetProfilesOwned } from "@/services/lens/getProfile";

export const Hero = () => {
  const { isConnected, address } = useAccount();
  const { login, ...rest } = useLensLogin();
  const [defaultProfile, setDefaultProfile] = useState<Profile>();
  const { isLoading: loadingProfiles, data: profiles } = useGetProfilesOwned(address);

  useEffect(() => {
    if (profiles?.length) {
      console.log(profiles[0]);
      setDefaultProfile(profiles[0]);
    }
  }, [address, profiles]);

  return (
    <div className="relative overflow-hidden">
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
      <div className="relative pt-6 pb-16 sm:pb-24">
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Global">
          <div className="flex flex-1 items-center">
            <div className="flex w-full items-center justify-between md:w-auto">
              <a href="#">
                <span className="sr-only">{APP_NAME}</span>
                {/* <Image
                  className="h-8 w-auto sm:h-10"
                  src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500"
                  alt={APP_NAME}
                /> */}
              </a>
            </div>
            <div className="hidden space-x-10 md:ml-10 md:flex"></div>
          </div>
          <div className="md:flex">
            <ConnectWallet />
          </div>
        </nav>

        <main className="mt-16 sm:mt-24">
          <div className="mx-auto max-w-7xl">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <div className="px-4 sm:px-6 sm:text-center md:mx-auto md:max-w-2xl lg:col-span-6 lg:flex lg:items-center lg:text-left">
                <div>
                  <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">Clubspace</h1>
                  <p className="mt-3 text-base sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                    Host an online live listening party for all your Lens frens 🔥
                    <br/>
                    Music NFTs. Live Reactions. Good vibes.
                    <br/>
                    Everyone that parties - and can <strong>prove</strong> it - gets swag NFTs
                  </p>
                  {!isConnected && (
                    <div className="pt-4">
                      <ConnectWallet label="Get started now" />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-16 sm:mt-24 lg:col-span-6 lg:mt-0">
                <div className="bg-transparent sm:mx-auto sm:w-full sm:max-w-md sm:overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-8 sm:px-10">
                    <div className="mt-6">
                      <button onClick={login} className="flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        {!Object.keys(rest).length ? "Login with Lens" : "Logged in"}
                      </button>
                      <form action="#" method="POST">
                        <fieldset disabled={!isConnected} className="space-y-6">
                          {!isConnected ? "form disabled" : "form enabled"}
                          <div>
                            <label htmlFor="name" className="sr-only">
                              Full name
                            </label>
                            <input
                              type="text"
                              name="name"
                              id="name"
                              autoComplete="name"
                              placeholder="Full name"
                              required
                              className="input"
                            />
                          </div>

                          <div>
                            <label htmlFor="mobile-or-email" className="sr-only">
                              Mobile number or email
                            </label>
                            <input
                              type="text"
                              name="mobile-or-email"
                              id="mobile-or-email"
                              autoComplete="email"
                              placeholder="Mobile number or email"
                              required
                              className="input"
                            />
                          </div>

                          <div>
                            <label htmlFor="password" className="sr-only">
                              Password
                            </label>
                            <input
                              id="password"
                              name="password"
                              type="password"
                              placeholder="Password"
                              autoComplete="current-password"
                              required
                              className="input"
                            />
                          </div>

                          <div>
                            <button type="submit" className="btn">
                              Create your account
                            </button>
                          </div>
                        </fieldset>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
