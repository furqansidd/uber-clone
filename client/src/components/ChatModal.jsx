import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChatModal = ({ rideId, onClose, socket, token }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load message history on open
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const res = await axios.get(`${backendUrl}/rides/${rideId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data.messages || []);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

    // Listen to new_message event via Socket.io
    if (socket) {
      socket.on('new_message', (msg) => {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('new_message');
      }
    };
  }, [rideId, socket, token]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await axios.post(`${backendUrl}/rides/${rideId}/messages`, { text: textToSend }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // The socket event will broadcast back to us, appending it to the state list
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col justify-end">
      <div className="bg-white rounded-t-[20px] max-w-md mx-auto w-full h-[80dvh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#cfc4c5] flex justify-between items-center bg-[#f9f9f9] rounded-t-[20px]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-black font-bold">chat</span>
            <span className="text-sm font-bold text-black">Ride Chat</span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#eeeeee] cursor-pointer"
            aria-label="Close Chat"
          >
            <span className="material-symbols-outlined text-black">close</span>
          </button>
        </div>

        {/* Message List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-white flex flex-col">
          {loading && <div className="text-xs text-[#5d5f5f] text-center">Loading messages...</div>}
          
          {messages.length === 0 && !loading && (
            <div className="text-xs text-[#5d5f5f] text-center my-auto">
              No messages yet. Send a message to start coordinates coordination!
            </div>
          )}

          {messages.map((msg, index) => {
            const isRider = msg.sender_role === 'rider';
            return (
              <div 
                key={msg._id || index}
                className={`flex flex-col max-w-[75%] rounded-[16px] px-4 py-2.5 text-sm ${
                  isRider 
                    ? 'bg-black text-white rounded-tr-none self-end text-right' 
                    : 'bg-[#f4f3f3] text-black rounded-tl-none self-start text-left'
                }`}
              >
                <div className="font-semibold text-[10px] opacity-70 mb-0.5">
                  {isRider ? 'Rider' : 'Captain'}
                </div>
                <div className="break-words">{msg.text}</div>
                <div className="text-[9px] opacity-60 mt-1 select-none">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-[#cfc4c5] bg-[#f9f9f9] flex gap-2">
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-grow h-11 border border-[#cfc4c5] rounded-xl px-4 text-sm focus:outline-none focus:border-black bg-white"
          />
          <button 
            type="submit"
            className="w-11 h-11 bg-black text-white rounded-xl flex items-center justify-center cursor-pointer"
            aria-label="Send Message"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;
