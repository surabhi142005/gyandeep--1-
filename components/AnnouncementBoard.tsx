import React, { useState, useMemo } from 'react';

export interface Announcement {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

interface AnnouncementBoardProps {
  announcements: Announcement[];
  onPost?: (text: string) => void;
  canPost: boolean;
  theme: string;
}

const THEME_COLORS: Record<string, Record<string, string>> = {
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', ring: 'focus:ring-indigo-500' },
  teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', ring: 'focus:ring-teal-500' },
  crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', ring: 'focus:ring-red-500' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', ring: 'focus:ring-purple-500' },
};

const AnnouncementBoard: React.FC<AnnouncementBoardProps> = ({ announcements, onPost, canPost, theme }) => {
  const [newText, setNewText] = useState('');
  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  const handlePost = () => {
    if (!newText.trim() || !onPost) return;
    onPost(newText.trim());
    setNewText('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Announcements</h2>

      {canPost && onPost && (
        <div className="mb-4">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Write an announcement..."
            rows={2}
            maxLength={500}
            className={`w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${colors.ring} resize-none`}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{newText.length}/500</span>
            <button
              onClick={handlePost}
              disabled={!newText.trim()}
              className={`${colors.primary} ${colors.hover} text-white font-semibold py-2 px-5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm`}
            >
              Post
            </button>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <p className="text-gray-500 text-center text-sm py-4">No announcements yet.</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {announcements.map((a) => (
            <div key={a.id} className="border-l-4 border-gray-200 pl-4 py-2">
              <p className="text-sm text-gray-800">{a.text}</p>
              <p className="text-xs text-gray-400 mt-1">
                {a.author} · {new Date(a.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementBoard;
