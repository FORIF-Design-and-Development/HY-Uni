import { useTimetableStore } from "../../store/timetable.store";

export default function TimetableHeader() {
  const {
    sets,
    selectedSet,
    setSelectedSet,
    createSetWithPrompt,
    deleteSet,
    saveTimetable,
    loadTimetable,
  } = useTimetableStore();

  const currentSet =
    sets.find((s) => s.timetable_list_id === selectedSet)?.timetable_name ||
    "시간표 미선택";

  return (
    <div
      style={{
        backgroundColor: "#0E4A84",
        color: "#ffffff",
        padding: "14px 18px",
        borderRadius: 12,
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <div>
        <div style={{ fontSize: 14, opacity: 0.8 }}>HYU Timetable</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{currentSet}</div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <select
          value={selectedSet || ""}
          onChange={async (e) => {
            // ✅ [추가] 선택한 세트 id
            const id = Number(e.target.value);
            if (!id) return;

            // ✅ [추가] store 상태 변경
            setSelectedSet(id);

            // ✅ [추가] 세트 변경 시 화면에 반영되도록 실제 시간표 로드
            await loadTimetable(id);
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ffffff",
            background: "#0E4A84",
            color: "#ffffff",
            fontSize: 13,
          }}
        >
          {sets.map((s) => (
            <option key={s.timetable_list_id} value={s.timetable_list_id}>
              {s.timetable_name}
            </option>
          ))}
        </select>

        <button
          onClick={createSetWithPrompt}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "none",
            backgroundColor: "#ffffff",
            color: "#0E4A84",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ➕ 세트
        </button>

        <button
          onClick={() => {
            if (!selectedSet) return;

            const setInfo = sets.find((s) => s.timetable_list_id === selectedSet);
            const name = setInfo?.timetable_name || "선택된 시간표";

            if (!window.confirm(`[${name}]을(를) 삭제하시겠습니까?`)) return;
            deleteSet();
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ffffff",
            backgroundColor: "transparent",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          🗑 삭제
        </button>

        <button
          onClick={saveTimetable}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            backgroundColor: "#ffffff",
            color: "#0E4A84",
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          💾 저장
        </button>
      </div>
    </div>
  );
}
