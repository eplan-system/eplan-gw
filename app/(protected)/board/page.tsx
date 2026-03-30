"use client";

import { FormEvent, useEffect, useState } from "react";
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
    setUsers(await listUsers());
    setPosts(await listPosts());
    setComments(await listComments());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    await savePost({ ...postForm, authorUserId: user.id });
    setPostForm({ title: "", body: "", pinned: false });
    await refresh();
  }

  return (
    <div className="page-stack">
      <section className="split-grid">
        <form className="surface-card" onSubmit={handlePostSubmit}>
          <p className="eyebrow">new topic</p>
          <h3>掲示板投稿</h3>
          <div className="form-grid">
            <label className="field full">
              <span>タイトル</span>
              <input value={postForm.title} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} required />
            </label>
            <label className="field full">
              <span>本文</span>
              <textarea rows={6} value={postForm.body} onChange={(event) => setPostForm({ ...postForm, body: event.target.value })} required />
            </label>
            <label className="field full">
              <span>
                <input type="checkbox" checked={postForm.pinned} onChange={(event) => setPostForm({ ...postForm, pinned: event.target.checked })} /> ピン留めする
              </span>
            </label>
          </div>
          <button className="primary-button" type="submit">投稿する</button>
        </form>

        <section className="surface-card">
          <p className="eyebrow">latest posts</p>
          <h3>新着一覧</h3>
          <div className="list-stack">
            {[...posts].sort((a, b) => Number(b.pinned) - Number(a.pinned)).map((post) => (
              <article key={post.id} className="post-card">
                {post.pinned ? <span className="status-badge">ピン留め</span> : null}
                <strong>{post.title}</strong>
                <div className="list-meta">
                  <span>{userNameById(users, post.authorUserId)}</span>
                  <span>{formatDateTime(post.createdAt)}</span>
                </div>
                <p>{post.body}</p>
                <div className="comment-list">
                  {comments.filter((comment) => comment.postId === post.id).map((comment) => (
                    <div key={comment.id} className="comment-card">
                      <strong>{userNameById(users, comment.authorUserId)}</strong>
                      <p>{comment.body}</p>
                    </div>
                  ))}
                </div>
                <form
                  className="comment-list"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!user || !commentInputs[post.id]) return;
                    await saveComment({ postId: post.id, body: commentInputs[post.id], authorUserId: user.id });
                    setCommentInputs({ ...commentInputs, [post.id]: "" });
                    await refresh();
                  }}
                >
                  <input
                    value={commentInputs[post.id] ?? ""}
                    onChange={(event) => setCommentInputs({ ...commentInputs, [post.id]: event.target.value })}
                    placeholder="コメントを入力"
                  />
                  <button className="small-button" type="submit">コメント</button>
                </form>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
