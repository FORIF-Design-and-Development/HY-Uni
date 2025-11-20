// server/src/controllers/campus/seats.controller.ts
import { Request, Response } from 'express';
import { seatsService } from '../../services/campus/seats/seats.service';

export class SeatsController {
    
     // GET: /api/seats
     
    async getLibrarySeats(req: Request, res: Response) {
        try {
            const seatsData = await seatsService.getAllLibrarySeats();
            
            res.json({
                data: seatsData,
                error: null,
                meta: null
            });

        } catch (error) {
            console.error('[API] 도서관 좌석 정보 조회 오류:', error);
            res.status(500).json({
                data: null,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to retrieve library seats information"
                },
                meta: null
            });
        }
    }
}

export const seatsController = new SeatsController();