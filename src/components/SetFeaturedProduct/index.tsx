import { useState } from "react";
import { useSigner, useAccount, useNetwork } from "wagmi";
import DecentLogo from "@/assets/svg/decent.svg";
import SoundLogo from "@/assets/svg/sound.svg";
import { MultiStepFormWrapper } from "./../MultiStepFormWrapper";
import useGetDecentDrops from "@/hooks/useGetDecentDrops";
import useGetSoundDrops from "@/hooks/useGetSoundDrops";
import { DROP_PROTOCOL_DECENT, DROP_PROTOCOL_SOUND } from "@/lib/consts";
import DecentDrop from "./DecentDrop";
import SoundDrop from "./SoundDrop";

const SetFeaturedProduct = ({ selectDrop, drop }) => {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { data: signer } = useSigner();
  const { data: decentDrops, isLoading: isLoadingDecent } = useGetDecentDrops(address, chain.id, signer);
  const { data: soundDrops, isLoading: isLoadingSound } = useGetSoundDrops(address);
  const [selectedProtocol, setSelectedProtocol] = useState(DROP_PROTOCOL_DECENT);

  const isLoading = isLoadingDecent || isLoadingSound;

  return (
    <MultiStepFormWrapper>
      <div className="w-full">
        <div className="w-full">
          <div className="w-full flex flex-col gap-4">
            <h2 className="mt-4 text-md font-bold tracking-tight sm:text-lg md:text-xl">Set Your Featured NFT Drop</h2>
            <p className="mb-2">If you don't have a drop to promote you can pin a Lens post in the next step instead.</p>
            {
              isLoading && (
                <p>Loading your drops...</p>
              )
            }
            {
              !isLoading && (
                <>
                  <div className="flex flex w-full justify-center relative grid-cols-2 gap-4">
                    <div
                      className="flex w-full items-center pl-4 border border-gray-200 rounded bg-white cursor-pointer"
                      onClick={() => setSelectedProtocol(DROP_PROTOCOL_DECENT)}
                    >
                      <input
                        id="radio-protocol-decent"
                        type="radio"
                        value=""
                        name="bordered-radio"
                        className="w-4 h-4 text-[color:var(--club-red)] bg-gray-100 border-gray-300 focus:ring-[color:var(--club-red)]"
                        checked={selectedProtocol === DROP_PROTOCOL_DECENT}
                      />
                      <DecentLogo height={50} className="ml-5 mr-5" width={50} />
                      <label htmlFor="radio-protocol-decent" className="w-full py-4 ml-2 text-sm font-medium text-black">Decent</label>
                    </div>
                    <div
                      className="flex w-full items-center pl-4 border border-gray-200 rounded bg-white cursor-pointer"
                      onClick={() => setSelectedProtocol(DROP_PROTOCOL_SOUND)}
                    >
                      <input
                        id="radio-protocol-sound"
                        type="radio"
                        value=""
                        name="bordered-radio"
                        className="w-4 h-4 text-[color:var(--club-red)] bg-gray-100 border-gray-300 focus:ring-[color:var(--club-red)]"
                        checked={selectedProtocol === DROP_PROTOCOL_SOUND}
                      />
                      <SoundLogo height={50} className="ml-5 mr-5" width={50} />
                      <label htmlFor="radio-protocol-sound" className="w-full py-4 ml-2 text-sm font-medium text-black">Sound</label>
                    </div>
                  </div>
                </>
              )
            }
            {selectedProtocol === DROP_PROTOCOL_DECENT && (
              <DecentDrop
                deployedProducts={decentDrops}
                decentProduct={drop}
                selectDrop={selectDrop}
                protocol={DROP_PROTOCOL_DECENT}
              />
            )}
            {selectedProtocol === DROP_PROTOCOL_SOUND && (
              <SoundDrop
                deployedProducts={soundDrops}
                soundProduct={drop}
                selectDrop={selectDrop}
                protocol={DROP_PROTOCOL_SOUND}
              />
            )}
          </div>
        </div>
      </div>
    </MultiStepFormWrapper>
  );
};

export default SetFeaturedProduct;
