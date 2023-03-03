import { getPost } from "@/services/lens/getPost";
import { useMemo, useState } from "react";
import { getUrlForImageFromIpfs } from "@/utils";
import Image from "next/image";

const PinnedLensPost = ({ url, small }) => {
  const [lensPost, setLensPost] = useState(null);

  useMemo(async () => {
    const parts = url.split("/");
    const post = await getPost(parts[parts.length - 1]);
    setLensPost(post);
  }, [url]);

  if (small) {
    return (
      <>
        <div className="rounded-md w-[17rem] max-h-[6.5rem] bg-black m-auto p-3 drop-shadow-sm">
          <a href={url} className="" target="_blank" referrerPolicy="no-referrer">
            <div className="flex mb-3">
              <Image
                src={getUrlForImageFromIpfs(lensPost?.profile.picture.original.url) ?? "/anon.png"}
                alt="Profile Picture"
                height={40}
                width={40}
                className="object-cover rounded-full"
                loading="lazy"
              />
              <span className="mt-2 ml-2">{lensPost?.profile.name || lensPost?.profile.handle}</span>
            </div>
            <p className="mb-2 truncate max-h-[12rem]">{lensPost?.metadata.content}</p>
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="my-4 text-4xl font-bold tracking-tight sm:text-2xl md:text-5xl drop-shadow-sm text-center drop-shadow-sm">
        Pinned Lens Post
      </h2>
      <div className="rounded-md w-[17rem] min-h-[17rem] bg-black m-auto p-3">
        <a href={url} className="" target="_blank" referrerPolicy="no-referrer">
          <div className="flex mb-3">
            <Image
              src={getUrlForImageFromIpfs(lensPost?.profile.picture.original.url) ?? "/anon.png"}
              alt="Profile Picture"
              height={40}
              width={40}
              className="object-cover rounded-full"
              loading="lazy"
            />
            <span className="mt-2 ml-2">{lensPost?.profile.name || lensPost?.profile.handle}</span>
          </div>
          <p className="mb-2 overflow-scroll max-h-[12rem]">{lensPost?.metadata.content}</p>
          <div className={`grid ${lensPost?.metadata.media.length > 1 ? "grid-cols-2" : ""} gap-2 object-cover`}>
            {lensPost?.metadata.media?.map((media) => (
              <img
                src={getUrlForImageFromIpfs(media.original.url) ?? "/anon.png"}
                alt="Media"
                key={media.original.url}
                className={`object-cover rounded-sm w-full ${lensPost?.metadata.media.length > 1 ? "h-20" : "h-full"}`}
                loading="lazy"
              />
            ))}
          </div>
        </a>
      </div>
    </>
  );
};

export default PinnedLensPost;
