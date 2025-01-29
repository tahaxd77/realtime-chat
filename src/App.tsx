import React, { useEffect, useState, useRef } from 'react';
import { MessageCircle, Send, LogIn, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from './lib/supabase';

interface Message {
  id: string;
  content: string;
  username: string;
  created_at: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState(supabase.auth.getUser());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Initial messages load
    fetchMessages().catch(err => {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages. Please refresh the page.');
    });

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    // Auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session);
      if (event === 'SIGNED_IN') {
        setError(null);
      } else if (event === 'SIGNED_OUT') {
        setMessages([]);
        fetchMessages().catch(err => {
          console.error('Failed to fetch messages:', err);
          setError('Failed to load messages. Please refresh the page.');
        });
      }
    });

    return () => {
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      if (data) {
        setMessages(data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      throw err;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: email.split('@')[0],
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      setError('Check your email for the confirmation link');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw new Error(signOutError.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.user) return;

    try {
      const { error: sendError } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          user_id: user.user.id,
          username: user.user.email?.split('@')[0] || 'anonymous'
        });

      if (sendError) {
        throw new Error(sendError.message);
      }

      setNewMessage('');
      setError(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="text-white" />
              <h1 className="text-white text-xl font-bold">Real-time Chat</h1>
            </div>
            {user?.user ? (
              <div className="flex items-center space-x-2">
                <span className="text-white">{user.user.email}</span>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="bg-red-500 text-white px-4 py-2 rounded-md flex items-center space-x-2 hover:bg-red-600 transition disabled:opacity-50"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                <form onSubmit={handleSignIn} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-3 py-2 rounded-md"
                    disabled={loading}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="px-3 py-2 rounded-md"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center justify-center space-x-2 hover:bg-green-600 transition disabled:opacity-50"
                  >
                    <LogIn size={18} />
                    <span>Sign In</span>
                  </button>
                </form>
                <button
                  onClick={handleSignUp}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition disabled:opacity-50"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Messages */}
          <div className="h-[600px] overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${
                  message.username === user?.user?.email?.split('@')[0]
                    ? 'items-end'
                    : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.username === user?.user?.email?.split('@')[0]
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  <p className="font-medium text-sm">{message.username}</p>
                  <p>{message.content}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {user?.user ? (
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-500 text-white px-4 py-2 rounded-md flex items-center space-x-2 hover:bg-indigo-600 transition disabled:opacity-50"
                  disabled={!newMessage.trim()}
                >
                  <Send size={18} />
                  <span>Send</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 border-t text-center text-gray-500">
              Please sign in to send messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;