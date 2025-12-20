import React from 'react';

interface BrandNameProps {
  /** 추가할 텍스트 (예: "커뮤니티") */
  suffix?: string;
  /** 텍스트 크기 클래스 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 커스텀 클래스 */
  className?: string;
}

/**
 * 브랜드 이름을 일관된 스타일로 표시하는 컴포넌트
 * 
 * @example
 * <BrandName /> // "HY UNI"
 * <BrandName suffix="커뮤니티" /> // "HY UNI 커뮤니티"
 */
export const BrandName: React.FC<BrandNameProps> = ({ 
  suffix, 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const baseClasses = `font-extrabold tracking-tight text-gray-900 ${sizeClasses[size]}`;

  return (
    <h1 className={`${baseClasses} ${className}`}>
      HY <span className="text-[#016ABF]">UNI</span>
      {suffix && ` ${suffix}`}
    </h1>
  );
};

