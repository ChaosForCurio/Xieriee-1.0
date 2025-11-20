import { Suspense } from "react";
import ChatArea from "@/components/chat/ChatArea";
import { stackServerApp } from "../stack";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function Home() {
  let user;
  try {
    user = await stackServerApp.getUser();
  } catch (error) {
    console.error("Error fetching user in Home:", error);
    // If there's an error fetching the user, we might want to redirect to sign-in or show an error
    // For now, let's assume if it fails, we redirect to sign-in to be safe,
    // but logging the error is crucial for debugging.
    // redirect('/sign-in'); // Commented out to see the error first if possible, or maybe just redirect.
    // If we re-throw, we get 500.
  }

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-white/50">Loading chat...</div>}>
      <ChatArea />
    </Suspense>
  );
}
