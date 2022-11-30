import { FC, Fragment, useEffect, useState, useCallback, useMemo } from "react";
import { Dialog, Menu, Popover, Transition } from "@headlessui/react";
import { useSigner, useNetwork } from "wagmi";
import { useJam } from "@/lib/jam-core-react";
import { isEmpty } from "lodash/lang";
import toast from "react-hot-toast";
import { use } from "use-minimal-state";
import { classNames } from "@/lib/utils/classNames";
import { buildLensShareUrl } from "@infinity-keys/react-lens-share-button";
import { Profile, useGetProfilesOwned, useGetProfileByHandle } from "@/services/lens/getProfile";
import { getUrlForImageFromIpfs } from "@/utils/ipfs";
import { LensProfile, reactionsEntries } from "@/components/LensProfile";
import useIsMounted from "@/hooks/useIsMounted";
import useUnload from "@/hooks/useUnload";
import { useGetTracksFromPlaylist } from "@/services/spinamp/getPlaylists";
import { useLensLogin, useLensRefresh } from "@/hooks/useLensLogin";
import { getProfileByHandle } from "@/services/lens/getProfile";
import { doesFollow, useDoesFollow } from "@/services/lens/doesFollow";
import { followProfileGasless } from "@/services/lens/gaslessTxs";
import { useGetContractData } from "@/services/decent/getDecentNFT";
import { HostCard } from "./HostCard";
import { FeaturedDecentNFT } from "./FeaturedDecentNFT";
import { LiveAudioPlayer } from "./LiveAudioPlayer";
import { SITE_URL, LENSTER_URL } from "@/lib/consts";

