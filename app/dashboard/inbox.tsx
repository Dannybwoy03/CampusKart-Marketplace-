"use client";
import useSWR from "swr";
import { useAuth } from "../../components/AuthContext";
import { get, getConversation, getMessages, sendMessage } from "../../lib/api";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";

export default function InboxPage() {
  const { user, token } = useAuth();
  const { data: conversations, mutate } = useSWR(user ? ["/messages/conversations", token] : null, ([url, t]) => get(url, t));
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000");
    setSocket(s);
    return () => s.disconnect();
  }, []);
  useEffect(() => {
    if (!socket || !selected) return;
    socket.emit("join", selected.id);
    socket.on("message", (msg: any) => {
      setMessages((msgs) => [...msgs, msg]);
    });
    return () => { socket.off("message"); };
  }, [socket, selected]);

  async function openConversation(convo: any) {
    setSelected(convo);
    setLoading(true);
    const msgs = await getMessages(convo.id, token);
    setMessages(msgs);
    setLoading(false);
  }
  async function handleSend() {
    if (!newMessage.trim() || !selected) return;
    const msg = { room: selected.id, senderId: user.userId, content: newMessage };
    socket.emit("message", msg);
    setMessages([...messages, msg]);
    setNewMessage("");
  }

  if (!user) return <div className="p-8">Login required</div>;
  if (!conversations) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1 bg-white rounded shadow p-4">
        <h2 className="text-lg font-bold mb-4">Inbox</h2>
        <ul>
          {conversations.length === 0 && <li className="text-gray-400">No conversations</li>}
          {conversations.map((c: any) => (
            <li key={c.id} className={`p-2 rounded cursor-pointer ${selected?.id === c.id ? "bg-blue-100" : "hover:bg-gray-100"}`} onClick={() => openConversation(c)}>
              <div className="font-medium">{c.user1?.name === user.name ? c.user2?.name : c.user1?.name}</div>
              <div className="text-xs text-gray-500 truncate">{c.messages?.[c.messages.length-1]?.content || "No messages yet"}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="md:col-span-2 bg-white rounded shadow p-4 flex flex-col">
        {selected ? (
          <>
            <div className="font-semibold mb-2">Chat with {selected.user1?.name === user.name ? selected.user2?.name : selected.user1?.name}</div>
            <div className="flex-1 overflow-y-auto border rounded p-2 mb-2 bg-gray-50" style={{ minHeight: 300 }}>
              {loading ? (
                <div>Loading...</div>
              ) : messages.length === 0 ? (
                <div className="text-gray-400 text-center">No messages yet.</div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`mb-2 ${msg.senderId === user.userId ? "text-right" : "text-left"}`}>
                    <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-900 max-w-xs">
                      {msg.content}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input className="flex-1 border rounded px-2 py-1" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." />
              <button onClick={handleSend} disabled={!newMessage.trim()} className="bg-blue-600 text-white px-4 py-1 rounded">Send</button>
            </div>
          </>
        ) : (
          <div className="text-gray-400 flex-1 flex items-center justify-center">Select a conversation</div>
        )}
      </div>
    </div>
  );
} 