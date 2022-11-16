import { FC, Fragment, useEffect, useState, useCallback, useMemo } from "react";
import { Dialog, Menu, Popover, Transition } from "@headlessui/react";
import { useSigner, useNetwork } from "wagmi";
import { useJam } from "@/lib/jam-core-react";
import { isEmpty } from "lodash/lang";
import toast from "react-hot-toast";
import { use } from "use-minimal-state";
import { AudioPlayer } from "decent-audio-player";
import { classNames } from "@/lib/utils/classNames";
import { joinGroup } from "@/lib/semaphore/semaphore";
import { Profile, useGetProfilesOwned, useGetProfileByHandle } from "@/services/lens/getProfile";
import { getUrlForImageFromIpfs } from "@/utils/ipfs";
import { LensProfile, reactionsEntries } from "@/components/LensProfile";
import useIdentity from "@/hooks/useIdentity";
import useIsMounted from "@/hooks/useIsMounted";
import useUnload from "@/hooks/useUnload";
import { useLensLogin, useLensRefresh } from "@/hooks/useLensLogin";
import { getProfileByHandle } from "@/services/lens/getProfile";
import { doesFollow, useDoesFollow } from "@/services/lens/doesFollow";
import { followProfileGasless } from "@/services/lens/gaslessTxs";
import { useGetContractData } from "@/services/decent/getDecentNFT";
import { HostCard } from "./HostCard";
import { FeaturedDecentNFT } from "./FeaturedDecentNFT";

type ClubSpaceObject = {
  clubSpaceId: string;
  createdAt: number;
  creatorAddress: string;
  creatorLensHandle: string;
  creatorLensProfileId: string;
  decentContractAddress: string;
  endAt: number;
  lensPubId: string;
  semGroupIdHex: string;
  spinampPlaylistId: string;
};

type LensProfileObject = {
  id: string;
  name: string;
  bio: string;
  picture: any;
  handle: string;
  coverPicture: any;
  ownedBy: string;
  stats: any;
};

type Props = {
  clubSpaceObject: ClubSpaceObject;
  defaultProfile: LensProfileObject;
  address: string;
  isLoadingEntry: boolean;
  setIsLoadingEntry: any;
  handle: boolean;
};

/**
 * This component takes club space data object and handles any live aspects with streamr
 * - connect to the streamr pub/sub client
 * - load the history for profiles that joined and left
 * - attempt to log an impression to privy store + join goody bag semaphore group
 * - party
 */
