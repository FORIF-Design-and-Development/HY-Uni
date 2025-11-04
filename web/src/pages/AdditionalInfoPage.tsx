// ⭐️ 신규 회원 추가 정보 입력 페이지
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDepartments,
  getTags,
  updateUserDetails,
  Department,
  Tag,
} from "../api/apiClient";
import { useAuth } from "../App";
import "./AdditionalInfoPage.css"; // CSS (아래 생성)

function AdditionalInfoPage() {
  const { setUser } = useAuth(); // 사용자 정보 업데이트용
  const navigate = useNavigate();

  // 1. DB에서 불러올 데이터
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // 2. 사용자가 선택한 데이터
  const [selectedDept, setSelectedDept] = useState<number | "">("");
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. 페이지 로드 시 학과 및 태그 목록 불러오기
  useEffect(() => {
    Promise.all([getDepartments(), getTags()])
      .then(([deptData, tagData]) => {
        setDepartments(deptData);
        setTags(tagData);
      })
      .catch(() => setError("데이터를 불러오는 데 실패했습니다."))
      .finally(() => setLoading(false));
  }, []);

  // 4. 태그 선택 핸들러 (Set 자료구조 사용)
  const handleTagClick = (tagId: number) => {
    setSelectedTags((prevTags) => {
      const newTags = new Set(prevTags);
      if (newTags.has(tagId)) {
        newTags.delete(tagId); // 이미 있으면 제거 (토글)
      } else {
        newTags.add(tagId); // 없으면 추가
      }
      return newTags;
    });
  };

  // 5. 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (selectedTags.size < 3) {
      setError("관심 태그를 3개 이상 선택해주세요.");
      return;
    }
    if (!selectedDept) {
      setError("학과를 선택해주세요.");
      return;
    }

    try {
      const updatedUser = await updateUserDetails({
        departmentId: selectedDept,
        tagIds: Array.from(selectedTags), // Set을 Array로 변환
      });

      // 전역 사용자 정보 업데이트
      setUser(updatedUser);
      // 메인 페이지로 이동 (App.tsx의 라우팅 로직이 department_id를 인지)
      navigate("/");
    } catch (err) {
      setError("정보 업데이트에 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (loading) return <p>회원가입 정보를 불러오는 중...</p>;

  return (
    <div className="additional-info-container">
      <h2>🎉 환영합니다! 마지막 단계입니다.</h2>
      <p>원활한 커뮤니티 활동을 위해 학과와 관심 태그를 선택해주세요.</p>

      <form onSubmit={handleSubmit}>
        {/* --- 1. 학과 선택 (Select) --- */}
        <fieldset>
          <legend>
            학과 선택 <span className="required">*</span>
          </legend>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(Number(e.target.value))}
            required
          >
            <option value="" disabled>
              -- 소속 학과를 선택하세요 --
            </option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </fieldset>

        {/* --- 2. 관심 태그 선택 (Checkboxes) --- */}
        <fieldset>
          <legend>
            관심 태그 (3개 이상) <span className="required">*</span>
          </legend>
          <div className="tag-list">
            {tags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                className={`tag-btn ${
                  selectedTags.has(tag.id) ? "selected" : ""
                }`}
                onClick={() => handleTagClick(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
          <small>{selectedTags.size}개 선택됨</small>
        </fieldset>

        {error && <p className="error-message">{error}</p>}

        <button
          type="submit"
          className="submit-btn"
          disabled={selectedTags.size < 3 || !selectedDept}
        >
          가입 완료
        </button>
      </form>
    </div>
  );
}

export default AdditionalInfoPage;
