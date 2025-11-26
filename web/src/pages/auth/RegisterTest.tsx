import { useEffect, useMemo, useState } from "react";
import { register, UserStatus } from "../../api/auth/auth.api";
import { getDepartments, Department } from "../../api//auth/department.api";

export default function RegisterTest() {
  const [form, setForm] = useState<{
  email: string;
  password: string;
  name: string;
  birth_date: string;
  student_number: string;
  phone_number: string;
  nickname: string;
  grade: string;
  status: UserStatus;
}>({
  email: "",
  password: "",
  name: "",
  birth_date: "",
  student_number: "",
  phone_number: "",
  nickname: "",
  grade: "",
  status: "active",
});

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  // 소속대학 목록 (중복 제거)
  const collegeOptions = useMemo(() => {
    const set = new Set<string>();
    departments.forEach((d) => set.add(d.college_name));
    return Array.from(set);
  }, [departments]);

  // 선택된 소속대학의 학과/전공 목록
  const departmentOptions = useMemo(() => {
    if (!selectedCollege) return [];
    return departments.filter((d) => d.college_name === selectedCollege);
  }, [departments, selectedCollege]);

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() => {
        setError("학과 목록을 불러오는데 실패했습니다.");
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
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
        status: form.status,
      });
      setResult(res);
    } catch (err: any) {
      if (err.response) {
        setError(`Error ${err.response.status}: ${err.response.data.message}`);
      } else {
        setError("Unknown error occurred");
      }
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>회원가입 API 테스트</h2>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: 360, gap: 8 }}>
        <input name="email" placeholder="email" value={form.email} onChange={handleChange} />
        <input name="password" type="password" placeholder="password" value={form.password} onChange={handleChange} />
        <input name="name" placeholder="name" value={form.name} onChange={handleChange} />
        <input
          name="birth_date"
          placeholder="birth_date(YYYY-MM-DD)"
          value={form.birth_date}
          onChange={handleChange}
        />
        <input
          name="student_number"
          placeholder="student_number"
          value={form.student_number}
          onChange={handleChange}
        />
        <input
          name="phone_number"
          placeholder="phone_number"
          value={form.phone_number}
          onChange={handleChange}
        />
        <input name="nickname" placeholder="nickname" value={form.nickname} onChange={handleChange} />

        {/* 소속대학 선택 */}
        <select
          value={selectedCollege}
          onChange={(e) => {
            setSelectedCollege(e.target.value);
            setSelectedDeptId(null);
          }}
        >
          <option value="">소속대학 선택</option>
          {collegeOptions.map((college) => (
            <option key={college} value={college}>
              {college}
            </option>
          ))}
        </select>

        {/* 학과/전공 선택 */}
        <select
          value={selectedDeptId ?? ""}
          onChange={(e) => setSelectedDeptId(e.target.value ? Number(e.target.value) : null)}
          disabled={!selectedCollege}
        >
          <option value="">학과/전공 선택</option>
          {departmentOptions.map((dept) => (
            <option key={dept.department_id} value={dept.department_id}>
              {dept.department_name}
            </option>
          ))}
        </select>

        <select
          name="grade"
          value={form.grade}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              grade: e.target.value,
            }))
          }
        >
          <option value="">학년 선택</option>
          <option value="1">1학년</option>
          <option value="2">2학년</option>
          <option value="3">3학년</option>
          <option value="4">4학년</option>
        </select>

        <select
          name="status"
          value={form.status}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              status: e.target.value as UserStatus,
            }))
          }
        >
          <option value="active">재학</option>
          <option value="inactive">휴학</option>
          <option value="graduated">졸업</option>
          <option value="leave">자퇴</option>
        </select>

        <button onClick={handleSubmit} style={{ marginTop: 10 }}>
          Register API 호출
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 20, color: "red" }}>
          <h4>에러 발생</h4>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20 }}>
          <h4>성공 응답</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}