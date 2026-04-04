"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { deletePost, listComments, listPosts, listUsers, saveComment, savePost } from "@/lib/data-service";
import { AppUser, BoardComment, BoardPost } from "@/lib/types";
import { formatDateTime, userNameById } from "@/lib/utils";

type PostFormState = {
  id?: string;
  title: string;
  category: string;
  body: string;
  pinned: boolean;
};

const initialPostForm: PostFormState = {
  title: "",
  category: "",
  body: "",
  pinned: false
};

export default function BoardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [postForm, setPostForm] = useState<PostFormState>(initialPostForm);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState("all");

  async function refresh() {
    const [nextUsers, nextPosts, nextComments] = await Promise.all([listUsers(), listPosts(), listComments()]);
    const sortedPosts = [...nextPosts].sort((left, right) => {
      if (left.pinned !== right.pinned) return Number(right.pinned) - Number(left.pinned);
      return right.updatedAt.localeCompare(left.updatedAt);
    });

    setUsers(nextUsers);
    setPosts(sortedPosts);
    setComments(nextComments);
    setSelectedPostId((current) => current || sortedPosts[0]?.id || "");
  }

  useEffect(() => {
    void refresh();
  }, []);

  const categories = useMemo(() => {
    const values = new Set(posts.map((post) => post.category).filter(Boolean));
    return [...values].sort((left, right) => left.localeCompare(right, "ja"));
  }, [posts]);

  const visiblePosts = useMemo(() => {
    if (filterCategory === "all") return posts;
    return posts.filter((post) => post.category === filterCategory);
  }, [filterCategory, posts]);

  const selectedPost = visiblePosts.find((post) => post.id === selectedPostId) ?? visiblePosts[0] ?? null;
  const selectedComments = useMemo(
    () =>
      comments
        .filter((comment) => comment.postId === selectedPost?.id)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [comments, selectedPost?.id]
  );

  useEffect(() => {
    if (!visiblePosts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(visiblePosts[0]?.id ?? "");
    }
  }, [selectedPostId, visiblePosts]);

  async function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    await savePost({
      id: postForm.id,
      title: postForm.title.trim(),
      category: postForm.category.trim() || "未分類",
      body: postForm.body.trim(),
      pinned: user.role === "admin" ? postForm.pinned : false,
      authorUserId: postForm.id ? posts.find((item) => item.id === postForm.id)?.authorUserId ?? user.id : user.id
    });

    setPostForm(initialPostForm);
    await refresh();
  }

  function startEdit(post: BoardPost) {
    setPostForm({
      id: post.id,
      title: post.title,
      category: post.category,
      body: post.body,
      pinned: post.pinned
    });
    setSelectedPostId(post.id);
  }

  async function handleDelete(post: BoardPost) {
    if (!user) return;
    if (user.role !== "admin" && post.authorUserId !== user.id) return;
    if (!window.confirm("この投稿を削除しますか？")) return;

    await deletePost(post.id);
    if (selectedPostId === post.id) {
      setSelectedPostId("");
    }
    setPostForm(initialPostForm);
    await refresh();
  }

  return (
    <div className="page-stack">
      <section className="surface-card portal-head-card">
        <div>
          <p className="eyebrow">bulletin board</p>
          <h3>掲示板</h3>
          <p className="muted">入口から一覧を見て詳細を開けます。投稿者本人は編集と削除、管理者は全件管理ができます。</p>
        </div>
      </section>

      <section className="split-grid board-workspace">
        <aside className="surface-card board-sidebar-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">threads</p>
              <h3>スレッド一覧</h3>
            </div>
            <span className="status-badge">{visiblePosts.length} 件</span>
          </div>

          <div className="toolbar-group board-filter-row">
            <label className="field filter-field">
              <span className="filter-label">カテゴリ</span>
              <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
                <option value="all">すべて</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <button className="small-button" type="button" onClick={() => setPostForm(initialPostForm)}>
              新規作成
            </button>
          </div>

          <div className="board-thread-list">
            {visiblePosts.map((post) => {
              const isActive = post.id === selectedPost?.id;
              return (
                <button
                  key={post.id}
                  type="button"
                  className={isActive ? "board-thread-card active" : "board-thread-card"}
                  onClick={() => setSelectedPostId(post.id)}
                >
                  <div className="board-thread-top">
                    <div className="board-thread-badges">
                      {post.pinned ? <span className="warning-badge">重要</span> : null}
                      <span className="status-badge neutral-badge">{post.category}</span>
                    </div>
                    <span className="muted">{formatDateTime(post.updatedAt)}</span>
                  </div>
                  <strong>{post.title}</strong>
                  <p>{post.body}</p>
                  <span className="muted">{userNameById(users, post.authorUserId)}</span>
                </button>
              );
            })}
            {visiblePosts.length === 0 ? <p className="muted">該当する投稿はまだありません。</p> : null}
          </div>
        </aside>

        <div className="page-stack">
          <section className="surface-card board-detail-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">detail</p>
                <h3>{selectedPost?.title ?? "投稿を選択してください"}</h3>
              </div>
              {selectedPost ? (
                <div className="toolbar-group">
                  {(user?.role === "admin" || user?.id === selectedPost.authorUserId) && (
                    <>
                      <button className="small-button" type="button" onClick={() => startEdit(selectedPost)}>
                        編集
                      </button>
                      <button className="small-button danger-button" type="button" onClick={() => handleDelete(selectedPost)}>
                        削除
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {selectedPost ? (
              <div className="page-stack">
                <div className="toolbar-group">
                  {selectedPost.pinned ? <span className="warning-badge">重要</span> : null}
                  <span className="status-badge neutral-badge">{selectedPost.category}</span>
                  <span className="muted">投稿者: {userNameById(users, selectedPost.authorUserId)}</span>
                  <span className="muted">更新: {formatDateTime(selectedPost.updatedAt)}</span>
                </div>
                <div className="board-post-body board-detail-body">{selectedPost.body}</div>

                <div className="board-comment-panel">
                  <div className="section-head">
                    <h4>コメント</h4>
                    <span className="muted">{selectedComments.length} 件</span>
                  </div>
                  <div className="comment-list board-comment-list">
                    {selectedComments.map((comment) => (
                      <div key={comment.id} className="comment-card board-comment-card">
                        <div className="board-comment-head">
                          <strong>{userNameById(users, comment.authorUserId)}</strong>
                          <span>{formatDateTime(comment.createdAt)}</span>
                        </div>
                        <div className="board-comment-body">{comment.body}</div>
                      </div>
                    ))}
                    {selectedComments.length === 0 ? <p className="muted">まだコメントはありません。</p> : null}
                  </div>
                  <form
                    className="board-comment-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!user || !selectedPost || !commentInputs[selectedPost.id]?.trim()) return;
                      await saveComment({ postId: selectedPost.id, body: commentInputs[selectedPost.id].trim(), authorUserId: user.id });
                      setCommentInputs((current) => ({ ...current, [selectedPost.id]: "" }));
                      await refresh();
                    }}
                  >
                    <textarea
                      rows={3}
                      value={selectedPost ? commentInputs[selectedPost.id] ?? "" : ""}
                      onChange={(event) =>
                        selectedPost
                          ? setCommentInputs((current) => ({ ...current, [selectedPost.id]: event.target.value }))
                          : undefined
                      }
                      placeholder="コメントを入力"
                    />
                    <button className="small-button" type="submit" disabled={!selectedPost}>
                      コメントする
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <p className="muted">左の一覧から投稿を選ぶと内容が表示されます。</p>
            )}
          </section>

          <form className="surface-card board-compose-card" onSubmit={handlePostSubmit}>
            <div className="section-head">
              <div>
                <p className="eyebrow">{postForm.id ? "edit post" : "new post"}</p>
                <h3>{postForm.id ? "投稿を編集" : "新規投稿"}</h3>
              </div>
              {postForm.id ? (
                <button className="small-button" type="button" onClick={() => setPostForm(initialPostForm)}>
                  編集をやめる
                </button>
              ) : null}
            </div>

            <div className="form-grid">
              <label className="field">
                <span>タイトル</span>
                <input
                  value={postForm.title}
                  onChange={(event) => setPostForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="例: 設備点検のお願い"
                  required
                />
              </label>
              <label className="field">
                <span>カテゴリ</span>
                <input
                  value={postForm.category}
                  onChange={(event) => setPostForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="例: 総務"
                  required
                />
              </label>
              <label className="field full">
                <span>本文</span>
                <textarea
                  rows={8}
                  value={postForm.body}
                  onChange={(event) => setPostForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="本文を入力"
                  required
                />
              </label>
              {user?.role === "admin" ? (
                <label className="board-pin-toggle full">
                  <input
                    type="checkbox"
                    checked={postForm.pinned}
                    onChange={(event) => setPostForm((current) => ({ ...current, pinned: event.target.checked }))}
                  />
                  <span>重要なお知らせとして先頭に固定する</span>
                </label>
              ) : null}
            </div>
            <div className="board-compose-actions">
              <button className="primary-button" type="submit">
                {postForm.id ? "更新する" : "投稿する"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
