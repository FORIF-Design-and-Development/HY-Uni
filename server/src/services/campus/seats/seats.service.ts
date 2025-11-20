import axios from 'axios';

interface SeatRoom {
    name: string;
    total: number;
    occupied: number;
    waiting: number;
    available: number;
}

interface LibrarySeatsResponse {
    success: boolean;
    message: string;
    totalCount: number;
    rooms: SeatRoom[];
}

class SeatsService {
    private readonly BASE_URL = 'https://lib.hanyang.ac.kr/pyxis-api/1/seat-rooms';
    private readonly ROOM_IDS = [3, 16]; // 제1열람실, HOLMZ 열람석

    private async getLibrarySeatsById(roomId: number): Promise<any> {
        try {
            const response = await axios.get(this.BASE_URL, {
                params: {
                    smufMethodCode: 'PC',
                    roomTypeId: roomId,
                    branchGroupId: '1'
                },
                headers: {
                    'Accept': 'application/json',
                    'Referer': 'https://lib.hanyang.ac.kr/',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });

            return response.data;
        } catch (error) {
            console.error(`[SeatsService] roomId ${roomId} 조회 실패:`, error);
            return null;
        }
    }

    // 모든 열람실 좌석 정보 가져오기
    async getAllLibrarySeats(): Promise<LibrarySeatsResponse> {
        try {
            const simplifiedSeatsData: SeatRoom[] = [];

            for (const roomId of this.ROOM_IDS) {
                console.log(`[SeatsService] roomId ${roomId} 요청 중...`);
                const data = await this.getLibrarySeatsById(roomId);

                if (data && data.success && data.data.list.length > 0) {
                    // 필요한 정보만 추출
                    data.data.list.forEach((room: any) => {
                        simplifiedSeatsData.push({
                            name: room.name,
                            total: room.seats.total,
                            occupied: room.seats.occupied,
                            waiting: room.seats.waiting,
                            available: room.seats.available
                        });
                    });
                }
            }

            return {
                success: true,
                message: "열람실 정보 조회 완료",
                totalCount: simplifiedSeatsData.length,
                rooms: simplifiedSeatsData
            };

        } catch (error) {
            console.error('[SeatsService] 전체 좌석 조회 실패:', error);
            throw new Error('Failed to fetch library seats data');
        }
    }
}

export const seatsService = new SeatsService();