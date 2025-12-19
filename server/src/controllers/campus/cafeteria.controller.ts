import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';
import { cafeteriaCrawlerService } from '../../services/campus/cafeteria/crawler.service';
import { checkAndUpdateMission, logMissionAction } from '../../services/campus/hylion/hylion.service';

export class CafeteriaController {
  /**
   * GET /api/cafeterias
   * 식당 목록 조회
   */
  async getCafeteriaList(_req: Request, res: Response) {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT cafeteria_id, name, location, operating_hours FROM cafeteria'
      );

      return res.json({
        data: {
          cafeterias: rows.map((row) => ({
            cafeteria_id: row.cafeteria_id,
            cafeteria_name: row.name,
            location: row.location,
            operating_hours: row.operating_hours,
          })),
        },
        error: null,
        meta: null,
      });
    } catch (error) {
      console.error('[CafeteriaController] getCafeteriaList 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '식당 목록 조회 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * GET /api/cafeterias/:cafeteria_id
   * 식당 상세 조회
   */
  async getCafeteriaDetail(req: Request, res: Response) {
    try {
      const cafeteriaId = parseInt(req.params.cafeteria_id as string);
      if (isNaN(cafeteriaId)) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'INVALID_PARAMETER',
            message: '유효하지 않은 식당 ID입니다.',
          },
          meta: null,
        });
      }

      const [cafeteriaRows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM cafeteria WHERE cafeteria_id = ?',
        [cafeteriaId]
      );

      if (cafeteriaRows.length === 0) {
        return res.status(404).json({
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Cafeteria not found',
          },
          meta: null,
        });
      }

      const cafeteria = cafeteriaRows[0];

      if (!cafeteria) {
        return res.status(404).json({
            data: null,
            error: {
            code: 'NOT_FOUND',
            message: 'Cafeteria not found',
            },
            meta: null,
        });
        }

      const [statsRows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as review_count,
          COALESCE(AVG(rating), 0) as average_rating
         FROM cafeteria_review
         WHERE cafeteria_id = ?`,
        [cafeteriaId]
      );

      const stats = statsRows[0] as any;

      return res.json({
        data: {
          cafeteria_id: cafeteria.cafeteria_id,
          cafeteria_name: cafeteria.name,
          location: cafeteria.location,
          operating_hours: cafeteria.operating_hours,
          average_rating: parseFloat((stats.average_rating || 0).toFixed(1)),
          review_count: stats.review_count || 0,
        },
        error: null,
        meta: null,
      });
    } catch (error) {
      console.error('[CafeteriaController] getCafeteriaDetail 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '식당 상세 조회 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * GET /api/menus/today
   * 오늘의 학식 조회
   */
  async getTodayMenus(req: Request, res: Response) {
    try {
      const mealTime = req.query.meal_time as string | undefined;

      const crawlResult = await cafeteriaCrawlerService.getMenuData();

      const cafeterias = crawlResult.cafeterias.map((caf) => {
        const result: any = {
          cafeteria_id: caf.id,
          cafeteria_name: caf.name,
        };

        if (!mealTime || mealTime === 'breakfast') {
          result.breakfast = caf.meals.breakfast.map((menu) => ({
            description: menu.name,
            price: menu.price,
            image_url: menu.imageUrl || null,
          }));
        }

        if (!mealTime || mealTime === 'lunch') {
          result.lunch = caf.meals.lunch.map((menu) => ({
            description: menu.name,
            price: menu.price,
            image_url: menu.imageUrl || null,
          }));
        }

        if (!mealTime || mealTime === 'dinner') {
          result.dinner = caf.meals.dinner.map((menu) => ({
            description: menu.name,
            price: menu.price,
            image_url: menu.imageUrl || null,
          }));
        }

        return result;
      });

      return res.json({
        data: {
          date: crawlResult.menuDate || new Date().toISOString().split('T')[0],
          cafeterias,
        },
        error: null,
        meta: null,
      });
    } catch (error) {
      console.error('[CafeteriaController] getTodayMenus 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '오늘의 메뉴 조회 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * GET /api/cafeterias/:cafeteria_id/menus
   * 특정 식당 메뉴 조회
   */
  async getCafeteriaMenus(req: Request, res: Response) {
    try {
      const cafeteriaId = parseInt(req.params.cafeteria_id as string);
      const servedDate = (req.query.served_date as string) || new Date().toISOString().split('T')[0];
      const mealTime = req.query.meal_time as string | undefined;

      if (isNaN(cafeteriaId)) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'INVALID_PARAMETER',
            message: '유효하지 않은 식당 ID입니다.',
          },
          meta: null,
        });
      }

      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT menu_id, meal_time, description, price, image_url
         FROM menu
         WHERE cafeteria_id = ? AND served_date = ?
         ${mealTime ? 'AND meal_time = ?' : ''}
         ORDER BY meal_time, menu_id`,
        mealTime ? [cafeteriaId, servedDate, mealTime] : [cafeteriaId, servedDate]
      );

      const result: any = {
        served_date: servedDate,
        breakfast: [],
        lunch: [],
        dinner: [],
      };

      rows.forEach((row) => {
        const menu = {
          menu_id: row.menu_id,
          description: row.description,
          price: row.price,
          image_url: row.image_url,
        };

        if (row.meal_time === 'breakfast') {
          result.breakfast.push(menu);
        } else if (row.meal_time === 'lunch') {
          result.lunch.push(menu);
        } else if (row.meal_time === 'dinner') {
          result.dinner.push(menu);
        }
      });

      return res.json({
        data: result,
        error: null,
        meta: null,
      });
    } catch (error) {
      console.error('[CafeteriaController] getCafeteriaMenus 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '식당 메뉴 조회 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * GET /api/cafeterias/:cafeteria_id/reviews
   * 식당 리뷰 목록 조회
   */
  async getCafeteriaReviews(req: Request, res: Response) {
    try {
      const cafeteriaId = parseInt(req.params.cafeteria_id as string);
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '10');
      const sort = (req.query.sort as string) || 'recent';

      if (isNaN(cafeteriaId)) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'INVALID_PARAMETER',
            message: '유효하지 않은 식당 ID입니다.',
          },
          meta: null,
        });
      }

      let orderBy = 'r.created_at DESC';
      if (sort === 'rating_high') {
        orderBy = 'r.rating DESC, r.created_at DESC';
      } else if (sort === 'rating_low') {
        orderBy = 'r.rating ASC, r.created_at DESC';
      }

      const offset = (page - 1) * limit;

      const [reviews] = await pool.query<RowDataPacket[]>(
        `SELECT 
          r.review_id,
          r.user_id,
          u.nickname,
          r.cafeteria_id,
          r.rating,
          r.comment,
          r.image_url,
          r.created_at
         FROM cafeteria_review r
         JOIN user u ON r.user_id = u.user_id
         WHERE r.cafeteria_id = ?
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
        [cafeteriaId, limit, offset]
      );

      const [countRows] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM cafeteria_review WHERE cafeteria_id = ?',
        [cafeteriaId]
      );

      const totalCount = (countRows[0] as any).total as number;
      const totalPages = Math.ceil(totalCount / limit);

      const [avgRows] = await pool.query<RowDataPacket[]>(
        'SELECT COALESCE(AVG(rating), 0) as average_rating FROM cafeteria_review WHERE cafeteria_id = ?',
        [cafeteriaId]
      );

      return res.json({
        data: {
          reviews: reviews.map((r) => ({
            review_id: r.review_id,
            user_id: r.user_id,
            nickname: r.nickname,
            cafeteria_id: r.cafeteria_id,
            rating: r.rating,
            comment: r.comment,
            image_url: r.image_url,
            created_at: r.created_at,
          })),
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_count: totalCount,
            limit,
          },
          summary: {
            average_rating: parseFloat(((avgRows[0] as any).average_rating || 0).toFixed(1)),
            total_reviews: totalCount,
          },
        },
        error: null,
        meta: null,
      });
    } catch (error) {
      console.error('[CafeteriaController] getCafeteriaReviews 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '리뷰 목록 조회 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * POST /api/cafeterias/:cafeteria_id/reviews
   * 리뷰 작성
   */
  async createCafeteriaReview(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const cafeteriaId = parseInt(req.params.cafeteria_id as string);
      const { rating, comment, image_url } = req.body as {
        rating: number;
        comment: string;
        image_url?: string;
      };

      if (isNaN(cafeteriaId)) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'INVALID_PARAMETER',
            message: '유효하지 않은 식당 ID입니다.',
          },
          meta: null,
        });
      }

      if (!rating || !comment) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'rating과 comment는 필수입니다.',
          },
          meta: null,
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Rating must be between 1 and 5',
            details: { field: 'rating' },
          },
          meta: null,
        });
      }

      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO cafeteria_review (user_id, cafeteria_id, rating, comment, image_url)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, cafeteriaId, rating, comment, image_url || null]
      );

      const reviewId = result.insertId;

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM cafeteria_review WHERE review_id = ?',
        [reviewId]
      );

      const review = rows[0];

      if (!review) {
        return res.status(500).json({
          data: null,
          error: {
            code: 'INTERNAL_ERROR',
            message: '리뷰 생성 후 조회에 실패했습니다.',
          },
          meta: null,
        });
      }

      // 미션 로깅 및 체크
      logMissionAction(userId, 'CAFETERIA_REVIEW', 'review_create', reviewId)
        .then(() => checkAndUpdateMission(userId, 'cafeteria_review'))
        .catch(err => console.error('[Cafeteria] 미션 처리 실패:', err));

      return res.status(201).json({
        data: {
          review_id: review.review_id,
          user_id: review.user_id,
          cafeteria_id: review.cafeteria_id,
          rating: review.rating,
          comment: review.comment,
          image_url: review.image_url,
          created_at: review.created_at,
        },
        error: null,
        meta: null,
      });
    } catch (error) {
      console.error('[CafeteriaController] createCafeteriaReview 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '리뷰 작성 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * PATCH /api/cafeterias/:cafeteria_id/reviews/:review_id
   * 리뷰 수정
   */
  async updateCafeteriaReview(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const cafeteriaId = parseInt(req.params.cafeteria_id as string);
      const reviewId = parseInt(req.params.review_id as string);
      const { rating, comment, image_url } = req.body as {
        rating?: number;
        comment?: string;
        image_url?: string;
      };

      if (isNaN(cafeteriaId) || isNaN(reviewId)) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'INVALID_PARAMETER',
            message: '유효하지 않은 ID입니다.',
          },
          meta: null,
        });
      }

      const [checkRows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM cafeteria_review WHERE review_id = ? AND cafeteria_id = ?',
        [reviewId, cafeteriaId]
      );

      const existingReview = checkRows[0]; // ✅ 추가

      if (!existingReview) { // ✅ 수정
        return res.status(404).json({
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found',
          },
          meta: null,
        });
      }

      if (existingReview.user_id !== userId) { // ✅ 수정
        return res.status(403).json({
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only edit your own reviews',
          },
          meta: null,
        });
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (rating !== undefined) {
        if (rating < 1 || rating > 5) {
          return res.status(400).json({
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Rating must be between 1 and 5',
            },
            meta: null,
          });
        }
        updateFields.push('rating = ?');
        updateValues.push(rating);
      }

      if (comment !== undefined) {
        updateFields.push('comment = ?');
        updateValues.push(comment);
      }

      if (image_url !== undefined) {
        updateFields.push('image_url = ?');
        updateValues.push(image_url);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: '수정할 내용이 없습니다.',
          },
          meta: null,
        });
      }

      updateValues.push(reviewId);

      await pool.query(
        `UPDATE cafeteria_review SET ${updateFields.join(', ')} WHERE review_id = ?`,
        updateValues
      );

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM cafeteria_review WHERE review_id = ?',
        [reviewId]
      );

      const review = rows[0];

      if (!review) {
        return res.status(500).json({
          data: null,
          error: {
            code: 'INTERNAL_ERROR',
            message: '리뷰 수정 후 조회에 실패했습니다.',
          },
          meta: null,
        });
      }

      return res.json({
        data: {
          review_id: review.review_id,
          user_id: review.user_id,
          cafeteria_id: review.cafeteria_id,
          rating: review.rating,
          comment: review.comment,
          image_url: review.image_url,
          created_at: review.created_at,
        },
        error: null,
        meta: null,
      });
    } catch (error) {
      console.error('[CafeteriaController] updateCafeteriaReview 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '리뷰 수정 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * DELETE /api/cafeterias/:cafeteria_id/reviews/:review_id
   * 리뷰 삭제
   */
  async deleteCafeteriaReview(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const cafeteriaId = parseInt(req.params.cafeteria_id as string);
      const reviewId = parseInt(req.params.review_id as string);

      if (isNaN(cafeteriaId) || isNaN(reviewId)) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'INVALID_PARAMETER',
            message: '유효하지 않은 ID입니다.',
          },
          meta: null,
        });
      }

      const [checkRows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM cafeteria_review WHERE review_id = ? AND cafeteria_id = ?',
        [reviewId, cafeteriaId]
      );

      const existingReview = checkRows[0]; // ✅ 추가

      if (!existingReview) { // ✅ 수정
        return res.status(404).json({
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found',
          },
          meta: null,
        });
      }

      if (existingReview.user_id !== userId) { // ✅ 수정
        return res.status(403).json({
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete your own reviews',
          },
          meta: null,
        });
      }

      await pool.query('DELETE FROM cafeteria_review WHERE review_id = ?', [reviewId]);

      return res.json({
        data: {
          review_id: reviewId,
          message: 'Review deleted successfully',
        },
        error: null,
        meta: null,
      });
    } catch (error) {
      console.error('[CafeteriaController] deleteCafeteriaReview 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '리뷰 삭제 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }
}

export const cafeteriaController = new CafeteriaController();