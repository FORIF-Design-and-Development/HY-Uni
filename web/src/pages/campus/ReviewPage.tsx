import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { reviewAPI } from "../../api/campus/timetable.review.api";
import { useTimetableStore } from "../../store/timetable.store";
import { useAuthStore } from "../../store/auth.store"; 
import axios from "axios";


interface ReviewPageType {
  review_id: number;
  course_id: number;
  rating: number;
  content: string;
  assignment: string;
  group_project: string;
  semester: string;
  user_id?: number;
  is_mine?: boolean; // 본인 판별용(리뷰 수정, 삭제)
}

export default function ReviewPage() {
  const { courseId } = useParams();

  if (!courseId) {
    console.error("Invalid route: courseId missing");
    return null;
  }

  const { user } = useAuthStore(); // 현재 로그인한 유저 정보
  const [reviews, setReviews] = useState<ReviewPageType[]>([]);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [semester, setSemester] = useState("2025-2");
  const [assignment, setAssignment] = useState("normal");
  const [groupProject, setGroupProject] = useState("normal");
  const courses = useTimetableStore(state => state.courses);
  const course = courses.find(c => c.course_id === Number(courseId));

  const [editing, setEditing] = useState(false); 
  
  const getMyUserId = () => {
    if (!user) return null;

    const anyUser = user as any;
    const myId =
      anyUser.user_id ??
      anyUser.id ??
      anyUser.userId ??
      anyUser.userID ??
      anyUser.userid ??
      null;

    return myId == null ? null : Number(myId);
  };

  // 내가 작성한 리뷰인지 판별
  const isMine = (r: ReviewPageType) => {
    // ✅ [추가] 서버가 is_mine을 내려주면 그걸 최우선으로 사용
    if (typeof r.is_mine === "boolean") return r.is_mine;

    // 기존 로직 유지 + 보강
    const myId = getMyUserId();
    if (myId == null) return false;

    return Number(r.user_id) === myId;
  };


  const load = async () => {
    if (!courseId) return;

    const res = await reviewAPI.getReviews(Number(courseId));
    setReviews(res.data.data || []);

    // ✅ [추가] 버튼이 안 보일 때 원인 확인용 (필요 없으면 지워도 됨)
    console.log("DEBUG user:", user);
    console.log("DEBUG reviews[0]:", (res.data.data || [])[0]);
  };

  useEffect(() => {
    load();
  }, [courseId]);

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + Number(r.rating), 0) /
          reviews.length
        ).toFixed(1)
      : "0.0";

  const handleSubmit = async () => {
    if (!courseId || isNaN(Number(courseId))) {
      alert("강의 정보가 없습니다.");
      return;
    }

    try {
      if (editing) {
        await reviewAPI.updateReview(Number(courseId), {
          course_id: Number(courseId),
          rating,
          content,
          assignment,
          group_project: groupProject,
          semester,
        });

        alert("수정 완료!");
        setEditing(false);  
      } else {
        // 기존: 작성
        await reviewAPI.createReview({
          course_id: Number(courseId),
          rating,
          content,
          assignment,
          group_project: groupProject,
          semester,
        });

        alert("작성 완료!");
      }

      setContent("");
      setRating(5);
      setAssignment("normal");
      setGroupProject("normal");
      setSemester("2025-2"); 
      load();
    } catch (err: unknown) {
      // ✅ [추가] 409(중복 작성)인 경우: 팝업으로 안내
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        alert("리뷰는 강의당 1회만 작성할 수 있습니다. (중복 작성 불가)");
        return;
      }

      // ✅ [추가] (선택) 401이면 로그인 만료 가능성
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        alert("로그인이 필요합니다. 다시 로그인해주세요.");
        return;
      }

      // ✅ [추가] 그 외 에러 처리
      console.error(err);
      alert("처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!courseId || isNaN(Number(courseId))) {
      alert("강의 정보가 없습니다.");
      return;
    }

    if (!window.confirm("리뷰를 삭제하시겠습니까?")) return;

    try {
      await reviewAPI.deleteReview(Number(courseId));
      alert("삭제 완료!"); 

      setEditing(false);
      setContent("");
      setRating(5);
      setAssignment("normal");
      setGroupProject("normal");
      setSemester("2025-2");

      load();
    } catch (err: unknown) {
      //  401이면 로그인 만료
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        alert("로그인이 필요합니다. 다시 로그인해주세요.");
        return;
      }

      console.error(err);
      alert("삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  // 수정 버튼 클릭 시 폼에 값 채우고 수정 모드로 전환
  const startEdit = (r: ReviewPageType) => {
    setEditing(true);
    setRating(Number(r.rating) || 5);
    setContent(r.content || "");
    setSemester(r.semester || "2025-2");
    setAssignment(r.assignment || "normal");
    setGroupProject(r.group_project || "normal");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); // ✅ [추가] 작성 UI로 스크롤
  };

  // 수정 취소
  const cancelEdit = () => {
    setEditing(false);
    setContent("");
    setRating(5);
    setSemester("2025-2");
    setAssignment("normal");
    setGroupProject("normal");
  };

  const formatSemester = (s: string) => {
    const [year, term] = s.split("-");
    const yy = year.slice(2);
    return `${yy}년 ${term}학기 수강자`;
  };

  return (
    <div style={{ padding: 20 }}>

      {course && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {course.course_name}
          </div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            {course.professor || "교수정보 없음"} · {course.credit}학점 · {course.classification}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div style={{
        display: "flex",
        alignItems: "center",
        marginBottom: 16,
        fontSize: 20,
        fontWeight: 600
      }}>
        ⭐ {averageRating} / 5.0
        <span style={{ fontSize: 14, opacity: 0.6, marginLeft: 6 }}>
          ({reviews.length}명)
        </span>
      </div>

      {/* 리뷰 목록 */}
      {reviews.length > 0 ? (
        reviews.map((r, i) => (
          <div
            key={i}
            style={{
              background: "white",
              padding: 16,
              borderRadius: 12,
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              marginBottom: 12
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              ⭐ {r.rating}
            </div>
            <div style={{ marginTop: 6 }}>{r.content}</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
              {formatSemester(r.semester)} · 과제 {r.assignment} · 팀플 {r.group_project}
            </div>

            {/* 본인 리뷰만 수정/삭제 버튼 노출 */}
            {isMine(r) && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => startEdit(r)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #DDD",
                    background: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  수정
                </button>

                <button
                  onClick={handleDelete}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "#e53935",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        ))
      ) : (
        <div style={{ opacity: 0.6 }}>아직 등록된 리뷰가 없습니다.</div>
      )}

      {/* 작성 UI */}
      <div
        style={{
          background: "white",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          marginTop: 20
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}>
          평가 작성
        </div>

        {/* 수정 모드 */}
        {editing && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#F7F9FA",
              border: "1px solid #ECEFF1",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              내용을 수정한 뒤 저장하세요.
            </div>
            <button
              onClick={cancelEdit}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #DDD",
                background: "#ffffff",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              수정 취소
            </button>
          </div>
        )}

        {/* 평점 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 6 }}>평점</div>
          {[1,2,3,4,5].map(n => (
            <span
              key={n}
              onClick={() => setRating(n)}
              style={{
                cursor: "pointer",
                fontSize: 28,
                color: n <= rating ? "#FFD032" : "#E0E0E0",
                marginRight: 4
              }}
            >
              ★
            </span>
          ))}
        </div>

        {/* 과제 난이도 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 6 }}>과제 난이도</div>
          <select
            value={assignment}
            onChange={(e)=> setAssignment(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid #DDD",
              width: "100%"
            }}
          >
            <option value="none">없음</option>
            <option value="easy">쉬움</option>
            <option value="normal">보통</option>
            <option value="heavy">많음</option>
          </select>
        </div>

        {/* 팀플 난이도 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 6 }}>팀플 난이도</div>
          <select
            value={groupProject}
            onChange={(e)=> setGroupProject(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid #DDD",
              width: "100%"
            }}
          >
            <option value="none">없음</option>
            <option value="easy">쉬움</option>
            <option value="normal">보통</option>
            <option value="heavy">많음</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 6 }}>수강 학기</div>
          <select
            value={semester}
            onChange={(e)=> setSemester(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #DDD", width: "100%" }}
          >
            <option value="2025-2">2025-2</option>
            <option value="2025-1">2025-1</option>
          </select>
        </div>


        {/* 리뷰 내용 */}
        <textarea
          placeholder="수업은 어땠나요? 평가를 남겨주세요."
          value={content}
          onChange={(e)=> setContent(e.target.value)}
          style={{
            width: "100%",
            height: 120,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #DDD",
            resize: "none",
            marginBottom: 12
          }}
        />

        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 8,
            background: "#0064FF",
            color: "white",
            border: "none",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          {editing ? "수정하기" : "작성하기"}
        </button>
      </div>
    </div>
  );
}
