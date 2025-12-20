import { MealTime } from "../../api/campus/cafeteria.api";

interface MealTimeFilterProps {
  selectedMealTime: MealTime | "all";
  onMealTimeChange: (mealTime: MealTime | "all") => void;
}

export function MealTimeFilter({
  selectedMealTime,
  onMealTimeChange,
}: MealTimeFilterProps) {
  const mealTimes: Array<{
    value: MealTime | "all";
    label: string;
    icon: string;
  }> = [
    { value: "all", label: "전체", icon: "🍽️" },
    { value: "breakfast", label: "조식", icon: "🌅" },
    { value: "lunch", label: "중식", icon: "☀️" },
    { value: "dinner", label: "석식", icon: "🌙" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        marginBottom: 24,
        flexWrap: "wrap",
      }}
    >
      {mealTimes.map((mealTime) => {
        const isActive = selectedMealTime === mealTime.value;
        return (
          <button
            key={mealTime.value}
            onClick={() => onMealTimeChange(mealTime.value)}
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              border: isActive ? "none" : "1px solid #ECEFF1",
              backgroundColor: isActive ? "#0E4A84" : "#ffffff",
              color: isActive ? "#ffffff" : "#0E4A84",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              fontWeight: isActive ? 700 : 600,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "#F7F9FA";
                e.currentTarget.style.borderColor = "#0E4A84";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.borderColor = "#ECEFF1";
              }
            }}
          >
            <span style={{ fontSize: 16 }}>{mealTime.icon}</span>
            <span>{mealTime.label}</span>
          </button>
        );
      })}
    </div>
  );
}
