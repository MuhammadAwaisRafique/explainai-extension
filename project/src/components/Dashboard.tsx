import React, { useState, useEffect } from 'react';
import { Brain, BookOpen, Clock, TrendingUp, Zap, Globe, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';



interface DashboardProps {
  user: any;
}

interface Stats {
  totalExplanations: number;
  wordsExplained: number;
  timeSaved: number;
  learningStreak: number;
  recentExplanations: Array<{
    id: string;
    original_text: string;
    explanation: string;
    created_at: string;
    ai_provider?: string;
    is_fallback?: boolean;
  }>;
}



const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<Stats>({
    totalExplanations: 0,
    wordsExplained: 0,
    timeSaved: 0,
    learningStreak: 0,
    recentExplanations: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user]);



  const loadDashboardData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('🔄 Loading dashboard data for user:', user.id);
      
      // Validate user ID format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      if (!isUUID) {
        console.warn('⚠️ Invalid user ID format:', user.id);
        setError('Invalid user ID format. Please try logging out and back in.');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || "https://explainai-extension-production.up.railway.app"}/api/history/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Dashboard response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No explanations found for this user. Try using the extension to create some explanations first.');
        } else if (response.status === 500) {
          throw new Error('Backend server error. Please check if the server is running on http://localhost:3001');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ Dashboard data received:', data);
      
      if (data.success) {
        const explanations = data.explanations || [];
        console.log('📋 Raw explanations array:', explanations);
        console.log('📋 Number of explanations received:', explanations.length);
        
        // Log each explanation with its creation date
        explanations.forEach((exp: any, index: number) => {
          console.log(`📝 Explanation ${index + 1}:`, {
            id: exp.id,
            original_text: exp.original_text?.substring(0, 50) + '...',
            created_at: exp.created_at,
            date: new Date(exp.created_at).toLocaleString()
          });
        });
        
        const recentExplanations = explanations.slice(0, 3);
        console.log('🕒 Recent explanations (first 5):', recentExplanations);
        
        setStats({
          totalExplanations: explanations.length,
          wordsExplained: explanations.reduce((sum: number, exp: any) => 
            sum + (exp.original_text?.split(' ').length || 0), 0),
          timeSaved: calculateTimeSaved(explanations),
          learningStreak: calculateLearningStreak(explanations),
          recentExplanations: recentExplanations
        });
        
        console.log('📊 Final stats set:', {
          totalExplanations: explanations.length,
          recentExplanationsCount: recentExplanations.length
        });
      } else {
        throw new Error(data.error || 'Failed to load dashboard data');
      }
    } catch (error: any) {
      console.error('❌ Error loading dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
      
      // Set default stats when there's an error
      setStats({
        totalExplanations: 0,
        wordsExplained: 0,
        timeSaved: 0,
        learningStreak: 0,
        recentExplanations: []
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  const getAIProviderIcon = (provider?: string, isFallback?: boolean) => {
    if (isFallback) return '📝';
    switch (provider) {
      case 'gemini': return '🤖';
      case 'openai': return '🧠';
      default: return '🤖';
    }
  };

  const getAIProviderName = (provider?: string, isFallback?: boolean) => {
    if (isFallback) return 'Basic';
    switch (provider) {
      case 'gemini': return 'Gemini';
      case 'openai': return 'GPT';
      default: return 'AI';
    }
  };

  // Calculate learning streak based on consecutive days with explanations
  const calculateLearningStreak = (explanations: any[]) => {
    if (explanations.length === 0) return 0;
    
    // Sort explanations by date (newest first)
    const sortedExplanations = [...explanations].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Get unique dates when explanations were created
    const uniqueDates = new Set();
    sortedExplanations.forEach(exp => {
      const date = new Date(exp.created_at).toDateString();
      uniqueDates.add(date);
    });
    
    // Convert to array and sort by date (newest first)
    const dateArray = Array.from(uniqueDates).sort((a, b) => 
      new Date(b as string).getTime() - new Date(a as string).getTime()
    );
    
    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    // Check if user has activity today or yesterday to start counting
    if (dateArray.includes(today) || dateArray.includes(yesterday)) {
      let currentDate = new Date();
      
      for (let i = 0; i < 365; i++) { // Check up to 1 year back
        const dateString = currentDate.toDateString();
        
        if (dateArray.includes(dateString)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break; // Streak broken
        }
      }
    }
    
    return streak;
  };

  // Calculate accurate time saved based on explanation complexity
  const calculateTimeSaved = (explanations: any[]) => {
    if (explanations.length === 0) return 0;
    
    let totalTimeSaved = 0;
    
    explanations.forEach(exp => {
      const originalText = exp.original_text || '';
      const explanationText = exp.explanation || '';
      
      // Base time: 2 minutes per explanation (time to research and understand)
      let timeForThisExplanation = 2;
      
      // Add time based on text complexity
      const wordCount = originalText.split(' ').length;
      if (wordCount > 50) timeForThisExplanation += 1; // Complex text
      if (wordCount > 100) timeForThisExplanation += 1; // Very complex text
      
      // Add time based on explanation length (longer explanations = more complex concepts)
      const explanationWords = explanationText.split(' ').length;
      if (explanationWords > 30) timeForThisExplanation += 0.5;
      if (explanationWords > 60) timeForThisExplanation += 0.5;
      
      totalTimeSaved += timeForThisExplanation;
    });
    
    // Convert to hours
    return totalTimeSaved / 60;
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.user_metadata?.name || user.email?.split('@')[0]}! 🧠
          </h1>
          <p className="text-gray-600 mt-2">
            Your AI-powered learning companion is ready to help you understand anything on the web.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            User ID: {user.id}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Error loading data</p>
                <p className="text-red-600 text-sm mb-2">{error}</p>
                <button
                  onClick={refreshData}
                  disabled={refreshing}
                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  🔄 Retry
                </button>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}



      {/* Quick Start Guide */}
      {stats.totalExplanations === 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <span className="text-blue-600">🚀</span>
            </div>
            <div>
              <h3 className="text-blue-900 font-medium mb-2">Get Started</h3>
              <p className="text-blue-700 text-sm mb-3">
                Start using your AI learning companion:
              </p>
              <ol className="text-blue-700 text-sm space-y-1 ml-4">
                <li>1. <strong>Go to any webpage</strong> (like google.com or wikipedia.org)</li>
                <li>2. <strong>Select text</strong> you want to understand</li>
                <li>3. <strong>Click "Explain"</strong> from the extension popup</li>
                <li>4. <strong>Come back here</strong> and click "Refresh" to see your explanations</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Explanations</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.totalExplanations}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <Brain className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Words Explained</p>
              <p className="text-2xl font-bold text-green-600">{stats.wordsExplained.toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Time Saved</p>
              <p className="text-2xl font-bold text-purple-600">{stats.timeSaved.toFixed(1)}h</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Learning Streak</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.learningStreak} days
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="h-5 w-5 text-yellow-500 mr-2" />
            Quick Start
          </h3>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
              <div className="bg-indigo-100 p-2 rounded-full mr-4">
                <Globe className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Browse any webpage</p>
                <p className="text-sm text-gray-600">Navigate to any website you want to understand</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="bg-green-100 p-2 rounded-full mr-4">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Highlight difficult text</p>
                <p className="text-sm text-gray-600">Select words, sentences, or paragraphs you don't understand</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="bg-purple-100 p-2 rounded-full mr-4">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Click "Explain" button</p>
                <p className="text-sm text-gray-600">Get instant AI explanations in simple language</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Explanations
            </h3>
            {stats.totalExplanations > 3 && (
              <button
                onClick={() => window.location.href = '/history'}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All ({stats.totalExplanations})
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(() => {
              console.log('🎨 Rendering recent explanations:', stats.recentExplanations);
              console.log('🎨 Number of explanations to render:', stats.recentExplanations.length);
              
              return stats.recentExplanations.length > 0 ? (
                stats.recentExplanations.map((explanation) => {
                  console.log('🎨 Rendering explanation:', {
                    id: explanation.id,
                    original_text: explanation.original_text?.substring(0, 30) + '...',
                    created_at: explanation.created_at
                  });
                  
                  return (
                    <div key={explanation.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs text-gray-800 font-medium line-clamp-1 flex-1">
                          "{explanation.original_text?.length > 60 ? explanation.original_text.substring(0, 60) + '...' : explanation.original_text}"
                        </p>
                        <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                          {getAIProviderIcon(explanation.ai_provider, explanation.is_fallback)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1 line-clamp-1">
                        {explanation.explanation?.length > 80 ? explanation.explanation.substring(0, 80) + '...' : explanation.explanation}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(explanation.created_at)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium mb-2">No explanations yet!</p>
                  <p className="text-sm">Start highlighting text on any webpage to see your explanations here.</p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Tips & Features */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          💡 Pro Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <span className="text-blue-600">🎧</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Listen to explanations</p>
              <p className="text-sm text-gray-600">Click the speaker icon to hear explanations read aloud</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-green-100 p-2 rounded-full">
              <span className="text-green-600">📚</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Review your history</p>
              <p className="text-sm text-gray-600">Access all your past explanations in the History tab</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-purple-100 p-2 rounded-full">
              <span className="text-purple-600">📋</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Copy explanations</p>
              <p className="text-sm text-gray-600">Easily copy explanations to your notes or documents</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-orange-100 p-2 rounded-full">
              <span className="text-orange-600">🌍</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Works everywhere</p>
              <p className="text-sm text-gray-600">Use on any website: Wikipedia, research papers, news articles</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;