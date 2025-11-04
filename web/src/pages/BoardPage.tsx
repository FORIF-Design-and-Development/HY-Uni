// src/pages/BoardPage.tsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getPostsByBoard, Board, PostSummary } from "../api/apiClient";

function BoardPage() {
  // URL 파라미터에서 :slug 값을 가져옵니다. (예: "free-talk")
  const { slug } = useParams<{ slug: string }>();

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      // slug 값이 있는지 확인
      getPostsByBoard(slug)
        .then((data) => {
          setBoard(data.board); // 게시판 정보 저장
          setPosts(data.posts); // 글 목록 저장
        })
        .catch((err) => console.error("게시글 목록 로딩 실패:", err))
        .finally(() => setLoading(false));
    }
  }, [slug]); // [slug]: slug 값이 바뀔 때마다 useEffect를 다시 실행

  if (loading) return <p>게시판 로딩 중...</p>;
  if (!board) return <p>게시판을 찾을 수 없습니다.</p>;

  return (
    <div>
      <h2>{board.name}</h2>

      {/* (나중에) 글쓰기 버튼
      <Link to={`/board/${slug}/write`}>글쓰기</Link> 
      */}

      <ul className="post-list">
        {posts.length === 0 ? (
          <p>아직 게시글이 없습니다.</p>
        ) : (
          posts.map((post) => (
            <li key={post.id}>
              <Link to={`/post/${post.id}`}>{post.title}</Link>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default BoardPage;
