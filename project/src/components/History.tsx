import React, { useState, useEffect } from 'react';
import { Search, Trash2, Copy, Volume2, Calendar, Filter, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface HistoryProps {
  user: any;
}

interface Explanation {
  id: string;
  original_text: string;
  explanation: string;
  context: string;
  created_at: string;
  ai_provider?: string;
  is_fallback?: boolean;
}

const History: React.FC<HistoryProps> = ({ user }) => {
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [filteredExplanations, setFilteredExplanations] = useState<Explanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadHistory();
    }
  }, [user]);

  useEffect(() => {
    filterExplanations();
  }, [explanations, searchTerm, selectedFilter]);

  const loadHistory = async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('🔄 Loading history for user:', user.id);
      
      const response = await fetch(`http://localhost:3001/api/history/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 History response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ History data received:', data);
      
      if (data.success) {
        setExplanations(data.explanations || []);
      } else {
        throw new Error(data.error || 'Failed to load history');
      }
    } catch (error: any) {
      console.error('❌ Error loading history:', error);
      setError(error.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const refreshHistory = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const filterExplanations = () => {
    let filtered = explanations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(exp =>
        exp.original_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.explanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.context.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date filter
    if (selectedFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (selectedFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(exp => new Date(exp.created_at) >= filterDate);
    }

    setFilteredExplanations(filtered);
  };

  const deleteExplanation = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/explanation/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setExplanations(explanations.filter(exp => exp.id !== id));
      } else {
        throw new Error('Failed to delete explanation');
      }
    } catch (error) {
      console.error('Error deleting explanation:', error);
      setError('Failed to delete explanation');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('Copied to clipboard!');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setError('Failed to copy to clipboard');
    }
  };

  const speakText = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
      // Stop any currently speaking
      if (speaking) {
        speechSynthesis.cancel();
        setSpeaking(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      
      utterance.onstart = () => setSpeaking(id);
      utterance.onend = () => setSpeaking(null);
      utterance.onerror = () => setSpeaking(null);
      
      speechSynthesis.speak(utterance);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading your history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Learning History</h1>
          <p className="text-gray-600 mt-2">
            Review all your AI explanations and track your learning journey.
          </p>
        </div>
        <button
          onClick={refreshHistory}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {copySuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <p className="text-green-700">{copySuccess}</p>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search explanations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-indigo-600">{explanations.length}</div>
          <div className="text-sm text-gray-600">Total Explanations</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">
            {explanations.reduce((sum, exp) => sum + (exp.original_text?.split(' ').length || 0), 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Words Explained</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-purple-600">{filteredExplanations.length}</div>
          <div className="text-sm text-gray-600">Filtered Results</div>
        </div>
      </div>

      {/* Explanations List */}
      <div className="space-y-4">
        {filteredExplanations.length > 0 ? (
          filteredExplanations.map((explanation) => (
            <div key={explanation.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(explanation.created_at)}
                    <span className="ml-4 px-2 py-1 bg-gray-100 rounded-full text-xs">
                      {explanation.context}
                    </span>
                    <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                      {getAIProviderIcon(explanation.ai_provider, explanation.is_fallback)} {getAIProviderName(explanation.ai_provider, explanation.is_fallback)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => speakText(explanation.explanation, explanation.id)}
                    className={`p-2 transition-colors ${
                      speaking === explanation.id 
                        ? 'text-indigo-600 bg-indigo-100 rounded-full' 
                        : 'text-gray-400 hover:text-indigo-600'
                    }`}
                    title={speaking === explanation.id ? "Stop listening" : "Listen to explanation"}
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(explanation.explanation)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Copy explanation"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteExplanation(explanation.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete explanation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-500">
                  <h4 className="font-medium text-gray-900 mb-2">Original Text:</h4>
                  <p className="text-gray-700 italic">"{explanation.original_text}"</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <h4 className="font-medium text-gray-900 mb-2">AI Explanation:</h4>
                  <p className="text-gray-700 leading-relaxed">{explanation.explanation}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No explanations found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Start highlighting text on webpages to build your learning history!'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;