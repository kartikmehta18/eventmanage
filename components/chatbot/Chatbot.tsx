"use client";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User } from "lucide-react";
import { getBotResponse } from "@/app/actions/chatbot";

// Define the shape of a message
interface Message {
  role: "user" | "bot";
  content: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to the bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const botResponse = await getBotResponse(input);
      const botMessage: Message = {
        role: "bot",
        content: botResponse || "Sorry, I couldn't get a response.",
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error getting bot response:", error);
      const errorMessage: Message = {
        role: "bot",
        content: "Sorry, something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between bg-primary text-primary-foreground p-4 rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <Bot size={28} />
          <CardTitle className="text-lg font-semibold">Event Assistant</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              message.role === "user" ? "justify-end" : ""
            }`}
          >
            {message.role === "bot" && (
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  <Bot size={20} />
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`rounded-lg px-4 py-2 max-w-xs ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm">{message.content}</p>
            </div>
            {message.role === "user" && (
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  <User size={20} />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback>
                <Bot size={20} />
              </AvatarFallback>
            </Avatar>
            <div className="rounded-lg px-4 py-2 max-w-xs bg-muted">
              <p className="text-sm"><i>Thinking...</i></p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about events or students..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}