import type { Metadata } from "next";
import { getInvitationPreview } from "../../lib/users/invitations.server";
import InvitationAcceptForm from "./InvitationAcceptForm";

export const metadata: Metadata = {
  title: "Accept invitation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const instant = false;

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const preview =
    typeof token === "string" ? await getInvitationPreview(token) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F7F6FF] p-4 text-[#17152D]">
      <div className="w-full max-w-lg">
        <p className="mb-5 text-center text-lg font-bold">WorkPulse HR</p>
        {preview && typeof token === "string" ? (
          <InvitationAcceptForm
            token={token}
            name={preview.name}
            email={preview.email}
            role={preview.role}
            department={preview.department}
          />
        ) : (
          <section className="rounded-2xl bg-white p-7 shadow-lg">
            <h1 className="text-2xl font-bold">Invitation unavailable</h1>
            <p className="mt-3 text-sm text-[#57556B]">
              This link is invalid, expired, or has already been used. Ask your
              administrator to send a new invitation.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
