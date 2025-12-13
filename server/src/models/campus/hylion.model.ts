import { RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';

// ===== 타입 정의 =====

export interface HylionIcon {
  icon_id: number;
  icon_name: string;
  icon_category: 'basic' | 'college';
  college_code: string | null;
  icon_image_url: string;
  icon_locked_image_url: string;
  icon_description: string | null;
  display_order: number;
  is_default: boolean;
  created_at: Date;
}

export interface HylionMission {
  mission_id: number;
  mission_code: string;
  mission_name: string;
  mission_category: string;
  mission_description: string | null;
  required_count: number;
  reward_icon_id: number | null;
  reward_type: 'fixed_icon' | 'college_icon';
  is_active: boolean;
  created_at: Date;
}

export interface UserHylionCollection {
  collection_id: number;
  user_id: number;
  icon_id: number;
  unlocked_via_mission_id: number | null;
  unlocked_at: Date;
}

export interface UserHylionSettings {
  user_id: number;
  current_icon_id: number;
  updated_at: Date;
}

export interface UserMissionProgress {
  progress_id: number;
  user_id: number;
  mission_id: number;
  current_count: number;
  is_completed: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ===== 아이콘 관련 =====

/**
 * 전체 아이콘 목록 조회
 */
export async function getAllIcons(category?: 'basic' | 'college'): Promise<HylionIcon[]> {
  let query = 'SELECT * FROM hylion_icon';
  const params: any[] = [];

  if (category) {
    query += ' WHERE icon_category = ?';
    params.push(category);
  }

  query += ' ORDER BY display_order ASC';

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows as HylionIcon[];
}

/**
 * 특정 아이콘 조회
 */
export async function getIconById(iconId: number): Promise<HylionIcon | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM hylion_icon WHERE icon_id = ?',
    [iconId]
  );
  return rows.length > 0 ? (rows[0] as HylionIcon) : null;
}

/**
 * 단과대 코드로 아이콘 조회
 */
export async function getIconByCollegeCode(collegeCode: string): Promise<HylionIcon | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM hylion_icon WHERE icon_category = ? AND college_code = ?',
    ['college', collegeCode]
  );
  return rows.length > 0 ? (rows[0] as HylionIcon) : null;
}

/**
 * 기본 제공 아이콘 조회
 */
export async function getDefaultIcon(): Promise<HylionIcon | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM hylion_icon WHERE is_default = TRUE LIMIT 1'
  );
  return rows.length > 0 ? (rows[0] as HylionIcon) : null;
}

// ===== 사용자 컬렉션 관련 =====

/**
 * 사용자가 획득한 아이콘 목록 조회
 */
export async function getUserUnlockedIcons(userId: number): Promise<any[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
      i.*,
      c.unlocked_at,
      c.unlocked_via_mission_id,
      m.mission_name
    FROM user_hylion_collection c
    JOIN hylion_icon i ON c.icon_id = i.icon_id
    LEFT JOIN hylion_mission m ON c.unlocked_via_mission_id = m.mission_id
    WHERE c.user_id = ?
    ORDER BY c.unlocked_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * 사용자가 획득하지 않은 아이콘 목록 조회
 */
export async function getUserLockedIcons(userId: number): Promise<any[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
      i.*,
      m.mission_name as how_to_unlock
    FROM hylion_icon i
    LEFT JOIN hylion_mission m ON i.icon_id = m.reward_icon_id
    WHERE i.icon_id NOT IN (
      SELECT icon_id FROM user_hylion_collection WHERE user_id = ?
    )
    ORDER BY i.display_order ASC`,
    [userId]
  );
  return rows;
}

/**
 * 사용자가 특정 아이콘을 보유하고 있는지 확인
 */
export async function hasUserUnlockedIcon(userId: number, iconId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM user_hylion_collection WHERE user_id = ? AND icon_id = ?',
    [userId, iconId]
  );
  return rows.length > 0;
}

/**
 * 사용자에게 아이콘 지급
 */
export async function grantIconToUser(
  userId: number,
  iconId: number,
  missionId?: number
): Promise<void> {
  await pool.query(
    `INSERT INTO user_hylion_collection (user_id, icon_id, unlocked_via_mission_id)
     VALUES (?, ?, ?)`,
    [userId, iconId, missionId || null]
  );
}

// ===== 사용자 설정 관련 =====

/**
 * 사용자의 현재 아이콘 조회
 */
export async function getUserCurrentIcon(userId: number): Promise<HylionIcon | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT i.*
     FROM user_hylion_settings s
     JOIN hylion_icon i ON s.current_icon_id = i.icon_id
     WHERE s.user_id = ?`,
    [userId]
  );
  return rows.length > 0 ? (rows[0] as HylionIcon) : null;
}

