import { api } from "./api";

export const getMedia = async () => {
  const res = await api.get("/media");
  return res.data;
};

export const getMediaById = async (id) => {
  const res = await api.get(`/media/${id}`);
  return res.data;
};

export const createMedia = async (data) => {
  // IMPORTANT: don't set Content-Type manually here. `data` is a FormData
  // instance — axios/the browser needs to generate the header itself so it
  // includes the multipart boundary (e.g. "multipart/form-data;
  // boundary=----WebKitFormBoundary..."). Setting it to a bare
  // "multipart/form-data" string strips that boundary, so the backend
  // (multer) can't parse the body and the upload silently fails.
  const res = await api.post("/media/upload", data);

  return res.data;
};

export const updateMedia = async (id, data) => {
  const res = await api.put(`/media/${id}`, data);
  return res.data;
};

export const deleteMedia = async (id) => {
  const res = await api.delete(`/media/${id}`);
  return res.data;
};
