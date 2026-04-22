import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Send, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import GoldButton from "@/components/ui/GoldButton.jsx";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import PullToRefresh from "@/components/PullToRefresh";
import { useLanguage } from "@/lib/i18n";

export default function Messages() {
  const { user } = useAuth();
  const [renters, setRenters] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadData = useCallback(async () => {
    const [r, m] = await Promise.all([base44.entities.Renter.list(), base44.entities.Message.list("-created_date", 200)]);
    setRenters(r); setMessages(m); setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, selectedConv]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (!selectedConv || !user?.email) return;
    const unread = messages.filter(m => m.conversation_id === selectedConv && !m.is_read && m.sender_email !== user.email);
    unread.forEach(m => base44.entities.Message.update(m.id, { is_read: true }));
  }, [selectedConv, messages, user?.email]);

  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";
  const convMessages = messages.filter(m => m.conversation_id === selectedConv).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedConv) return;
    setSending(true);
    await base44.entities.Message.create({
      conversation_id: selectedConv,
      sender_email: user.email,
      sender_name: user.full_name,
      content: newMsg.trim(),
      is_read: false,
    });
    setNewMsg(""); setSending(false); loadData();
  };

  const conversations = isAdmin
    ? renters.map((r, i) => ({ id: r.id, label: r.name, sub: r.role || "Stylist", index: i }))
    : [{ id: "admin", label: t("salonOwner") || "Salon Owner", sub: "Admin", index: 0 }];

  const selectedConvData = conversations.find(c => c.id === selectedConv);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">{t("communication") || "Communication"}</p>
          <h1 className="font-serif text-3xl font-light tracking-wide">{t("messages")}</h1>
        </div>

        {/* Desktop layout */}
        <div className="hidden md:flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
          <ConvList conversations={conversations} messages={messages} user={user} selectedConv={selectedConv} onSelect={setSelectedConv} />
          <ChatPanel convMessages={convMessages} selectedConv={selectedConv} newMsg={newMsg} setNewMsg={setNewMsg} sending={sending} sendMessage={sendMessage} bottomRef={bottomRef} t={t} user={user} />
        </div>

        {/* Mobile layout */}
        <div className="md:hidden">
          {selectedConv ? (
            <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
              {/* Mobile chat header */}
              <div className="flex items-center gap-3 px-3 py-3 border-b border-border bg-card shrink-0">
                <button onClick={() => setSelectedConv(null)} className="p-1.5 -ml-1 rounded-lg hover:bg-muted">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {selectedConvData && (() => {
                  const av = getAvatarColor(selectedConvData.index);
                  return (
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", av.bg, av.text)}>
                        {getInitials(selectedConvData.label)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{selectedConvData.label}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedConvData.sub}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {convMessages.map(m => {
                  const isMine = m.sender_email === user?.email;
                  return (
                    <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] rounded-xl px-3 py-2 text-sm", isMine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {!isMine && <p className="text-[10px] font-semibold mb-1 opacity-70">{m.sender_name}</p>}
                        <p>{m.content}</p>
                      </div>
                    </div>
                  );
                })}
                {convMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">{t("noMessages") || "No messages yet. Start the conversation!"}</p>}
                <div ref={bottomRef} />
              </div>
              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2 shrink-0">
                <Input
                  placeholder={t("typeMessage") || "Type a message…"}
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  className="flex-1 min-h-[44px]"
                />
                <GoldButton onClick={sendMessage} disabled={sending || !newMsg.trim()} size="default">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </GoldButton>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {conversations.map(c => {
                const av = getAvatarColor(c.index);
                const unread = messages.filter(m => m.conversation_id === c.id && !m.is_read && m.sender_email !== user?.email).length;
                const lastMsg = messages.filter(m => m.conversation_id === c.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
                return (
                  <button key={c.id} onClick={() => setSelectedConv(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/30 transition-colors border-b border-border last:border-0 min-h-[64px]">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", av.bg, av.text)}>
                      {getInitials(c.label)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{lastMsg ? lastMsg.content : c.sub}</p>
                    </div>
                    {unread > 0 && <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">{unread}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}

function ConvList({ conversations, messages, user, selectedConv, onSelect }) {
  return (
    <div className="w-48 shrink-0 bg-card rounded-xl border border-border overflow-y-auto">
      {conversations.map(c => {
        const av = getAvatarColor(c.index);
        const unread = messages.filter(m => m.conversation_id === c.id && !m.is_read && m.sender_email !== user?.email).length;
        return (
          <button key={c.id} onClick={() => onSelect(c.id)}
            className={cn("w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-muted/30 transition-colors border-b border-border last:border-0",
              selectedConv === c.id && "bg-primary/10")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", av.bg, av.text)}>
              {getInitials(c.label)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{c.label}</p>
              <p className="text-[10px] text-muted-foreground">{c.sub}</p>
            </div>
            {unread > 0 && <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">{unread}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ChatPanel({ convMessages, selectedConv, newMsg, setNewMsg, sending, sendMessage, bottomRef, t, user }) {
  return (
    <div className="flex-1 bg-card rounded-xl border border-border flex flex-col overflow-hidden">
      {!selectedConv ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">{t("selectConversation") || "Select a conversation"}</div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {convMessages.map(m => {
              const isMine = m.sender_email === user?.email;
              return (
                <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[75%] rounded-xl px-3 py-2 text-sm", isMine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    {!isMine && <p className="text-[10px] font-semibold mb-1 opacity-70">{m.sender_name}</p>}
                    <p>{m.content}</p>
                  </div>
                </div>
              );
            })}
            {convMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">{t("noMessages") || "No messages yet. Start the conversation!"}</p>}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <Input placeholder={t("typeMessage") || "Type a message…"} value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()} className="flex-1 h-9" />
            <GoldButton onClick={sendMessage} disabled={sending || !newMsg.trim()} size="sm">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </GoldButton>
          </div>
        </>
      )}
    </div>
  );
}