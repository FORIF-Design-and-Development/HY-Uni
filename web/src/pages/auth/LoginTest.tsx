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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            HY <span className="text-[#016ABF]">UNI</span>
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            한양대생을 위한 스마트한 캠퍼스 라이프
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#016ABF] focus:border-transparent transition-all sm:text-sm"
                placeholder="example@hanyang.ac.kr"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#016ABF] focus:border-transparent transition-all sm:text-sm"
                placeholder="비밀번호를 입력하세요"
                value={form.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/test/find-email")}
                className="font-medium text-gray-500 hover:text-gray-900"
              >
                이메일 찾기
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => navigate("/test/reset-password")}
                className="font-medium text-gray-500 hover:text-gray-900"
              >
                비밀번호 재설정
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#016ABF] hover:bg-[#005599] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#016ABF] transition-all active:scale-[0.98]"
          >
            로그인
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            아직 계정이 없으신가요?{' '}
            <button
              onClick={() => navigate("/register")}
              className="font-bold text-[#016ABF] hover:text-[#005599] transition-colors"
            >
              회원가입하기
            </button>
          </p>
        </div>

        {/* Dev Tools (Can be removed in production) */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-center text-gray-300 mb-3 uppercase tracking-wider font-semibold">Dev Links</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate("/timetable")} className="text-xs text-gray-400 hover:text-gray-600 underline">
              시간표 바로가기
            </button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg overflow-x-auto text-xs">
              <p className="font-bold text-gray-700 mb-2">Login Success Debug:</p>
              {departmentLabel && <p className="mb-1">Department: {departmentLabel}</p>}
              <pre className="text-gray-500">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}