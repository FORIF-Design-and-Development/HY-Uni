import { LibrarySeatsWidget } from '../components/campus/LibrarySeatsWidget';

export const Dashboard = () => {
  return (
    <div className="p-[20px_30px] font-['Pretendard',system-ui,-apple-system,BlinkMacSystemFont] bg-gray-100 min-h-screen">
      <div className="bg-[#0E4A84] text-white p-[14px_18px] rounded-xl mb-5 shadow-md">
        <div className="text-sm opacity-80">HYU Dashboard</div>
        <div className="text-xl font-bold">대시보드</div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-5">
        <LibrarySeatsWidget />
      </div>
    </div>
  );
};