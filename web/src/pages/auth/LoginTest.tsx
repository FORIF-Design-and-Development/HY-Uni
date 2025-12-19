import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthResponse, login, LoginPayload } from "../../api/auth/auth.api";
import { useAuthStore } from "../../store/auth.store";

export default function LoginTest() {
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginPayload>({
    email: "",
    password: "",
  });

  const [result, setResult] = useState<AuthResponse | null>(null);
  const [error, setError] = useState<string>("");

  const { setAuth, clearAuth } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    setError("");
    setResult(null);

    if (!form.email || !form.password) {
      setError("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    try {
      const res = await login(form);

      localStorage.setItem('accessToken', res.accessToken); // 임시 추가

      setAuth({
        user: res.user,
        department: res.department ?? null,
        accessToken: res.accessToken,
      });

      setResult(res);

        // ✅ 로그인 성공 시 dashboard로 이동
      navigate('/dashboard');
    } catch (err: any) {
      clearAuth();

      localStorage.removeItem('accessToken'); // 임시 추가

      if (err.response) {
        setError(`Error ${err.response.status}: ${err.response.data.message}`);
      } else {
        setError("Unknown error occurred");
      }
    }
  };

  const departmentLabel =
    result?.department
      ? `${result.department.college_name} ${result.department.department_name}`
      : "";

  return (
    <div style={{ padding: 20 }}>
      <h2>로그인 API 테스트</h2>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: 360, gap: 8 }}>
        <input
          name="email"
          placeholder="email"
          value={form.email}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="password"
          value={form.password}
          onChange={handleChange}
        />

        <button onClick={handleSubmit} style={{ marginTop: 10 }}>
          Login API 호출
        </button>
        <button onClick={() => navigate("/test/find-email")} style={{ marginTop: 20 }}>
          이메일 찾기 테스트
        </button>
        <button onClick={() => navigate("/test/reset-password")}>
          비밀번호 재설정 테스트
        </button>
      </div>
      
      <button onClick={() => navigate("/timetable")} style={{ marginTop: 10 }}>
        👉 시간표 페이지로 이동
      </button>

      {error && (
        <div style={{ marginTop: 20, color: "red" }}>
          <h4>에러 발생</h4>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20 }}>
          <h4>성공 응답</h4>

          {departmentLabel && <p>소속: {departmentLabel}</p>}

          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}