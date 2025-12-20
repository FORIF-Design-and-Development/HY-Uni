import { useEffect, useMemo, useState } from "react";
import { register, UserStatus } from "../../api/auth/auth.api";
import { getDepartments, Department } from "../../api/auth/department.api";

/* ===============================
   색상 정의 (지정된 색상 유지 및 미세 조정)
================================ */
const colors = {
  primary: "#0E4A84",
  title: "#1D2475",
  text: "#3F3D42",
  subText: "#898C8E",
  border: "#D1D1D4", // 조금 더 연하게 변경
  white: "#FFFFFF",
  black: "#000000",
  error: "#E53E3E",
  success: "#2F855A",
};

/* ===============================
   스타일 객체
================================ */
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#F8F9FA", // 배경을 약간 밝은 회색으로 하여 카드를 강조
    display: "flex",
    justifyContent: "center",
    paddingTop: 40,
    fontFamily: "'Pretendard', sans-serif",
  },
  card: {
    width: 380,
    padding: "32px 24px",
    borderRadius: 12,
    backgroundColor: colors.white,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)", // 은은한 그림자 추가
    height: "fit-content",
  },
  title: {
    marginBottom: 28,
    fontSize: 22,
    fontWeight: 700,
    color: colors.title,
    textAlign: "center" as const,
    letterSpacing: "-0.5px",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12, // 간격을 조금 더 넓힘
  },
  input: {
    height: 44,
    padding: "0 14px",
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    fontSize: 14,
    color: colors.text,
    outline: "none",
    transition: "border-color 0.2s",
  },
  select: {
    height: 44,
    padding: "0 10px",
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
    cursor: "pointer",
  },
  button: {
    marginTop: 18,
    height: 48,
    borderRadius: 8,
    border: "none",
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "filter 0.2s",
  },
  errorBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#FFF5F5",
    border: `1px solid ${colors.error}`,
    color: colors.error,
    fontSize: 13,
  },
  resultBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#F0FFF4",
    border: `1px solid ${colors.success}`,
    fontSize: 13,
    color: colors.success,
  },
  pre: {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
    marginTop: 8,
    fontSize: 12,
  }
};

export default function RegisterTest() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    birth_date: "",
    student_number: "",
    phone_number: "",
    nickname: "",
    grade: "",
    status: "active" as UserStatus,
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const collegeOptions = useMemo(() => {
    const set = new Set<string>();
    departments.forEach((d) => set.add(d.college_name));
    return Array.from(set);
  }, [departments]);

  const departmentOptions = useMemo(() => {
    if (!selectedCollege) return [];
    return departments.filter((d) => d.college_name === selectedCollege);
  }, [departments, selectedCollege]);

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() => setError("학과 목록을 불러오는데 실패했습니다."));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setError("");
    setResult(null);

    if (!selectedDeptId) {
      setError("소속대학과 학과/전공을 선택해 주세요.");
      return;
    }

    try {
      const res = await register({
        ...form,
        department_id: selectedDeptId,
        grade: Number(form.grade),
      });
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.message || "회원가입 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>회원가입</h2>

        <div style={styles.form}>
          <input style={styles.input} name="email" placeholder="이메일 (email)" value={form.email} onChange={handleChange} />
          <input style={styles.input} name="password" type="password" placeholder="비밀번호 (password)" value={form.password} onChange={handleChange} />
          <input style={styles.input} name="name" placeholder="이름 (name)" value={form.name} onChange={handleChange} />
          <input style={styles.input} name="birth_date" placeholder="생년월일 (YYYY-MM-DD)" value={form.birth_date} onChange={handleChange} />
          <input style={styles.input} name="student_number" placeholder="학번 (student_number)" value={form.student_number} onChange={handleChange} />
          <input style={styles.input} name="phone_number" placeholder="전화번호 (phone_number)" value={form.phone_number} onChange={handleChange} />
          <input style={styles.input} name="nickname" placeholder="닉네임 (nickname)" value={form.nickname} onChange={handleChange} />

          <select
            style={styles.select}
            value={selectedCollege}
            onChange={(e) => {
              setSelectedCollege(e.target.value);
              setSelectedDeptId(null);
            }}
          >
            <option value="">소속대학 선택</option>
            {collegeOptions.map((college) => (
              <option key={college} value={college}>{college}</option>
            ))}
          </select>

          <select
            style={{...styles.select, opacity: !selectedCollege ? 0.6 : 1}}
            value={selectedDeptId ?? ""}
            onChange={(e) => setSelectedDeptId(e.target.value ? Number(e.target.value) : null)}
            disabled={!selectedCollege}
          >
            <option value="">학과/전공 선택</option>
            {departmentOptions.map((dept) => (
              <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "8px" }}>
            <select
              style={{ ...styles.select, flex: 1 }}
              name="grade"
              value={form.grade}
              onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))}
            >
              <option value="">학년</option>
              {[1, 2, 3, 4].map(g => <option key={g} value={g}>{g}학년</option>)}
            </select>

            <select
              style={{ ...styles.select, flex: 1 }}
              name="status"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as UserStatus }))}
            >
              <option value="active">재학</option>
              <option value="inactive">휴학</option>
              <option value="graduated">졸업</option>
              <option value="leave">자퇴</option>
            </select>
          </div>

          <button 
            style={styles.button} 
            onClick={handleSubmit}
            onMouseOver={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseOut={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          >
            가입 완료
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <strong>알림</strong>
            <div style={{ marginTop: 4 }}>{error}</div>
          </div>
        )}

        {result && (
          <div style={styles.resultBox}>
            <strong>성공</strong>
            <pre style={styles.pre}>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}