const LiveSpace: FC<Props> = ({
  clubSpaceObject,
  defaultProfile,
  address,
  isLoadingEntry,
  setIsLoadingEntry,
  handle,
}) => {
  const { identity } = useIdentity();
  const isMounted = useIsMounted();
  const { data: signer } = useSigner();
  const { chain } = useNetwork();
  const [state, { enterRoom, leaveRoom, setProps, updateInfo, sendReaction }] = useJam();
  const [currentReaction, setCurrentReaction] = useState<{ type: string; handle: string; reactionUnicode: string }[]>();
  const [drawerProfile, setDrawerProfile] = useState<any>({});
  const [doesFollowDrawerProfile, setDoesFollowDrawerProfile] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // @TODO: should really merge these two hook calls
  // - first run tries to do the refresh call
  // - all other runs force the login call
  const { data: lensRefreshData } = useLensRefresh();
  const { data: lensLoginData, refetch: loginWithLens } = useLensLogin();
  const { data: doesFollowCreator, refetch: refetchDoesFollowCreator } = useDoesFollow(
    {},
    { followerAddress: address, profileId: clubSpaceObject.creatorLensProfileId }
  );
  const { data: creatorLensProfile } = useGetProfileByHandle(
    {},
    clubSpaceObject.creatorLensHandle,
    "creatorLensProfile"
  );
  const { data: featuredDecentNFT } = useGetContractData(
    {},
    {
      address: clubSpaceObject.decentContractAddress,
      chainId: clubSpaceObject.decentContractChainId,
      contractType: clubSpaceObject.decentContractType,
      signer,
    }
  );

  let [
    reactions,
    handRaised,
    identities,
    speaking,
    iSpeak,
    iModerate,
    iMayEnter,
    myIdentity,
    inRoom,
    peers,
    peerState,
    myPeerState,
    hasMicFailed,
  ] = use(state, [
    "reactions",
    "handRaised",
    "identities",
    "speaking",
    "iAmSpeaker",
    "iAmModerator",
    "iAmAuthorized",
    "myIdentity",
    "inRoom",
    "peers",
    "peerState",
    "myPeerState",
    "hasMicFailed",
  ]);

  const myInfo = myIdentity.info;
  const myPeerId = useMemo(() => {
    return myInfo.id;
  }, [myIdentity]);

  const isHost = useMemo(() => {
    if (!isEmpty(defaultProfile) && !isEmpty(creatorLensProfile)) {
      return defaultProfile.id === creatorLensProfile.id;
    }
  }, [defaultProfile, creatorLensProfile])

  const audiencePeers = peers.filter(
    (id) => isEmpty(identities[id]) || identities[id].handle !== clubSpaceObject.creatorLensHandle
  );

  // trigger the entry if everything is loaded
  useEffect(() => {
    if (isLoadingEntry && !isEmpty(myIdentity) && !isEmpty(creatorLensProfile) && !isEmpty(featuredDecentNFT)) {
      setIsLoadingEntry(false);
    }
  }, [isLoadingEntry, myIdentity, doesFollowCreator, creatorLensProfile, featuredDecentNFT]);

  function Envelope() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="368.625"
        height="368.625"
        viewBox="0 0 368.625 368.325"
        enableBackground="new 0 0 368.625 368.625"
        style={{ width: "20px", height: "20px" }}
        className="fill-black dark:fill-gray-300"
      >
        <path d="M356.125 50.318H12.5c-6.903 0-12.5 5.597-12.5 12.5v242.988c0 6.902 5.597 12.5 12.5 12.5h343.625c6.902 0 12.5-5.598 12.5-12.5V62.818c0-6.902-5.598-12.5-12.5-12.5zm-12.5 242.989H25V75.318h318.625v217.989z"></path>
        <path d="M57.755 134.201l120 73.937c2.01 1.239 4.283 1.858 6.557 1.858s4.547-.619 6.557-1.858l120-73.937c5.877-3.621 7.707-11.322 4.086-17.199s-11.324-7.707-17.199-4.085l-113.444 69.896-113.443-69.896c-5.875-3.619-13.576-1.793-17.199 4.085-3.622 5.876-1.793 13.578 4.085 17.199z"></path>
      </svg>
    );
  }

  // only lens accounts (handle includes .lens or .test)
  const toggleDrawer = async ({ handle, profile: { id } }) => {
    if ([".lens", ".test"].some((ext) => handle.includes(ext))) {
      const [profile, { doesFollow: doesFollowData }] = await Promise.all([
        getProfileByHandle(handle),
        doesFollow([{ followerAddress: address, profileId: id }]),
      ]);

      if (profile.coverPicture) {
        const convertedCoverPic = getUrlForImageFromIpfs(profile?.coverPicture?.original?.url);
        profile.coverPicture.original.url = convertedCoverPic;
      }

      if (profile.picture) {
        const convertedProfilePic = getUrlForImageFromIpfs(profile?.picture?.original?.url);
        profile.picture.original.url = convertedProfilePic;
      }

      setDrawerProfile(profile);
      setDoesFollowDrawerProfile(doesFollowData[0].follows);
    }

    setIsOpen((currentState) => !currentState);
  };

  const onFollowClick = (profileId: string, isFollowDrawer = true) => {
    toast.promise(
      new Promise<void>(async (resolve, reject) => {
        try {
          const accessToken = localStorage.getItem("lens_accessToken");
          const { txHash } = await followProfileGasless(profileId, signer, accessToken);

          if (txHash) {
            isFollowDrawer
              ? setDoesFollowDrawerProfile(true)
              : refetchDoesFollowCreator();
          }

          resolve();
        } catch (error) {
          console.log(error);
          reject(error);
        }
      }),
      {
        loading: "Following profile...",
        success: "Followed!",
        error: (error) => {
          // return error.message.split('(')[0];
          return "Error";
        },
      }
    );
  };

  function closeModal() {
    setIsOpen(false);
  }

  useEffect(() => {
    const join = async () => {
      await setProps("roomId", clubSpaceObject.clubSpaceId);
      await updateInfo({
        handle,
        profile: {
          avatar: defaultProfile?.picture?.original?.url,
          name: defaultProfile?.name,
          totalFollowers: defaultProfile?.stats?.totalFollowers,
          id: defaultProfile?.id,
        },
      });
      console.log(`JOINING: ${clubSpaceObject.clubSpaceId}`);
      await enterRoom(clubSpaceObject.clubSpaceId);
      console.log("JOINED");
    };

    if (isMounted && isLoadingEntry) {
      join();
    }
  }, [
    clubSpaceObject.clubSpaceId,
    defaultProfile?.id,
    defaultProfile?.name,
    defaultProfile?.picture?.original?.url,
    defaultProfile?.stats?.totalFollowers,
    enterRoom,
    handle,
    isLoadingEntry,
    isMounted,
    setIsLoadingEntry,
    setProps,
    updateInfo,
  ]);

  useUnload(async () => {
    console.log(`LEAVING`);
    await leaveRoom(clubSpaceObject.clubSpaceId);
  });

  if (isLoadingEntry) return null;

  // @TODO: render the host profile larger than `LensProfile`:
  // - avatar maybe rounded square
  // - Name (handle.lens)
  // - label: ClubSpace Host
  // - bio
  // follow button => disabled if `doesFollowCreator` (same logic as drawer follow button)
  console.log("creatorLensProfile", creatorLensProfile);
  console.log("doesFollowCreator", doesFollowCreator);

  // @TODO: render the featured decent NFT + buy button
  // - NFT image / gif
  // - NFT name, description
  // - PRICE | supply
  // - Buy button
  console.log("featuredDecentNFT", featuredDecentNFT);

  // @TODO: render some visualizer + the decent audio player
  // - clubSpaceObject.streamURL
  // - user can hit play/plause
  // - current song info: name, artist, album art (link to buy?)

  return (
    <>
      <div className="stage-container">
        {creatorLensProfile && (
          <HostCard
            profile={creatorLensProfile}
            drawerProfileId={drawerProfile.id}
            doesFollowDrawerProfile={doesFollowDrawerProfile}
            onFollowClick={onFollowClick}
            isHost={isHost}
          />
        )}
        <div className="border border-gray-500">
          CURRENT SONG + VIZ
        </div>
        <div className="border border-gray-500">
          {
            featuredDecentNFT && (
              <FeaturedDecentNFT {...featuredDecentNFT} />
            )
          }
        </div>
      </div>

      <div className="grid-container responsive-container">
        {!!myIdentity
          ? (!isHost ? [myPeerId].concat(audiencePeers) : audiencePeers).map((peerId, index) => {
              return identities[peerId] ? (
                <LensProfile
                  allowDrawer={[".lens", ".test"].some((ext) => identities[peerId].handle.includes(ext))}
                  id={identities[peerId].profile?.id}
                  key={identities[peerId].handle}
                  handle={identities[peerId].handle}
                  picture={identities[peerId].profile ? getUrlForImageFromIpfs(identities[peerId].profile.avatar) : ""}
                  name={identities[peerId].profile?.name}
                  totalFollowers={identities[peerId].profile?.totalFollowers}
                  reaction={isEmpty(reactions[peerId]) ? null : reactions[peerId][0][0]}
                  index={index}
                  onClick={() => {
                    toggleDrawer(identities[peerId]);
                  }}
                />
              ) : null;
            })
          : null}
      </div>
      <Popover
        className={({ open }) =>
          classNames(
            open ? "inset-0 z-40 overflow-y-auto" : "",
            "responsive-container mx-auto shadow-sm lg:static bottom-0 lg:overflow-y-visible"
          )
        }
      >
        {({ open }) => {
          if (isHost) return null;

          return (
            <>
              <Menu as="div" className="relative flex-shrink-0">
                <div className="w-36 flex gap-4 mt-4">
                  <Menu.Button className="btn" disabled={!defaultProfile}>
                    react
                  </Menu.Button>
                </div>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none flex gap-4 flex-wrap">
                    {reactionsEntries.map(([key, value]) => (
                      <Menu.Item key={value}>
                        {({ active }) => <button onClick={() => sendReaction(value)}>{value}</button>}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Transition>
              </Menu>

              <Popover.Panel className="" aria-label="Global"></Popover.Panel>
            </>
          );
        }}
      </Popover>

      {/* Start Drawer */}

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed bottom-[-20px] left-1/2 transform -translate-x-1/2 w-[375px]">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300 transform"
                enterFrom="opacity-0 scale-95 translate-y-[100%]"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200 transform"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95 translate-y-[100%]"
              >
                <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-tl-[35px] rounded-tr-[35px] bg-white dark:bg-black p-6 text-left align-middle shadow-xl transition-all min-h-[20rem] pt-[155px]">
                  <div className={`absolute top-0 right-0 h-[125px] w-full shimmer`}>
                    <img
                      className="absolute t-0 left-0 right-0 w-full h-full object-cover"
                      src={drawerProfile?.coverPicture?.original?.url || "/default-cover.jpg"}
                      alt=""
                    />
                    <img
                      src={drawerProfile?.picture?.original?.url}
                      alt=""
                      className="rounded-full w-12 h-12 aspect-square relative border-black-[4px] top-3/4 left-[5%] outline outline-offset-0 outline-4 outline-black"
                    />
                  </div>
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <div className="mb-[-3px] dark:text-white">
                          <span>{drawerProfile?.name}</span>
                        </div>
                        <div className="text-gray-500">@{drawerProfile?.handle}</div>
                      </div>

                      {
                        drawerProfile?.id !== defaultProfile?.id
                          ? (
                              lensLoginData || lensRefreshData
                                ? <button
                                    className="!w-auto btn"
                                    onClick={() => {
                                      onFollowClick(drawerProfile.id);
                                    }}
                                    disabled={doesFollowDrawerProfile}
                                  >
                                    {doesFollowDrawerProfile ? "Following" : "Follow"}
                                  </button>
                                : <button onClick={() => loginWithLens({}, true)} className="btn justify-center items-center">
                                    Login with Lens
                                  </button>
                            )
                          : null
                      }
                    </div>
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-white mb-6">
                      {drawerProfile.bio || <em>No bio provided.</em>}
                    </p>

                    {/**
                      <button className="flex gap-x-4 items-center">
                        <Envelope />
                        <span>Send Direct Message</span>
                      </button>
                      */}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default LiveSpace;
