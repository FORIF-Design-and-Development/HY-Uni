import { useState } from "react";
import { findEmail } from "../../api/auth/auth.api";

export default function FindEmailTest() {
  const [form, setForm] = useState({
    name: "",
    birth_date: "",
  });

  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    setError("");
    setResult(null);

    if (!form.name || !form.birth_date) {
      setError("이름과 생년월일을 모두 입력하세요.");
      return;
    }

    try {
      const res = await findEmail(form.name, form.birth_date);
      setResult(res.email);
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
      <h2>이메일 찾기 테스트</h2>

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

      <button onClick={handleSubmit} style={{ marginTop: 10 }}>
        이메일 찾기 API 호출
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 10 }}>
          <h4>마스킹된 이메일:</h4>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}