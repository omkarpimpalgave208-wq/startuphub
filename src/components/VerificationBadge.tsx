import React from 'react';

interface VerificationBadgeProps {
  type: 'student' | 'founder';
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ type }) => {
  const isStudent = type === 'student';
  const label = isStudent ? 'Student Verified' : 'Founder Verified';
  const icon = isStudent ? '🎓' : '🚀';
  const bgClass = isStudent ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bgClass} dark:${bgClass}`}>
      <span className="mr-1">{icon}</span>
      {label}
    </span>
  );
};
