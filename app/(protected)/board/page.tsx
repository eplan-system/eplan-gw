"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { listComments, listPosts, listUsers, saveComment, savePost } from "@/lib/data-service";
import { AppUser, BoardComment, BoardPost } from "@/lib/types";
import { formatDateTime, userNameById } from "@/lib/utils";

export default function BoardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [postForm, setPostForm] = useState({ title: "", body: "", pinned: false });
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  async function refresh() {
    const [nextUsers, nextPosts, nextComments] = await Promise.all([listUsers(), listPosts(), listComments()]);
    setUsers(nextUsers);
    setPosts(nextPosts);
    setComments(nextComments);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const sortedPosts = useMemo(
    () =>
      [...posts].sort((left, right) => {
        if (left.pinned !== right.pinned) return Number(right.pinned) - Number(left.pinned);
        return right.createdAt.localeCompare(left.createdAt);
      }),
    [posts]
  );

  async function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    await savePost({ ...postForm, authorUserId: user.id });
    setPostForm({ title: "", body: "", pinned: false });
    await refresh();
  }

  return (
    <div className="page-stack">
      <section className="split-grid board-layout">
        <form className="surface-card board-compose-card" onSubmit={handlePostSubmit}>
          <p className="eyebrow">new post</p>
          <h3>掲示板投稿</h3>
          <div className="form-grid">
            <label className="field full">
              <span>タイトル</span>
              <input value={postForm.title} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} placeholder="件名を入力" required />
            </label>
            <label className="field full">
              <span>本文</span>
              <textarea
                rows={10}
                value={postForm.body}
                onChange={(event) => setPostForm({ ...postForm, body: event.target.value })}
                placeholder="社内へ共有したい内容を入力"
                required
              />
            </label>
            <label className="board-pin-toggle full">
              <input type="checkbox" checked={postForm.pinned} onChange={(event) => setPostForm({ ...postForm, pinned: event.target.checked })} />
              <span>重要なお知らせとして上部に固定する</span>
            </label>
          </div>
          <div className="board-compose-actions">
            <button className="primary-button" type="submit">
              投稿する
            </button>
          </div>
        </form>

        <section className="surface-card board-feed-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">board feed</p>
              <h3>新着一覧</h3>
            </div>
            <span className="status-badge">{sortedPosts.length}件</span>
          </div>

          <div className="list-stack board-feed-list">
            {sortedPosts.map((post) => (
              <article key={post.id} className="post-card board-post-card">
                <div className="board-post-head">
                  <div className="board-post-title">
                    {post.pinned ? <span className="warning-badge">重要</span> : null}
                    <strong>{post.title}</strong>
                  </div>
                  <div className="list-meta board-post-meta">
                    <span>{userNameById(users, post.authorUserId)}</span>
                    <span>{formatDateTime(post.createdAt)}</span>
                  </div>
                </div>

                <div className="board-post-body">{post.body}</div>

                <div className="comment-list board-comment-list">
                  {comments
                    .filter((comment) => comment.postId === post.id)
                    .map((comment) => (
                      <div key={comment.id} className="comment-card board-comment-card">
                        <div className="board-comment-head">
                          <strong>{userNameById(users, comment.authorUserId)}</strong>
                          <span>{formatDateTime(comment.createdAt)}</span>
                        </div>
                        <div className="board-comment-body">{comment.body}</div>
                      </div>
                    ))}
                </div>

                <form
                  className="board-comment-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!user || !commentInputs[post.id]?.trim()) return;
                    await saveComment({ postId: post.id, body: commentInputs[post.id], authorUserId: user.id });
                    setCommentInputs({ ...commentInputs, [post.id]: "" });
                    await refresh();
                  }}
                >
                  <textarea
                    rows={3}
                    value={commentInputs[post.id] ?? ""}
                    onChange={(event) => setCommentInputs({ ...commentInputs, [post.id]: event.target.value })}
                    placeholder="コメントを入力"
                  />
                  <button className="small-button" type="submit">
                    コメントする
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
