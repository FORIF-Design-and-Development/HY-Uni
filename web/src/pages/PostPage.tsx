// src/pages/PostPage.tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPostById, Post } from "../api/apiClient";

function PostPage() {
  const { id } = useParams<{ id: string }>(); // URL에서 :id 값 가져오기
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getPostById(id)
        .then((data) => setPost(data))
        .catch((err) => console.error("게시글 로딩 실패:", err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <p>게시글을 불러오는 중...</p>;
  if (!post) return <p>게시글을 찾을 수 없습니다.</p>;

  return (
    <div className="post-detail">
      <h2>{post.title}</h2>
      <p className="post-meta">
        작성일: {new Date(post.created_at).toLocaleString()}
      </p>
      {/* DB에 저장된 텍스트의 줄바꿈(\n)을 HTML(<br>)로 표시하기 위해
        whiteSpace: 'pre-wrap' 스타일을 사용합니다. 
      */}
      <div className="post-content" style={{ whiteSpace: "pre-wrap" }}>
        {post.content}
      </div>
    </div>
  );
}

export default PostPage;
