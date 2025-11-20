import { Suspense } from "react";
import SignInWrapper from "@/components/auth/SignInWrapper";

export default function SignInPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
            <Suspense fallback={<div className="text-white">Loading sign in...</div>}>
                <SignInWrapper />
            </Suspense>
        </div>
    );
}
