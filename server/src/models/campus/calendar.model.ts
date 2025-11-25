// 일정 정보
export interface Calendar {
    calendar_id: number;
    user_id: number;
    event_title: string;
    start_datetime: string; // YYYY-MM-DD HH:mm:ss format
    end_datetime: string;
    status: 'attend' | 'absent' | 'interested' | 'not_interested' | 'done' | null;
    is_recurring: boolean;
    recurring_rule: 'daily' | 'weekly' | 'monthly' | null;
    color: 'red' | 'yellow' | 'green' | null;
    reminder_status: '활성화' | '비활성화';
    reminder_type: '1일전' | '1시간전' | '10분전' | null;
    created_at: string;
    updated_at: string;
}

// 일정 생성 요청
export interface CreateCalendarRequest {
    event_title: string;
    start_datetime: string;
    end_datetime: string;
    status?: 'attend' | 'absent' | 'interested' | 'not_interested' | 'done';
    color?: 'red' | 'yellow' | 'green';
    is_recurring?: boolean;
    recurring_rule?: 'daily' | 'weekly' | 'monthly';
    reminder_status?: '활성화' | '비활성화';
    reminder_type?: '1일전' | '1시간전' | '10분전';
}

// 일정 수정 요청
export interface UpdateCalendarRequest {
    event_title?: string;
    start_datetime?: string;
    end_datetime?: string;
    status?: 'attend' | 'absent' | 'interested' | 'not_interested' | 'done';
    color?: 'red' | 'yellow' | 'green';
    is_recurring?: boolean;
    recurring_rule?: 'daily' | 'weekly' | 'monthly';
    reminder_status?: '활성화' | '비활성화';
    reminder_type?: '1일전' | '1시간전' | '10분전';
}

// 일정 조회 응답
export interface CalendarResponse {
    calendar_id: number;
    event_title: string;
    start_datetime: string;
    end_datetime: string;
    status: 'attend' | 'absent' | 'interested' | 'not_interested' | 'done' | null;
    color: 'red' | 'yellow' | 'green' | null;
    is_recurring: boolean;
    recurring_rule: 'daily' | 'weekly' | 'monthly' | null;
    reminder_status: '활성화' | '비활성화';
    reminder_type: '1일전' | '1시간전' | '10분전' | null;
}

// 일정 목록 조회 응답
export interface CalendarListResponse {
    events: CalendarResponse[];
}

// 일정 조회 쿼리 파라미터
export interface CalendarQueryParams {
    start_datetime?: string;
    end_datetime?: string;
}