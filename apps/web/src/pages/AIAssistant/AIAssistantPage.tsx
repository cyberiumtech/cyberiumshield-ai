import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  'Analyze recent threat patterns',
  'Show me vulnerabilities requiring immediate attention',
  'Generate a security report for last week',
  'What are the top security risks in my network?',
];

const mockResponses = [
  "I've analyzed your security data. Here's what I found:\n\n• 3 critical vulnerabilities detected in the last 24 hours\n• Ransomware activity increased by 15%\n• 2 systems require immediate patching\n\nWould you like me to provide detailed remediation steps?",
  "Based on my analysis, your top security priorities are:\n\n1. Patch CVE-2024-12345 on 12 servers (Critical)\n2. Investigate unusual login activity on Admin Portal\n3. Update firewall rules to block detected C2 servers\n\nI can help you create incident tickets for these items.",
  "Here are the threat patterns I've identified:\n\n• SQL injection attempts: +45% this week\n• Phishing campaigns targeting finance department\n• Port scanning from Russian IP addresses\n\nI recommend enabling additional monitoring on your database servers.",
];

export function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI Security Assistant. I can help you analyze threats, investigate incidents, and provide security recommendations. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: mockResponses[Math.floor(Math.random() * mockResponses.length)],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400">
              <Bot className="w-6 h-6 text-white" />
            </div>
            AI Security Assistant
          </h1>
          <p className="text-sm text-slate-400 mt-1">Powered by advanced threat intelligence AI</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/30">
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-emerald-400">AI Online</span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    message.role === 'assistant'
                      ? 'bg-gradient-to-br from-purple-400 to-pink-400'
                      : 'bg-gradient-to-br from-cyan-400 to-blue-400'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <Bot className="w-5 h-5 text-white" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                  <div
                    className={`max-w-3xl rounded-xl p-4 ${
                      message.role === 'assistant'
                        ? 'bg-white/5 border border-white/10'
                        : 'bg-cyan-400/10 border border-cyan-400/30'
                    }`}
                  >
                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                      <span className="text-xs text-slate-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2">
                          <button className="p-1 hover:bg-white/10 rounded transition-colors">
                            <Copy className="w-3 h-3 text-slate-400" />
                          </button>
                          <button className="p-1 hover:bg-white/10 rounded transition-colors">
                            <ThumbsUp className="w-3 h-3 text-slate-400" />
                          </button>
                          <button className="p-1 hover:bg-white/10 rounded transition-colors">
                            <ThumbsDown className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length === 1 && (
          <div className="px-6 py-4 border-t border-white/10">
            <p className="text-xs text-slate-400 mb-3">Suggested prompts:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="px-4 py-2 text-sm text-left text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about your security posture..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            AI responses are generated based on your security data. Always verify critical decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
