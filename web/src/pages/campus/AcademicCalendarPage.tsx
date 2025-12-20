import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

interface CalendarEvent {
  calendar_id: number;
  event_title: string;
  startDate: string;
  endDate: string;
}

export default function AcademicCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // 현재 연도 (기본값: 현재 시스템 날짜 기준)
  const [currentYear, setCurrentYear] = useState<number>(
    new Date().getFullYear()
  );
  const [loading, setLoading] = useState<boolean>(true);

  // 1. API 데이터 가져오기
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/api/academic_calendar"
        );

        if (Array.isArray(response.data)) {
          setEvents(response.data);
        } else if (response.data && Array.isArray(response.data.data)) {
          setEvents(response.data.data);
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.error("학사일정을 불러오지 못했습니다.", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // 2. 월별 데이터 그룹화 (기간 교차 로직 적용)
  const monthlyData = useMemo(() => {
    const grouped: Record<number, CalendarEvent[]> = {};

    for (let month = 1; month <= 12; month++) {
      // 해당 월의 시작(1일)과 끝(말일) 계산
      const monthStart = new Date(currentYear, month - 1, 1, 0, 0, 0);
      const monthEnd = new Date(currentYear, month, 0, 23, 59, 59);

      // 해당 월에 "걸쳐있는" 일정 필터링
      const filteredEvents = events.filter((event) => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);

        return eventStart <= monthEnd && eventEnd >= monthStart;
      });

      grouped[month] = filteredEvents;
    }
    return grouped;
  }, [events, currentYear]);

  const handlePrevYear = () => setCurrentYear((prev) => prev - 1);
  const handleNextYear = () => setCurrentYear((prev) => prev + 1);

  // 3. 날짜 포맷팅 함수 (연도 포함)
  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const days = ["일", "월", "화", "수", "목", "금", "토"];

    // 연도가 다르면 연도까지 표시 (예: 2025.12.23)
    // 연도가 같으면 월/일만 표시 (예: 12.23)
    const format = (d: Date, showYear: boolean) => {
      const month = d.getMonth() + 1;
      const date = d.getDate();
      const day = days[d.getDay()];

      if (showYear) {
        return `${d.getFullYear()}.${month}.${date}(${day})`;
      }
      return `${month}/${date} (${day})`;
    };

    // 시작일과 종료일이 같은 경우 (하루짜리)
    if (s.toDateString() === e.toDateString()) {
      return format(s, false);
    }

    // 해가 바뀌는 일정인 경우 (예: 12월 ~ 1월) -> 연도 표시 강제
    if (s.getFullYear() !== e.getFullYear()) {
      return `${format(s, true)} ~ ${format(e, true)}`;
    }

    // 같은 해의 기간 일정
    return `${format(s, false)} ~ ${format(e, false)}`;
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        일정을 불러오는 중...
      </div>
    );

  return (
    <div className="max-w-xl mx-auto p-4 pb-20">
      <h1 className="text-xl font-bold text-[#016ABF] mb-6">
        한양대학교 학사 일정
      </h1>

      {/* 연도 네비게이션 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <button
          onClick={handlePrevYear}
          className="p-2 hover:bg-gray-100 hover:text-[#016ABF] rounded-full text-gray-400 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        {/* 브랜드 컬러 적용: #016ABF */}
        <span className="text-xl font-extrabold text-[#016ABF] select-none tracking-tight">
          {currentYear}년
        </span>
        <button
          onClick={handleNextYear}
          className="p-2 hover:bg-gray-100 hover:text-[#016ABF] rounded-full text-gray-400 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* 월별 리스트 */}
      <div className="space-y-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
          const monthEvents = monthlyData[month];
          if (monthEvents.length === 0) return null;

          return (
            <div
              key={month}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
            >
              {/* 월 헤더 배경: 브랜드 컬러 5% 투명도 */}
              <div className="bg-[#016ABF]/5 px-5 py-3 border-b border-[#016ABF]/10">
                <span className="text-lg font-bold text-[#016ABF]">
                  {month}월
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {monthEvents.map((event) => (
                  <div
                    key={event.calendar_id}
                    className="p-4 flex flex-col sm:flex-row gap-1 sm:gap-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* 날짜 표시 영역 */}
                    <div className="text-xs font-bold text-gray-600 min-w-[200px] flex items-center gap-2">
                      {/* 포인트 컬러(Orange) 적용: #FE7716 */}
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FE7716] block sm:hidden"></span>
                      {formatDateRange(event.startDate, event.endDate)}
                    </div>
                    {/* 일정 제목 */}
                    <div className="text-sm font-medium text-gray-800 leading-snug flex-1">
                      {event.event_title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* 일정 없음 표시 */}
        {Object.values(monthlyData).flat().length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
            {currentYear}년에는 등록된 학사 일정이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
