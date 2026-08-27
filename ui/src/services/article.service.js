import { api } from "./api";

// GET ALL ARTICLES
export const getArticles = async () => {
  const res = await api.get("/articles");
  return res.data;
};

// GET SINGLE ARTICLE
export const getArticleById = async (id) => {
  const res = await api.get(`/articles/${id}`);
  return res.data;
};

// CREATE ARTICLE
export const createArticle = async (data) => {
  const res = await api.post("/articles", data);
  console.log("Creating article with data:", data);
  return res.data;
};

// UPDATE ARTICLE
export const updateArticle = async (id, data) => {
  const res = await api.put(`/articles/${id}`, data);
  return res.data;
};

// DELETE ARTICLE
export const deleteArticle = async (id) => {
  const res = await api.delete(`/articles/${id}`);
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
