import React from "react";
import { useTimetableStore } from "../../store/timetable.store";

export default function TimetableHeader() {
  const { sets, selectedSet, setSelectedSet, createSet, deleteSet, saveTimetable } =
    useTimetableStore();

  const currentSet =
    sets.find((s) => s.set_id === selectedSet)?.name || "시간표 미선택";

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
          onChange={(e) => setSelectedSet(Number(e.target.value))}
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
            <option key={s.set_id} value={s.set_id}>
              {s.name}
            </option>
          ))}
        </select>

        <button
          onClick={createSet}
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
          onClick={deleteSet}
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
