import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Faceless Studio",
    short_name: "Faceless",
    description: "Autonomous faceless YouTube channel studio",
    start_url: "/",
    display: "standalone",
    background_color: "#EDEBE7",
    theme_color: "#EDEBE7",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
