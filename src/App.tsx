import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { WelcomeScreen } from './components/WelcomeScreen';
import type { Message, AgentConfig } from './types/chat';

const agentConfig: AgentConfig = {
  name: 'NLP Agent',
  description: 'An advanced natural language processing assistant powered by state-of-the-art AI technology.',
  capabilities: [
    'Natural language understanding and generation',
    'Text analysis and sentiment detection',
    'Question answering and information retrieval',
    'Language translation and summarization',
    'Context-aware conversations',
  ],
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I understand you said: "${content}". As an NLP agent, I can help you with various natural language processing tasks. What would you like to explore?`,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsProcessing(false);
    }, 1000);
  };

  const handleClearChat = () => {
    if (messages.length > 0 && confirm('Are you sure you want to clear the chat?')) {
      setMessages([]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        config={agentConfig}
        messageCount={messages.length}
        onClearChat={handleClearChat}
      />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900">Chat Interface</h2>
            <p className="text-sm text-gray-500">Ask me anything about natural language processing</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput onSendMessage={handleSendMessage} isProcessing={isProcessing} />
      </div>
    </div>
  );
}

export default App;
