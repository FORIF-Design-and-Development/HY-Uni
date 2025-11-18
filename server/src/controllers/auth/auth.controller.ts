import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { createUser, findUserByEmail, findUserByStudentNumber, findUserByNickname } from '../../models/auth/auth.model';
import { findDepartmentById } from '../../models/auth/auth.department.model';

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

    return res.status(201).json({
      success: true,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
}