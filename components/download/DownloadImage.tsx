"use client";

import Image, { type ImageProps } from "next/image";
import { cloudinaryLoaderEco } from "@/lib/cloudinary";

type DownloadImageProps = Omit<ImageProps, "loader">;

export default function DownloadImage(props: DownloadImageProps) {
  return <Image {...props} loader={cloudinaryLoaderEco} />;
}
