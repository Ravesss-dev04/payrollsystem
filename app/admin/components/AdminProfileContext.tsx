"use client";
import { createContext, useContext, useState } from "react";
import { initialProfile } from "../settings/data";
import { AdminProfile } from "../settings/types";
const ProfileContext = createContext<{
  profile: AdminProfile;
  setProfile: (profile: AdminProfile) => void;
} | null>(null);
export function AdminProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState(initialProfile);
  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}
export function useAdminProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("Profile provider missing");
  return value;
}
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AU"
  );
}
export function AdminAvatar({
  profile,
  size = "h-10 w-10",
}: {
  profile: AdminProfile;
  size?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`${profile.name} avatar`}
      className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EDE9FE] font-bold text-[#6D28D9]`}
    >
      {profile.avatar ? (
        <span
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${profile.avatar})` }}
        />
      ) : (
        initials(profile.name)
      )}
    </span>
  );
}
