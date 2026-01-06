import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface FloatingAssistantProps {
  taskPrompt?: string | null;
  contextType: "drawing" | "task";
}

export const FloatingAssistant = ({ taskPrompt, contextType }: FloatingAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownAutoHint, setHasShownAutoHint] = useState(false);

  const getInitialMessage = () => {
    if (contextType === "drawing" && taskPrompt) {
      return `Привет! Я помогу тебе с заданием: "${taskPrompt}". Спрашивай, если нужна подсказка! 🎨`;
    }
    return "Привет! Я Star, твой помощник. Могу подсказать что делать! 💡";
  };

  const getAutoHint = () => {
    if (contextType === "drawing" && taskPrompt) {
      return "Давай начнём! Попробуй выбрать цвет, который отражает твоё настроение прямо сейчас. Какие эмоции ты чувствуешь? 🎨";
    }
    return "Выбери любое задание, которое тебе интересно! Я помогу тебе его выполнить. Давай создадим что-то красивое вместе! ✨";
  };

  // Auto-show hint after 5 seconds
  useEffect(() => {
    if (!hasShownAutoHint && contextType === "drawing") {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setMessages([
          {
            role: "assistant",
            content: getAutoHint(),
          },
        ]);
        setHasShownAutoHint(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [hasShownAutoHint, contextType]);

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: getInitialMessage(),
        },
      ]);
    }
  };

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
    
    // Добавляем контекст задания в сообщение пользователя для лучшего понимания
    const enrichedMessage = taskPrompt 
      ? `[Задание: "${taskPrompt}"] ${userMessage}`
      : userMessage;

    const newMessages = [
      ...messages,
      { role: "user" as const, content: enrichedMessage }
    ];
    
    setMessages([...messages, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Слишком много запросов");
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to stream");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Ошибка связи");
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    streamChat(input);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 w-20 h-20 rounded-full shadow-float hover:scale-110 transition-transform z-50 animate-gentle-float border-4 border-primary overflow-hidden bg-white cursor-pointer"
        >
          <img
            src={ceolinaCharacter}
            alt="Star"
            className="w-full h-full object-cover"
          />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-float z-50 flex flex-col animate-scale-in bg-gradient-to-br from-background to-secondary/20">
          <div className="p-4 border-b flex items-center justify-between bg-gradient-creative">
            <div className="flex items-center gap-2">
              <img src={ceolinaCharacter} alt="Star" className="w-10 h-10" />
              <div>
                <h3 className="font-bold text-white flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Star
                </h3>
                <p className="text-xs text-white/80">Твой помощник</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-foreground border border-border"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 rounded-2xl px-3 py-2 border border-border">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Спроси что-нибудь..."
                className="resize-none text-sm"
                rows={2}
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};
