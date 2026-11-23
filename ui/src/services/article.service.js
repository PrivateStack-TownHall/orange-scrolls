import { api } from "./api";

// GET ALL ARTICLES
// By default only live articles come back. `{ deleted: true }` returns the
// soft-deleted ones instead (the "Deleted" view, used to restore).
export const getArticles = async ({ deleted = false } = {}) => {
  const res = await api.get("/articles", {
    params: deleted ? { deleted: "true" } : undefined,
  });
  return res.data;
};

// GET SINGLE ARTICLE
export const getArticleById = async (id) => {
  const res = await api.get(`/articles/${id}`);
  return res.data;
};

// CREATE ARTICLE
// `config` is passed to axios, e.g. `{ skipErrorModal: true }` when the page
// shows the error itself (inline field errors + toast).
export const createArticle = async (data, config) => {
  const res = await api.post("/articles", data, config);
  return res.data;
};

// UPDATE ARTICLE
export const updateArticle = async (id, data, config) => {
  const res = await api.put(`/articles/${id}`, data, config);
  return res.data;
};

// DELETE ARTICLE (soft delete — the article can be restored)
export const deleteArticle = async (id, config) => {
  const res = await api.delete(`/articles/${id}`, config);
  return res.data;
};

// RESTORE A SOFT-DELETED ARTICLE
export const restoreArticle = async (id, config) => {
  const res = await api.post(`/articles/${id}/restore`, null, config);
  return res.data;
};

// GET SINGLE ARTICLE BY SLUG
export const getArticleBySlug = async (slug) => {
  // A missing article here is an expected, already-handled outcome (the
  // page shows its own "Article not found" message) — skip the global
  // error modal so a bad/old link doesn't pop up a scary dialog on top of
  // that.
  const res = await api.get(`/articles/slug/${slug}`, {
    skipErrorModal: true,
  });
  return res.data;
};
