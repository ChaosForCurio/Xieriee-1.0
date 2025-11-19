import { Suspense } from "react";
import ChatArea from "@/components/chat/ChatArea";

export default function Home() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-white/50">Loading chat...</div>}>
      <ChatArea />
    </Suspense>
  );
}
