import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { createUser, findUserByEmail, findUserByStudentNumber, findUserByNickname, findUserById, updateLastLoginAt } from '../../models/auth/auth.model';
import { findDepartmentById } from '../../models/auth/auth.department.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../config/jwt';

const isProd = process.env.NODE_ENV === 'production';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      email,
      password,
      name,
      birth_date,
      student_number,
      phone_number,
      nickname,
      department_id,
    } = req.body;

    //1. 기본 검증
    if (
      !email ||
      !password ||
      !name ||
      !birth_date ||
      !student_number ||
      !phone_number ||
      !nickname ||
      department_id == null
    ) {
      return res.status(400).json({
        success: false,
        message: '필수 항목이 누락되었습니다.',
      });
    }

    const departmentIdNum = Number(department_id);
    if (Number.isNaN(departmentIdNum)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 학과 선택입니다.',
      });
    }

    const department = await findDepartmentById(departmentIdNum);
    if (!department) {
      return res.status(400).json({
        success: false,
        message: '존재하지 않는 학과입니다.',
      });
    }

    //2. 중복 체크
    const existingByEmail = await findUserByEmail(email);
    if (existingByEmail) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 이메일입니다.',
      });
    }

    const existingByStudentNumber = await findUserByStudentNumber(student_number);
    if (existingByStudentNumber) {
      return res.status(409).json({
        success: false,
        message: '이미 등록된 학번입니다.',
      });
    }

    const existingByNickname = await findUserByNickname(nickname);
    if (existingByNickname) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 닉네임입니다.',
      });
    }

    //3. 비밀번호 해시
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    //4. DB에 유저 생성
    const user = await createUser({
      email,
      password: hashedPassword,
      name,
      birth_date,
      student_number,
      phone_number,
      nickname,
      department_id: departmentIdNum
    });

    //5. 응답(민감 정보 제거)
    const { password: _, ...safeUser } = user;

    const accessToken = signAccessToken(user.user_id);
    const refreshToken = signRefreshToken(user.user_id);
    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      user: safeUser,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    //1. 입력값 검증
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 모두 입력해주세요.',
      });
    }

    //2. 사용자 조회
    const user = await findUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    //3. 비밀번호 검증
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    //4. 학과 정보 조회
    const department = await findDepartmentById(user.department_id);

    //5. 마지막 로그인 시간 업데이트
    updateLastLoginAt(user.user_id).catch(() => {});

    //6. 응답 (비밀번호 제거)
    const { password: _, ...safeUser } = user;

    const accessToken = signAccessToken(user.user_id);
    const refreshToken = signRefreshToken(user.user_id);
    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      success: true,
      user: safeUser,
      department,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '리프레시 토큰이 없습니다.',
      });
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 리프레시 토큰입니다.',
      });
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '해당 사용자를 찾을 수 없습니다.',
      });
    }

    const department = await findDepartmentById(user.department_id);
    const { password: _, ...safeUser } = user;

    const newAccessToken = signAccessToken(user.user_id);

    return res.json({
      success: true,
      user: safeUser,
      department,
      accessToken: newAccessToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, _next: NextFunction) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  return res.json({
    success: true,
  });
}