import * as mockIdentities from "@/constants/mockIdentities.json";
import DirectToClaims from "./DirectToClaims";
import { NextSeo } from "next-seo";

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
  streamURL?: string;
  currentTrackId?: string;
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
  const isMounted = useIsMounted();
  const { data: signer } = useSigner();
  const [state, { enterRoom, leaveRoom, setProps, updateInfo, sendReaction }] = useJam();
  const [currentReaction, setCurrentReaction] = useState<{ type: string; handle: string; reactionUnicode: string }[]>();
  const [drawerProfile, setDrawerProfile] = useState<any>({});
  const [doesFollowDrawerProfile, setDoesFollowDrawerProfile] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isHostOpen, setIsHostOpen] = useState<boolean>(false);

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
  const { data: playlistTracks } = useGetTracksFromPlaylist({}, clubSpaceObject.spinampPlaylistId);

  const shareURL = useMemo(() => (
    buildLensShareUrl({
      postBody: 'Join this space!',
      url: `${SITE_URL}/live/${clubSpaceObject.handle}`,
    })
  ), [clubSpaceObject]);

  const lensterPostURL = useMemo(() => (
    clubSpaceObject.lensPubId === "0x" 
    ? undefined 
    : `${LENSTER_URL}/posts/${clubSpaceObject.creatorLensProfileId}-${clubSpaceObject.lensPubId}`
  ), [clubSpaceObject]);

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
  }, [defaultProfile, creatorLensProfile]);

  const audiencePeers = peers.filter(
    (id) => isEmpty(identities[id]) || identities[id].handle !== clubSpaceObject.handle
  );

  // trigger the entry if everything is loaded
  useEffect(() => {
    if (isLoadingEntry && !isEmpty(myIdentity) && !isEmpty(creatorLensProfile) && !isEmpty(featuredDecentNFT)) {
      setIsLoadingEntry(false);
    }
  }, [isLoadingEntry, myIdentity, doesFollowCreator, creatorLensProfile, featuredDecentNFT]);

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
            isFollowDrawer ? setDoesFollowDrawerProfile(true) : refetchDoesFollowCreator();
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

  function closeHostModal() {
    setIsHostOpen(false);
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

    if (isMounted && isLoadingEntry && defaultProfile.handle && clubSpaceObject.streamURL) {
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

  // @TODO: render some visualizer + the decent audio player
  // - clubSpaceObject.streamURL
  // - user can hit play/plause
  // - current song info: name, artist, album art (link to buy?)

  return (
    <>
      <NextSeo
        title={`ClubSpace | ${clubSpaceObject.creatorLensHandle}`}
        description={`Join ${clubSpaceObject.creatorLensHandle}'s live listening party on ClubSpace now!`}
        openGraph={{
          url: `${SITE_URL}/live/${clubSpaceObject.creatorLensHandle}`,
          title: `ClubSpace | ${clubSpaceObject.creatorLensHandle}`,
          description: `Join ${clubSpaceObject.creatorLensHandle}'s live listening party on ClubSpace now!`,
          images: [{
            url: creatorLensProfile.picture.original.url,
            width: 800,
            height: 600,
            alt: `${clubSpaceObject.creatorLensHandle} on Lens`,
          }]
        }} />
      <div className="relative grow flex flex-col justify-center min-h-screen">
        <div className="grid-live items-center justify-center px-10 lg:px-14 gap-x-3">
          <div className="grid-container w-full audience max-h-[30rem] overflow-auto !content-baseline">
            {!!myIdentity
              ? (!isHost ? [myPeerId].concat(audiencePeers) : audiencePeers).map((peerId, index) => {
                  return identities[peerId] ? (
                    <LensProfile
                      allowDrawer={[".lens", ".test"].some((ext) => identities[peerId].handle.includes(ext))}
                      id={identities[peerId].profile?.id}
                      key={identities[peerId].handle}
                      handle={identities[peerId].handle}
                      picture={
                        identities[peerId].profile.avatar ? getUrlForImageFromIpfs(identities[peerId].profile.avatar) : "/anon.png"
                      }
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

            {/* {mockIdentities.identities.map(({ id, handle, profile }, index) => (
              <LensProfile
                key={handle}
                handle={handle}
                picture={profile ? getUrlForImageFromIpfs(profile.avatar) : ""}
                name={profile?.name}
                totalFollowers={profile?.totalFollowers}
                index={index}
                onClick={toggleDrawer}
              />
            ))} */}
          </div>

          <div className="player mx-auto">
            {playlistTracks && clubSpaceObject.streamURL ? (
              <LiveAudioPlayer
                playlistTracks={playlistTracks}
                streamURL={clubSpaceObject.streamURL}
                playerUUID={clubSpaceObject.playerUUID}
                currentTrackId={clubSpaceObject.currentTrackId}
                address={address}
              />
            ) : <DirectToClaims address={address} />}
          </div>
          <div className="decent-nft flex flex-col gap-y-3">
            {featuredDecentNFT && <FeaturedDecentNFT {...featuredDecentNFT} />}
            <div>
              <button
                onClick={() => setIsHostOpen(true)}
                className="btn !w-auto mx-auto bg-almost-black !text-white flex gap-x-2 relative justify-between items-center"
              >
                <img
                  className="w-8 h-8 rounded-full outline outline-offset-0 outline-1 outline-gray-50"
                  src={getUrlForImageFromIpfs(creatorLensProfile.picture?.original?.url)}
                  alt=""
                />
                <span>@{creatorLensProfile.handle}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="bg-live-page-player bg-cover bg-no-repeat blur-[70px] inset-0 absolute z-[-1] lg:max-h-[50vh] max-h-[25vh] "></div>

        {/* Button group (reactions, share, comment) */}

        {isHost ? null : (
          <div className="flex gap-x-5 left-1/2 transform -translate-x-1/2 relative w-[150px] items-baseline">
            <Popover
              className={({ open }) =>
                classNames(
                  open ? "inset-0 z-40 overflow-y-auto" : "",
                  "mx-auto shadow-sm lg:static bottom-0 lg:overflow-y-visible"
                )
              }
            >
              {({ open }) => {
                return (
                  <>
                    <Menu as="div" className="relative flex-shrink-0 mb-32">
                      <div className="flex mt-10 items-center mx-auto">
                        <Menu.Button
                          disabled={!defaultProfile}
                          className="text-club-red !bg-transparent focus:outline-none rounded-lg text-sm text-center inline-flex items-center relative"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-6 h-6"
                          >
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                          </svg>

                          <span className="sr-only">Response icon heart-shape</span>
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
                        <Menu.Items className="absolute z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none flex gap-4 flex-wrap left-1/2 transform -translate-x-1/2">
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

            <button
              className="text-black dark:text-white !bg-transparent focus:outline-none rounded-lg text-sm text-center inline-flex items-center relative"
              onClick={() => window.open(shareURL, '_blank')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                />
              </svg>

              <span className="sr-only">Share icon</span>
            </button>

            { lensterPostURL &&
              <button
                className={
                  "text-white bg-indigo-700 hover:bg-indigo-800 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-full text-sm py-2 px-6 text-center inline-flex items-center mr-2 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800 !m-0 max-h-[40px]"
                }
                onClick={() => window.open(lensterPostURL, '_blank')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
              </button> }
          </div>
        )}
      </div>

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

                      {drawerProfile?.id !== defaultProfile?.id ? (
                        lensLoginData || lensRefreshData ? (
                          <button
                            className="!w-auto btn"
                            onClick={() => {
                              onFollowClick(drawerProfile.id);
                            }}
                            disabled={doesFollowDrawerProfile}
                          >
                            {doesFollowDrawerProfile ? "Following" : "Follow"}
                          </button>
                        ) : (
                          <button onClick={() => loginWithLens({}, true)} className="btn justify-center items-center">
                            Login with Lens
                          </button>
                        )
                      ) : null}
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

      {/* Start Host Modal */}

      <Transition appear show={isHostOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeHostModal}>
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

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="transform overflow-hidden rounded-2xl bg-none text-left align-middle shadow-xl transition-all">
                  {creatorLensProfile && (
                    <HostCard
                      profile={creatorLensProfile}
                      drawerProfileId={drawerProfile.id}
                      doesFollowDrawerProfile={doesFollowDrawerProfile}
                      onFollowClick={onFollowClick}
                      isHost={isHost}
                    />
                  )}
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
