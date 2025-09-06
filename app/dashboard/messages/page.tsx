"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
  };
}

interface Conversation {
  id: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  buyer: {
    id: string;
    name: string;
  };
  seller: {
    id: string;
    name: string;
  };
  messages?: Message[];
}

export default function MessagesPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        fetchMessages(conversationId);
      }
    }
  }, [conversationId, conversations]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/messages/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast({ title: "Error", description: "Failed to load conversations" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/messages/conversations/${convId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast({ title: "Error", description: "Failed to load messages" });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSending(true);
    try {
      const res = await fetch(`http://localhost:5000/api/messages/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId: user.userId,
          content: newMessage.trim(),
        }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages([...messages, message]);
        setNewMessage("");
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({ title: "Error", description: "Failed to send message" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to view your messages.</p>
          <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border h-[600px] flex">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
            </div>
            <div className="overflow-y-auto h-full">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conversation) => {
                  const otherUser = conversation.buyerId === user.userId ? conversation.seller : conversation.buyer;
                  return (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        fetchMessages(conversation.id);
                      }}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{otherUser.name}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedConversation.buyerId === user.userId 
                      ? selectedConversation.seller.name 
                      : selectedConversation.buyer.name}
                  </h3>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === user.userId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.senderId === user.userId
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderId === user.userId ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
