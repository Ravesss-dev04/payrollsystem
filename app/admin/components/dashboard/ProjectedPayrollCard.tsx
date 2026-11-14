import { LuWallet } from "react-icons/lu";
export default function ProjectedPayrollCard({ amount }: { amount: number }) {
  return (
    <section className="flex items-start gap-4 rounded-2xl border border-[#EDEAF6] bg-white p-5 shadow-sm">
      <span className="rounded-full bg-[#7C3AED] p-3 text-white">
        <LuWallet size={22} />
      </span>
      <div>
        <p className="text-xl font-bold text-[#17152D]">
          {new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            maximumFractionDigits: 0,
          }).format(amount)}
        </p>
        <h2 className="mt-1 text-sm font-semibold">Projected Payroll</h2>
        <p className="mt-1 text-xs text-[#73718A]">
          This cutoff (Nov 1 ? Nov 15)
        </p>
      </div>
    </section>
  );
}