/**
 * 사용자의 현재 아이콘 변경
 */
export async function updateUserCurrentIcon(userId: number, iconId: number): Promise<void> {
  await pool.query(
    `INSERT INTO user_hylion_settings (user_id, current_icon_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE current_icon_id = ?, updated_at = NOW()`,
    [userId, iconId, iconId]
  );
}

/**
 * 사용자 설정 초기화 (회원가입 시)
 */
export async function initializeUserSettings(userId: number, iconId: number): Promise<void> {
  await pool.query(
    'INSERT INTO user_hylion_settings (user_id, current_icon_id) VALUES (?, ?)',
    [userId, iconId]
  );
}

// ===== 미션 관련 =====

/**
 * 전체 미션 목록 조회
 */
export async function getAllMissions(category?: string): Promise<HylionMission[]> {
  let query = 'SELECT * FROM hylion_mission WHERE is_active = TRUE';
  const params: any[] = [];

  if (category) {
    query += ' AND mission_category = ?';
    params.push(category);
  }

  query += ' ORDER BY mission_id ASC';

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows as HylionMission[];
}

/**
 * 특정 미션 조회
 */
export async function getMissionById(missionId: number): Promise<HylionMission | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM hylion_mission WHERE mission_id = ?',
    [missionId]
  );
  return rows.length > 0 ? (rows[0] as HylionMission) : null;
}

/**
 * 미션 코드로 미션 조회
 */
export async function getMissionByCode(missionCode: string): Promise<HylionMission | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM hylion_mission WHERE mission_code = ?',
    [missionCode]
  );
  return rows.length > 0 ? (rows[0] as HylionMission) : null;
}

// ===== 미션 진행도 관련 =====

/**
 * 사용자의 미션 진행도 조회
 */
export async function getUserMissionProgress(
  userId: number,
  category?: string
): Promise<UserMissionProgress[]> {
  let query = `
    SELECT p.*
    FROM user_mission_progress p
    JOIN hylion_mission m ON p.mission_id = m.mission_id
    WHERE p.user_id = ?
  `;
  const params: any[] = [userId];

  if (category) {
    query += ' AND m.mission_category = ?';
    params.push(category);
  }

  query += ' ORDER BY p.updated_at DESC';

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows as UserMissionProgress[];
}

/**
 * 사용자의 전체 미션 목록 (진행도 포함)
 */
export async function getUserMissionsWithProgress(
  userId: number,
  category?: string
): Promise<any[]> {
  let query = `
    SELECT 
      m.*,
      p.current_count,
      p.is_completed,
      p.completed_at,
      CASE 
        WHEN p.current_count IS NULL THEN 0
        ELSE ROUND((p.current_count * 100.0 / m.required_count), 2)
      END as progress_percentage
    FROM hylion_mission m
    LEFT JOIN user_mission_progress p ON m.mission_id = p.mission_id AND p.user_id = ?
    WHERE m.is_active = TRUE
  `;
  const params: any[] = [userId];

  if (category) {
    query += ' AND m.mission_category = ?';
    params.push(category);
  }

  query += ' ORDER BY m.mission_id ASC';

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows;
}

/**
 * 사용자 통계 조회
 */
export async function getUserHylionStats(userId: number): Promise<any> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
      (SELECT COUNT(*) FROM user_hylion_collection WHERE user_id = ?) as total_unlocked,
      (SELECT COUNT(*) FROM hylion_icon) as total_icons,
      (SELECT COUNT(*) FROM user_hylion_collection 
       WHERE user_id = ? AND icon_id IN (
         SELECT icon_id FROM hylion_icon WHERE icon_category = 'college'
       )) as has_college_icon`,
    [userId, userId]
  );

  const stats = rows[0] as any;
  return {
    totalUnlocked: stats.total_unlocked,
    totalIcons: stats.total_icons,
    completionRate: parseFloat(
      ((stats.total_unlocked / stats.total_icons) * 100).toFixed(2)
    ),
    hasCollegeIcon: stats.has_college_icon > 0,
  };
}