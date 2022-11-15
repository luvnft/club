import { FC } from "react";

export const reactionsMap = {
  clap: "👏",
  heart: "❤️",
  fire: "🔥",
  rocket: "🚀",
  star: "⭐",
  party: "🎉",
  money: "💰",
  thumbsup: "👍",
};

export const reactionsEntries = Object.entries(reactionsMap);
const reactionsKeys = Object.keys(reactionsMap);

export type ReactionsTypes = keyof typeof reactionsMap;

type Props = {
  allowDrawer: boolean;
  picture: string;
  handle: string;
  reaction?: { type: string; handle: string; reactionUnicode: string };
  index: number;
  onClick: () => null;
};

export const LensProfile: FC<Props> = ({ allowDrawer, picture, handle, reaction, index, onClick }) => {
  let delayStyle = { "--_delay": index } as React.CSSProperties;

  return (
    <div
      style={delayStyle}
      onClick={allowDrawer ? onClick : undefined}
      className={`${
        allowDrawer
          ? "hover:outline hover:outline-indigo-400 hover:outline-offset-8 hover:outline-[0.1px] cursor-pointer"
          : ""
      } animate-fade-in-from-top flex items-center justify-center flex-col max-w-[80px] relative opacity-0 mx-auto gap-y-1`}
    >
      <img src={picture} alt={handle} className="rounded-full w-12 h-12 aspect-square" />
      <p className="text-xs truncate select-none">{handle}</p>
      {reaction && (
        <div className="absolute bottom-0 right-0">
          <div className="opacity-0 flex items-center justify-center w-6 h-6 text-4xl rounded-full animate-fade-in-and-out-up">
            {reaction.reactionUnicode}
          </div>
        </div>
      )}
    </div>
  );
};
