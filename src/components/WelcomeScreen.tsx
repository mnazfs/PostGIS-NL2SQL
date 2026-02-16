import { MessageCircle, Zap, Shield } from 'lucide-react';

export function WelcomeScreen() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl mb-4">
          <MessageCircle className="w-10 h-10 text-white" />
        </div>

        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Welcome to Your NLP Agent
          </h2>
          <p className="text-lg text-gray-600">
            Start a conversation and experience the power of natural language processing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Natural Conversation</h3>
            <p className="text-sm text-gray-600">
              Chat naturally and get intelligent responses
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Fast Processing</h3>
            <p className="text-sm text-gray-600">
              Get instant responses powered by advanced AI
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mb-3">
              <Shield className="w-5 h-5 text-cyan-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-sm text-gray-600">
              Your conversations are processed securely
            </p>
          </div>
        </div>

        <div className="pt-4">
          <p className="text-sm text-gray-500">
            Type a message below to get started
          </p>
        </div>
      </div>
    </div>
  );
}
