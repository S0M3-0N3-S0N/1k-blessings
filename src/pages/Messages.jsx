import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function Messages() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [renters, setRenters] = useState([]);
  const [myRenter, setMyRenter] = useState(null);
  const [activeConvo, setActiveConvo] = useState(null); // renter object or "admin"
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    base44.entities.Renter.list().then((r) => {
      setRenters(r);
      if (!isAdmin) {
        const mine = r.find(x => x.user_email === user.email) || null;
        setMyRenter(mine);
        if (mine) setActiveConvo({ id: "admin", name: "Admin / Owner", email: "admin" });
      }
      setLoading(false);
    });
  }, [user, isAdmin]);

  const convoId = (renterEmail) => `admin_${renterEmail}`;

  useEffect(() => {
    if (!activeConvo) return;
    const cid = isAdmin ? convoId(activeConvo.user_email) : convoId(user.email);
    base44.entities.Message.filter({ conversation_id: cid }).then(setMessages);

    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === cid) {
        base44.entities.Message.filter({ conversation_id: cid }).then(setMessages);
      }
    });
    return unsub;
  }, [activeConvo, user, isAdmin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    setSending(true);
    const cid = isAdmin ? convoId(activeConvo.user_email) : convoId(user.email);
    const receiverEmail = isAdmin ? activeConvo.user_email : "admin";
    await base44.entities.Message.create({
      conversation_id: cid,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      receiver_email: receiverEmail,
      content: input.trim(),
      is_read: false,
    });
    setInput("");
    const updated = await base44.entities.Message.filter({ conversation_id: cid });
    setMessages(updated);
    setSending(false);
  };

  const linkedRenters = renters.filter(r => r.user_email);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!isAdmin && !myRenter) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-6">
      <MessageCircle className="w-10 h-10 text-muted-foreground" />
      <p className="font-semibold">No renter profile linked to your account.</p>
      <p className="text-sm text-muted-foreground">Ask your admin to link your email to your renter profile.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isAdmin ? "Direct messages with your renters" : "Chat with your admin"}
        </p>
      </div>

      <div className="flex gap-4 h-[65vh] bg-card rounded-xl border border-border overflow-hidden">
        {/* Sidebar — admin only */}
        {isAdmin && (
          <div className="w-52 shrink-0 border-r border-border flex flex-col">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Renters</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {linkedRenters.length === 0 && (
                <p className="px-4 py-6 text-xs text-muted-foreground text-center">No linked renter accounts yet.</p>
              )}
              {linkedRenters.map(r => (
                <button
                  key={r.id}
                  onClick={() => setActiveConvo(r)}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/40",
                    activeConvo?.id === r.id ? "bg-primary/10 font-semibold text-primary" : "text-foreground"
                  )}
                >
                  <p className="font-medium truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.user_email}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConvo ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a renter to start a conversation
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-3 border-b border-border shrink-0">
                <p className="text-sm font-semibold">{isAdmin ? activeConvo.name : "Admin / Owner"}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground pt-8">No messages yet. Start the conversation!</p>
                )}
                {messages
                  .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                  .map((msg) => {
                    const isMine = msg.sender_email === user.email;
                    return (
                      <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                          isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        )}>
                          {!isMine && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.sender_name || msg.sender_email}</p>}
                          <p className="leading-relaxed">{msg.content}</p>
                          <p className={cn("text-[10px] mt-1 opacity-60", isMine ? "text-right" : "")}>
                            {new Date(msg.created_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border flex gap-2 shrink-0">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Type a message..."
                  className="h-9 text-sm"
                />
                <Button size="sm" className="h-9 px-3" onClick={send} disabled={sending || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}