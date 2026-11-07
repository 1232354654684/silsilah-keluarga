import React, { useState } from 'react';
import { Member } from '../../types';
import { getDisplayImageUrl } from '../../utils/googleDrive';
import { User, Users } from 'lucide-react';

interface MemberCardProps {
  member: Member;
  isFocused: boolean;
  childrenCount: number;
  totalDescendantsCount: number;
  onClick: () => void;
  isPublicView?: boolean;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  isFocused,
  childrenCount,
  totalDescendantsCount,
  onClick,
  isPublicView = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const displayImage = member.avatarUrl ? getDisplayImageUrl(member.avatarUrl) : '';

  // Calculate year of birth or lifespan
  const birthYear = member.birthDate ? member.birthDate.split('-')[0] : null;
  const deathYear = member.deathDate ? member.deathDate.split('-')[0] : null;

  let lifespan = '';
  if (birthYear && member.isDeceased) {
    lifespan = `${birthYear} - ${deathYear || 'Wafat'}`;
  } else if (birthYear) {
    lifespan = `Lahir ${birthYear}`;
  } else if (member.isDeceased) {
    lifespan = 'Wafat';
  }

  // Privacy rule: if public view and hideAddressAndBirth is set, hide exact lifespan
  if (isPublicView && member.hideAddressAndBirth) {
    lifespan = member.isDeceased ? 'Wafat' : '';
  }

  return (
    <button
      onClick={onClick}
      className={`w-[168px] text-left p-3 rounded-[13px] border transition-all duration-150 cursor-pointer flex flex-col items-center justify-between group relative select-none ${
        isFocused
          ? 'bg-[var(--accent-soft)] border-[var(--accent)] ring-2 ring-[var(--accent)]/30 shadow-md -translate-y-0.5'
          : 'bg-[var(--surface)] border-[var(--line)] hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-sm'
      }`}
      title={`Klik untuk melihat detail & silsilah ${member.name}`}
    >
      {/* Deceased Ribbon if applicable */}
      {member.isDeceased && (
        <span className="absolute -top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-700 text-stone-200 border border-stone-600 shadow-xs">
          Wafat
        </span>
      )}

      {/* Avatar or Initials */}
      <div className="relative mb-2">
        {displayImage && !imageError ? (
          <img
            src={displayImage}
            alt={member.name}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-12 h-12 rounded-full object-cover border-2 border-[var(--line)] group-hover:border-[var(--accent)] transition-colors shadow-xs"
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-xs border-2 border-[var(--line)] ${
              member.gender === 'female'
                ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                : member.gender === 'male'
                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {member.name
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')
              .toUpperCase() || <User className="w-5 h-5" />}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="w-full text-center">
        <b className="block text-[13px] sm:text-[14px] font-semibold text-[var(--ink)] leading-snug truncate" title={member.name}>
          {member.name}
        </b>
        {lifespan && (
          <span className="block text-[11px] text-[var(--mute)] mt-0.5 truncate">
            {lifespan}
          </span>
        )}
        {member.spouse && (
          <span className="block text-[10.5px] text-[var(--mute)]/80 italic mt-0.5 truncate" title={`Pasangan: ${member.spouse}`}>
            & {member.spouse}
          </span>
        )}
      </div>

      {/* Bottom badge: Children or Descendants count */}
      {childrenCount > 0 ? (
        <div className="mt-2.5">
          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20">
            <Users className="w-3 h-3" />
            {childrenCount} anak
          </span>
        </div>
      ) : (
        <div className="h-5" />
      )}
    </button>
  );
};
