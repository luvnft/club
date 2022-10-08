import { apiUrls } from "@/constants/apiUrls";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { gql, request } from "graphql-request";
import { useAccount, useSigner } from "wagmi";

const AUTHENTICATION = gql`
  mutation ($request: SignedAuthChallenge!) {
    authenticate(request: $request) {
      accessToken
      refreshToken
    }
  }
`;

const GET_CHALLENGE = gql`
  query ($request: ChallengeRequest!) {
    challenge(request: $request) {
      text
    }
  }
`;

const generateChallenge = (address: string) => {
  return request({
    url: apiUrls.lensAPI,
    document: GET_CHALLENGE,
    variables: {
      request: { address },
    },
  });
};

const authenticate = (address: string, signature) => {
  return request({
    url: apiUrls.lensAPI,
    document: AUTHENTICATION,
    variables: {
      request: { address, signature },
    },
  });
};

type AuthenticateType = {
  accessToken: string;
  refreshToken: string;
};

export const useLensLogin = (options: UseQueryOptions = {}) => {
  const { address } = useAccount();
  const { data: signer } = useSigner();

  const result = useQuery<AuthenticateType | null>(
    ["lens-login", address],
    async () => {
      const challenge = await generateChallenge(address);
      const signature = await signer?.signMessage(challenge?.challenge?.text);
      const result = await authenticate(address, signature);
      return result;
    },
    {
      ...(options as any),
      enabled: false,
      staleTime: 1000 * 60 * 60 * 24,
      cacheTime: 1000 * 60 * 60 * 24,
    }
  );

  return result;
};
