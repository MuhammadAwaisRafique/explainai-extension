import React, { useState, useRef } from 'react';
import { Brain, Mail, Lock, User, Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';

interface LoginProps {
  supabase: any;
}

const Login: React.FC<LoginProps> = ({ supabase }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const lastSubmissionTime = useRef<number>(0);
  const submissionTimeout = useRef<NodeJS.Timeout | null>(null);

  const validateForm = () => {
    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }
    
    if (!password.trim()) {
      setError('Please enter your password.');
      return false;
    }
    
    if (!isLogin && !name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    
    // Password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any existing error
    setError('');
    
    // Validate form first
    if (!validateForm()) {
      return;
    }
    
    // Prevent rapid submissions (minimum 3 seconds between attempts)
    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionTime.current;
    
    if (timeSinceLastSubmission < 3000) {
      setError('Please wait a moment before trying again.');
      return;
    }
    
    // Clear any existing timeout
    if (submissionTimeout.current) {
      clearTimeout(submissionTimeout.current);
    }
    
    setLoading(true);
    lastSubmissionTime.current = now;

    try {
      console.log('Attempting authentication...', { isLogin, email, hasPassword: !!password, hasName: !!name });
      
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        
        if (error) {
          console.error('Sign in error:', error);
          throw error;
        }
        
        console.log('Sign in successful:', data);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              name: name.trim(),
            },
          },
        });
        
        if (error) {
          console.error('Sign up error:', error);
          throw error;
        }
        
        console.log('Sign up successful:', data);
        
        // Show success message for signup
        if (data.user && !data.session) {
          setError('Please check your email and click the confirmation link to complete your registration.');
          return;
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Handle specific error types
      if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        setError('Too many signup attempts. Please wait a few minutes before trying again.');
        setRetryCount(prev => prev + 1);
        
        // Set a longer timeout for rate-limited requests
        submissionTimeout.current = setTimeout(() => {
          setError('');
          setRetryCount(0);
        }, 60000); // 1 minute
      } else if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.');
      } else if (error.message?.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (error.message?.includes('Password should be at least')) {
        setError('Password must be at least 6 characters long.');
      } else if (error.message?.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else if (error.message?.includes('Unable to validate email address')) {
        setError('Please enter a valid email address.');
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setRetryCount(0);
    lastSubmissionTime.current = 0; // Reset the submission timer
    if (submissionTimeout.current) {
      clearTimeout(submissionTimeout.current);
      submissionTimeout.current = null;
    }
  };

  const isRateLimited = error.includes('Too many signup attempts');

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-4">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {isLogin ? 'Welcome back!' : 'Join AI Annotator'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin 
              ? 'Sign in to access your explanation history and preferences' 
              : 'Create an account to save your explanations and track your learning'
            }
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="sr-only">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Full Name"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className={`border rounded-lg p-4 ${isRateLimited ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start">
                <AlertCircle className={`h-5 w-5 mt-0.5 mr-3 ${isRateLimited ? 'text-orange-500' : 'text-red-500'}`} />
                <div className="flex-1">
                  <p className={`text-sm ${isRateLimited ? 'text-orange-700' : 'text-red-600'}`}>
                    {error}
                  </p>
                  {isRateLimited && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center text-sm text-orange-600 hover:text-orange-500"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || isRateLimited}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                <span>{isLogin ? 'Sign in' : 'Create account'}</span>
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setRetryCount(0);
                lastSubmissionTime.current = 0;
                if (submissionTimeout.current) {
                  clearTimeout(submissionTimeout.current);
                  submissionTimeout.current = null;
                }
              }}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </form>

        {/* Features */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            What you'll get:
          </h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">Save and organize your explanations</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">Track your learning progress</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">Access your history from any device</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;