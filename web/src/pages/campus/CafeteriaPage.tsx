import { useEffect } from "react";
import { MealTime } from "../../api/campus/cafeteria.api";
import { CafeteriaCard } from "../../components/campus/CafeteriaCard";
import { MealTimeFilter } from "../../components/campus/MealTimeFilter";
import { useCafeteriaStore } from "../../store/cafeteria.store";

export default function CafeteriaPage() {
  const {
    todayMenus,
    selectedMealTime,
    isLoading,
    error,
    fetchTodayMenus,
    setSelectedMealTime,
    clearError,
  } = useCafeteriaStore();

  useEffect(() => {
    if (!todayMenus) {
      fetchTodayMenus();
    }
  }, []);

  const handleMealTimeChange = (mealTime: MealTime | "all") => {
    setSelectedMealTime(mealTime);
  };

  if (isLoading) {
    return (
      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            fontSize: 16,
            color: "#898C8E",
          }}
        >
          메뉴를 불러오는 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "#d32f2f", marginBottom: 20 }}>{error}</p>
          <button
            onClick={() => {
              clearError();
              fetchTodayMenus();
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#0E4A84",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          backgroundColor: "#0E4A84",
          color: "#ffffff",
          padding: "20px 24px",
          borderRadius: 12,
          marginBottom: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
          HYU Cafeteria
        </div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>🍽️ 오늘의 학식</div>
        {todayMenus && (
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
            {todayMenus.date}
          </div>
        )}
      </div>

      <MealTimeFilter
        selectedMealTime={selectedMealTime}
        onMealTimeChange={handleMealTimeChange}
      />

      <div>
        {todayMenus?.cafeterias.map((cafeteria) => (
          <CafeteriaCard
            key={cafeteria.cafeteria_id}
            cafeteria={cafeteria}
            selectedMealTime={selectedMealTime}
          />
        ))}
      </div>

      {(!todayMenus || todayMenus.cafeterias.length === 0) && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#898C8E",
          }}
        >
          <p>오늘의 메뉴 정보가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
