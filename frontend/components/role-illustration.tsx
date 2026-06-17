"use client";

import { cn } from "@/lib/utils";

type DemoRole = "doctor" | "receptionist" | "admin";

type RoleIllustrationProps = {
  role: DemoRole;
  className?: string;
  compact?: boolean;
};

export function RoleIllustration({
  role,
  className,
  compact = false,
}: RoleIllustrationProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden="true"
      className={cn("shrink-0", compact ? "size-11" : "size-14", className)}
    >
      <defs>
        <linearGradient id={`card-${role}`} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#eefafb" />
          <stop offset="100%" stopColor="#d7f4f0" />
        </linearGradient>
      </defs>

      {!compact && (
        <rect
          x="6"
          y="6"
          width="84"
          height="84"
          rx="20"
          fill={`url(#card-${role})`}
        />
      )}

      {role === "doctor" ? <DoctorScene /> : null}
      {role === "receptionist" ? <ReceptionistScene /> : null}
      {role === "admin" ? <AdminScene /> : null}
    </svg>
  );
}

function DoctorScene() {
  return (
    <>
      <path
        d="M61 38h11.5c2.2 0 3.8 1.8 3.8 3.8S74.7 46 72.5 46H68l-3.5 6-4.2-8.2H52"
        fill="none"
        stroke="#66cfc3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.8"
      />
      <circle cx="43" cy="25" r="12" fill="#6886a0" />
      <path
        d="M31 32c0-10 6-16 14-16 7.5 0 13.2 5 14.3 12.2"
        fill="#5f7d98"
      />
      <path
        d="M33 41c0-7.8 6.2-14 14-14s14 6.2 14 14v6.8c0 10.8-8.7 19.5-19.5 19.5S22 58.6 22 47.8V41c0-7.8 6.2-14 14-14Z"
        fill="#f8dbc8"
      />
      <path
        d="M27 72l8-21 10 8 10-8 8 21"
        fill="#ffffff"
        stroke="#16324d"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M39 54l6 6 6-6M45 60v12"
        fill="none"
        stroke="#2a8fa0"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M26 73H18l2.4-16.5c.6-4.1 4.1-7.2 8.3-7.2h6.2M64 73h8l-2.4-16.5c-.6-4.1-4.1-7.2-8.3-7.2h-6.2"
        fill="none"
        stroke="#16324d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M28 48l5.5-9.4 11 7.4 10.4-8.2L60 48"
        fill="none"
        stroke="#16324d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M24.5 49.5c0 4-3.2 7.2-7.2 7.2S10 53.5 10 49.5s3.2-7.2 7.3-7.2"
        fill="none"
        stroke="#16324d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M17.3 56.7v8.3c0 2.7 2.2 4.9 4.9 4.9h4.2M17.3 56.7h-4.2"
        fill="none"
        stroke="#16324d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <circle cx="62.5" cy="61.5" r="4.7" fill="none" stroke="#16324d" strokeWidth="2.4" />
      <path d="M62.5 66.2v7.5" fill="none" stroke="#16324d" strokeLinecap="round" strokeWidth="2.4" />
    </>
  );
}

function ReceptionistScene() {
  return (
    <>
      <g fill="none" stroke="#66cfc3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3">
        <rect x="58" y="30" width="18" height="16" rx="3.5" />
        <path d="M63 26v6M71 26v6M61.5 36h11M61.5 40h7.5M78 44.5a8 8 0 1 1 0 11.3" />
        <path d="M82 48.5v4.8h4.8" />
      </g>
      <path
        d="M48 15c9 0 16.5 7.2 16.5 16.2v6c0 10.8-7.7 20.4-18.5 20.4-10.3 0-18.5-9.6-18.5-20.4v-6C27.5 22.2 35 15 44 15Z"
        fill="#f8dbc8"
      />
      <path
        d="M33 27c2.2-8.5 8-13.2 15.8-13.2 8.6 0 15.3 5.7 16.5 14.2L54 21 42 33l-8.8-6Z"
        fill="#637f9d"
      />
      <path
        d="M28.8 34.6c-3 0-5.4-2.4-5.4-5.4v-1.4c0-7.3 5.9-13.2 13.2-13.2h18.8c7.3 0 13.2 5.9 13.2 13.2v1.4c0 3-2.4 5.4-5.4 5.4"
        fill="none"
        stroke="#16324d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M28 36.5c0-2.8 2.2-5 5-5h1.2v13.4H33c-2.8 0-5-2.2-5-5ZM58.8 31.5H60c2.8 0 5 2.2 5 5v3.4c0 2.8-2.2 5-5 5h-1.2Z"
        fill="#b8ece7"
        stroke="#16324d"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M39 57h14.4c4.2 0 7.6 3.4 7.6 7.6V73H31v-8.4c0-4.2 3.4-7.6 7.6-7.6Z"
        fill="#bfeee5"
        stroke="#16324d"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M47 47.5h4.4c2.1 0 3.8 1.7 3.8 3.8v.4h-8.2c-2.1 0-3.8-1.7-3.8-3.8v-.4Z"
        fill="none"
        stroke="#16324d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path d="M43 73V62M50.2 73V62" fill="none" stroke="#16324d" strokeLinecap="round" strokeWidth="2.4" />
      <path
        d="M43.5 38.8h5.2c2.2 0 4 1.8 4 4v1.4h-5.2c-2.2 0-4-1.8-4-4v-1.4Z"
        fill="#ffffff"
        stroke="#16324d"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </>
  );
}

function AdminScene() {
  return (
    <>
      <g fill="none" stroke="#66cfc3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
        <path d="M63.5 25.5 66 22l3.7 1.6 3.6-1.6 2.6 3.5 4 .4.7 4.1 3 2.7-1.8 3.8 1.8 3.8-3 2.7-.7 4.1-4 .4-2.6 3.5-3.6-1.6L66 51.5l-2.5-3.5-4-.4-.8-4.1-3-2.7 1.8-3.8-1.8-3.8 3-2.7.8-4.1Z" />
        <circle cx="69.7" cy="36.5" r="5.8" />
      </g>
      <circle cx="42.5" cy="25.5" r="11.5" fill="#f8dbc8" />
      <path
        d="M30.8 25.3c1-8.1 7.4-13.8 15.5-13.8 8.4 0 14.8 6 15.8 14.5L53 22.2l-8 2.5-7-2.7-4.8 4.8Z"
        fill="#6a86a1"
      />
      <path
        d="M31 56c0-6.2 5-11.2 11.2-11.2h5.4c6.2 0 11.2 5 11.2 11.2V73H31Z"
        fill="#ffffff"
        stroke="#16324d"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M26.5 73V56.5c0-4.5 3.7-8.2 8.2-8.2h20.6"
        fill="none"
        stroke="#16324d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M41.5 56.5 36.4 62M49 56.5l5.3 5.6"
        fill="none"
        stroke="#16324d"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <rect
        x="54"
        y="50"
        width="22"
        height="28"
        rx="3.5"
        fill="#eefafb"
        stroke="#16324d"
        strokeWidth="2.4"
      />
      <path
        d="M58.5 56.5h13M58.5 61.5h13M58.5 66.5h6M67.5 66.5h4M58.5 72h10"
        fill="none"
        stroke="#66cfc3"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <path
        d="M50 66.5c7-1.8 8.8-2.6 13.2-3.5"
        fill="none"
        stroke="#16324d"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <circle cx="49.2" cy="66.8" r="2.3" fill="#f8dbc8" stroke="#16324d" strokeWidth="1.8" />
    </>
  );
}
