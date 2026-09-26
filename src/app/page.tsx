import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/palette";

export default function SplashPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <Image src="/logo.png" alt="Emergency Preparedness Solutions" width={170} height={173} priority />
        </div>
        <h1 className="text-3xl font-bold text-[#00274c] dark:text-white">Campus Ready</h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Your school&apos;s emergency plan, on your phone.
        </p>

        <Link
          href="/menu"
          className={`mt-10 w-full max-w-xs rounded-full px-4 py-3.5 text-center text-base font-medium text-white transition-colors ${BRAND.button} ${BRAND.buttonHover}`}
        >
          Get Started
        </Link>
      </div>

      <div className="space-y-2 pb-8 text-center">
        <p className="text-[11px] uppercase tracking-wide text-zinc-400">
          © {new Date().getFullYear()} Emergency Preparedness Solutions, LLC
        </p>
        <p className="text-xs text-zinc-400">
          <Link href="/privacy" className="underline">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/support" className="underline">
            Support
          </Link>{" "}
          ·{" "}
          <Link href="/admin" className="underline">
            Staff/Admin
          </Link>
        </p>
      </div>
    </div>
  );
}
