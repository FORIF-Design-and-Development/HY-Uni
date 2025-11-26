import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { createUser, findUserByEmail, findUserByStudentNumber, findUserByNickname, findUserById, updateLastLoginAt,
  findUserByNameAndBirth, findUserForPasswordReset, updateUserPassword
 } from '../../models/auth/auth.model';
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
      grade,
      status
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
      department_id == null ||
      grade == null
    ) {
      return res.status(400).json({
        success: false,
        message: '필수 항목이 누락되었습니다.',
      });
    }

    const department = await findDepartmentById(department_id);
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
      department_id,
      grade,
      status
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

//생년월일 정규화 헬퍼
function normalizeBirthDate(input: string): string {
  if (!input) return input;

  const digits = input.replace(/\D/g, '');

  if (digits.length === 8) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  if (digits.length === 4) {
    const y = digits;
    return `${y}-01-01`;
  }

  return input;
}

export async function findEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, birth_date } = req.body;

    if (!name || !birth_date) {
      return res.status(400).json({
        success: false,
        message: '이름과 생년월일을 모두 입력해주세요.',
      });
    }

    const normalizedBirth = normalizeBirthDate(birth_date);

    const user = await findUserByNameAndBirth(name, normalizedBirth);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '일치하는 사용자를 찾을 수 없습니다.',
      });
    }

    const [id, domain] = user.email.split('@') as [string, string];

    const maskedEmail =
      id.length <= 3
        ? `${id[0]}***@${domain}`
        : `${id.slice(0, 3)}***@${domain}`;

    return res.json({
      success: true,
      email: maskedEmail,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, birth_date, email } = req.body;
    //console.log('[resetPassword] body =', req.body);

    if (!name || !birth_date || !email) {
      return res.status(400).json({
        success: false,
        message: '이름, 생년월일, 이메일을 모두 입력해주세요.',
      });
    }

    const normalizedBirth = normalizeBirthDate(birth_date);

    const user = await findUserForPasswordReset(name, normalizedBirth, email);
    //console.log('[resetPassword] user =', user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.',
      });
    }

    const tempPassword = Math.random().toString(36).slice(2, 10);
    //console.log('[resetPassword] tempPassword =', tempPassword);
    
    const hashed = await bcrypt.hash(tempPassword, 10);
    //console.log('[resetPassword] hashed length =', hashed.length);

    /*
    try {
      //console.log('[resetPassword] updateUserPassword start, user_id =', user.user_id);
      await updateUserPassword(user.user_id, hashed);
      //console.log('[resetPassword] updateUserPassword done');
    } catch (dbErr) {
      //console.error('[resetPassword] DB 업데이트 에러 =', dbErr);
      return res.status(500).json({
        success: false,
        message: '비밀번호를 변경하는 중 오류가 발생했습니다.',
      });
    }
    */

    await updateUserPassword(user.user_id, hashed);
    await sendTempPasswordEmail(user.email, tempPassword);
    
    /*
    try {
      await sendTempPasswordEmail(user.email, tempPassword);
    } catch (err) {
      console.error('메일 전송 에러: ', err);
      return res.status(500).json({
        success: false,
        message: '임시 비밀번호는 발급되었지만, 메일 전송에 실패했습니다. 관리자에게 문의해주세요.'
      });
    }
    */

    return res.json({
      success: true,
      message: '임시 비밀번호가 이메일로 발송되었습니다.',
      tempPassword
    });
  } catch (err) {
    console.error('resetPassword 에러: ', err);
    next(err);
  }
}

async function sendTempPasswordEmail(to: string, tempPassword: string) {
  const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: '[HY-Uni] 임시 비밀번호 안내',
    html: `
      <p>안녕하세요.</p>
      <p>요청하신 임시 비밀번호는 다음과 같습니다:</p>
      <h2>${tempPassword}</h2>
      <p>로그인 후 반드시 비밀번호를 변경해주세요.</p>
    `,
  });
}