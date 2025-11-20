import { useEffect, useState } from 'react';
import {
    calculateAvailabilityRate,
    fetchLibrarySeats,
    type LibrarySeatsResponse,
    type SeatRoom,
} from '../../api/campus/seats.api';

export const LibrarySeatsWidget = () => {
  const [seatsData, setSeatsData] = useState<LibrarySeatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadSeatsData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchLibrarySeats();
      setSeatsData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('좌석 정보를 불러오는데 실패했습니다.');
      console.error('[Widget] 좌석 조회 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSeatsData();
  }, []);

  const renderProgressBar = (room: SeatRoom) => {
    const availabilityRate = calculateAvailabilityRate(
      room.available,
      room.total
    );
    const occupiedRate = 100 - availabilityRate;

    // 가용률에 따른 색상
    const getColor = () => {
      if (availabilityRate >= 50) return '#0E4A84'; // 파란색 (여유)
      if (availabilityRate >= 20) return '#F59E0B'; // 주황색 (보통)
      return '#EF4444'; // 빨간색 (혼잡)
    };

    const barColor = getColor();

    return (
      <div className="relative pt-8 pb-1">
        {/* 상단 라벨: 잔여석 + 화살표 */}
        <div 
          className="absolute top-0 flex flex-col items-center"
          style={{ 
            left: `${occupiedRate}%`,
            transform: 'translateX(-50%)'
          }}
        >
          {/* 잔여석 수 */}
          <div 
            className="text-sm font-bold mb-1 whitespace-nowrap"
            style={{ color: barColor }}
          >
            잔여석 {room.available}
          </div>
          {/* 아래 화살표 */}
          <div 
            className="w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `8px solid ${barColor}`,
              marginTop: '-2px'
            }}
          />
        </div>

        {/* 프로그레스 바 */}
        <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden relative">
          <div 
            className="h-full transition-all duration-500 ease-out"
            style={{ 
              width: `${occupiedRate}%`,
              backgroundColor: barColor
            }}
          />
        </div>

        {/* 하단: 전체석 수 */}
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-500">
            전체석 {room.total}
          </span>
        </div>
      </div>
    );
  };

  const renderSeatCard = (room: SeatRoom, index: number) => {
    const availabilityRate = calculateAvailabilityRate(
      room.available,
      room.total
    );

    const getStatusText = (): string => {
      if (availabilityRate >= 50) return '여유';
      if (availabilityRate >= 20) return '보통';
      return '혼잡';
    };

    const getStatusColor = (): string => {
      if (availabilityRate >= 50) return 'bg-[#0E4A84]';
      if (availabilityRate >= 20) return 'bg-orange-500';
      return 'bg-red-500';
    };

    return (
      <div
        key={index}
        className="p-4 bg-gray-50 rounded-xl border border-gray-200 mb-3 hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-bold text-[#0E4A84]">
            {room.name}
          </div>
          <div className={`px-2.5 py-1 rounded-full ${getStatusColor()} text-white text-[11px] font-semibold`}>
            {getStatusText()}
          </div>
        </div>

        {renderProgressBar(room)}

        {room.waiting > 0 && (
          <div className="mt-2 text-[11px] text-gray-500">
            대기 {room.waiting}명
          </div>
        )}
      </div>
    );
  };

  const formatLastUpdated = (): string => {
    if (!lastUpdated) return '';
    const hours = String(lastUpdated.getHours()).padStart(2, '0');
    const minutes = String(lastUpdated.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (isLoading && !seatsData) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="text-center text-gray-500 text-sm">
          좌석 정보를 불러오는 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="text-center text-red-500 text-sm mb-3">
          {error}
        </div>
        <button
          onClick={loadSeatsData}
          className="w-full px-3 py-2 rounded-lg border-none bg-[#0E4A84] text-white text-[13px] cursor-pointer hover:bg-[#0d3d6f] transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm font-['Pretendard',system-ui,-apple-system,BlinkMacSystemFont]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-bold text-[#0E4A84] mb-1">
            📚 도서관 좌석 현황
          </div>
          <div className="text-xs text-gray-500">
            {lastUpdated && `마지막 업데이트: ${formatLastUpdated()}`}
          </div>
        </div>

        <button
          onClick={loadSeatsData}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg border-none text-xs transition-all ${
            isLoading 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-[#0E4A84] text-white cursor-pointer hover:bg-[#0d3d6f]'
          }`}
        >
          🔄 {isLoading ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      {seatsData && seatsData.rooms.length > 0 ? (
        seatsData.rooms.map((room: SeatRoom, index: number) => 
          renderSeatCard(room, index)
        )
      ) : (
        <div className="text-center text-gray-500 text-sm py-5">
          좌석 정보가 없습니다.
        </div>
      )}

      {seatsData && seatsData.rooms.length > 0 && (
        <div className="mt-3 p-3 bg-[#0E4A84] rounded-lg text-white text-xs flex justify-between items-center">
          <span>전체 열람실</span>
          <span className="font-semibold">
            {seatsData.rooms.reduce(
              (sum: number, room: SeatRoom) => sum + room.available, 
              0
            )}석 이용 가능
          </span>
        </div>
      )}
    </div>
  );
};