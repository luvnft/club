import { useTheme } from "next-themes";
import { createClient, WagmiConfig } from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { getDefaultWallets, RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { chain, configureChains } from "wagmi";
import { useEffect, useMemo, useState } from "react";

export const { chains, provider } = configureChains(
  [chain.mainnet, chain.polygon, chain.optimism, chain.arbitrum],
  [alchemyProvider({ apiKey: process.env.ALCHEMY_ID }), publicProvider()]
);

export const { connectors } = getDefaultWallets({
  appName: "Clubspace",
  chains,
});

export const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

const Web3Provider = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = useMemo(() => (resolvedTheme === "dark" ? darkTheme() : lightTheme()), [resolvedTheme]);
  if (!mounted) return null;
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains} theme={theme}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default Web3Provider;
