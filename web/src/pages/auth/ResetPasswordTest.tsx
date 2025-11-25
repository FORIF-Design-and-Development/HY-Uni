import { useState } from "react";
import { resetPassword } from "../../api/auth/auth.api";

export default function ResetPasswordTest() {
  const [form, setForm] = useState({
    name: "",
    birth_date: "",
    email: "",
  });

  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    setError("");
    setMessage("");

    if (!form.name || !form.birth_date || !form.email) {
      setError("모든 필드를 입력하세요.");
      return;
    }

    try {
      const res = await resetPassword(form.name, form.birth_date, form.email);
      setMessage(res.message);
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
      <h2>비밀번호 재설정 테스트</h2>

      <input
        name="name"
        placeholder="이름"
        value={form.name}
        onChange={handleChange}
      />

      <input
        name="birth_date"
        placeholder="생년월일 (YYYY-MM-DD)"
        value={form.birth_date}
        onChange={handleChange}
      />

      <input
        name="email"
        placeholder="가입 이메일"
        value={form.email}
        onChange={handleChange}
      />

      <button onClick={handleSubmit} style={{ marginTop: 10 }}>
        비밀번호 재설정 API 호출
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && (
        <div style={{ marginTop: 10 }}>
          <h4>성공 메시지:</h4>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}