import { Metadata } from "next";
import App from "./app";
import { APP_NAME, APP_DESCRIPTION, APP_OG_IMAGE_URL } from "~/lib/constants";
import { getMiniAppEmbedMetadata } from "~/lib/utils";

export const revalidate = 300;

// Enhanced metadata, adding more Farcaster-specific configurations
export async function generateMetadata(): Promise<Metadata> {
  const miniAppMetadata = getMiniAppEmbedMetadata();
  
  return {
    title: APP_NAME,
    openGraph: {
      title: APP_NAME,
      description: APP_DESCRIPTION,
      images: [APP_OG_IMAGE_URL],
    },
    other: {
      // Set Farcaster Mini App metadata
      "fc:miniapp": JSON.stringify(miniAppMetadata),
      // Backward compatibility support
      "fc:frame": JSON.stringify(miniAppMetadata),
    },
  };
}

export default function Home() {
  return (<App />);
}
