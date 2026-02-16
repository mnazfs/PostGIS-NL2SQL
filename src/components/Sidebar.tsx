import { Brain, Sparkles, Zap, MessageSquare, Trash2 } from 'lucide-react';
import type { AgentConfig } from '../types/chat';

interface SidebarProps {
  config: AgentConfig;
  messageCount: number;
  onClearChat: () => void;
}

export function Sidebar({ config, messageCount, onClearChat }: SidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{config.name}</h1>
            <p className="text-sm text-gray-500">AI Assistant</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          {config.description}
        </p>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Capabilities
          </h2>
          <div className="space-y-2">
            {config.capabilities.map((capability, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-gray-600"
              >
                <Zap className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{capability}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MessageSquare className="w-4 h-4" />
              Conversation
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{messageCount}</p>
          <p className="text-xs text-gray-500 mt-1">messages exchanged</p>
        </div>
      </div>

      <div className="p-6 border-t border-gray-200">
        <button
          onClick={onClearChat}
          className="w-full px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Clear Chat
        </button>
      </div>
    </div>
  );
}
