import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { reviewAPI } from "../../api/timetable/review.api";
import { useTimetableStore } from "../../store/timetable.store";


interface ReviewPageType {
  review_id: number;
  course_id: number;
  rating: number;
  content: string;
  assignment: string;
  group_project: string;
  semester: string;
}

export default function ReviewPage() {
  const { courseId } = useParams();

  if (!courseId) {
    console.error("Invalid route: courseId missing");
    return null;
  }

  const [reviews, setReviews] = useState<ReviewPageType[]>([]);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [semester, setSemester] = useState("2025-2");
  const [assignment, setAssignment] = useState("normal");
  const [groupProject, setGroupProject] = useState("normal");
  const courses = useTimetableStore(state => state.courses);
  const course = courses.find(c => c.course_id === Number(courseId));


  const load = async () => {
    if (!courseId) return;

    const res = await reviewAPI.getReviews(Number(courseId));
    setReviews(res.data.data || []);
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

    await reviewAPI.createReview({
      course_id: Number(courseId),
      rating,
      content,
      assignment,
      group_project: groupProject,
      semester,
    });

    alert("작성 완료!");
    setContent("");
    setRating(5);
    setAssignment("normal");
    setGroupProject("normal");
    load();
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
          placeholder="수업은 어땠나요? 도움이 되는 평가를 남겨주세요."
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
          작성하기
        </button>
      </div>
    </div>
  );
}
