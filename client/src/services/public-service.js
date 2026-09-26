import { privateHttpClient, publicHttpClient } from "@/services/api/httpClient";


export const publicBlogDetails = async (payload) => {
  return await privateHttpClient.post("blog/public-details", payload);
};
export const publicGalleryDetails = async (payload) => {
  return await publicHttpClient.post("public/gallery/details", payload);
};


