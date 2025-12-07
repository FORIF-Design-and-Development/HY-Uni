import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { X, Image as ImageIcon, Users, Check, BarChart2 } from 'lucide-react';

interface PollData {
  options: string[];
  allowMultiple: boolean;
}

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  
  // State from navigation (editing or returning from Poll page)
  const navState = location.state || {};
  const initialData = navState.initialData;
  const isMyPost = navState.isMyPost;
  const boardName = navState.boardName;
  const boardType = navState.boardType; // Added to identify target board
  const incomingPollData = navState.pollData;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [pollData, setPollData] = useState<PollData | null>(null);

  // Initialize data (once or when returning with new state)
  useEffect(() => {
      // If we have state passed back from Poll page or Edit page
      if (navState.title !== undefined) setTitle(navState.title);
      else if (initialData?.title) setTitle(initialData.title);

      if (navState.content !== undefined) setContent(navState.content);
      else if (initialData?.content) setContent(initialData.content);

      if (navState.isAnonymous !== undefined) setIsAnonymous(navState.isAnonymous);

      if (incomingPollData) setPollData(incomingPollData);
  }, [navState, initialData, incomingPollData]);

  const handleSubmit = () => {
      // If editing, navigate back to detail with updated data
      if (initialData && id) {
          navigate(`/community/post/${id}`, {
              state: {
                  updatedPost: {
                      title,
                      content,
                  },
                  isMyPost: isMyPost,
                  boardName: boardName,
                  pollData: pollData,
                  boardType: boardType // Preserve boardType for back navigation
              },
              replace: true
          });
      } else {
          // If creating new, create post object and navigate to board list
          const newPost = {
              id: Date.now(),
              badge: boardName || '게시판',
              badgeIsHashtag: false, // Default simplification
              title: title,
              content: content,
              likes: 0,
              comments: 0,
              time: '방금 전',
              hashtags: ['#해시태그'], // Default simplification
              hasImage: false, // Default simplification
              hasPoll: !!pollData
          };

          // Determine target path based on boardType, default to generic board-list if unknown
          const targetPath = boardType ? `/community/board/${boardType}` : '/community/board-list';
          
          navigate(targetPath, { 
              state: { newPost },
              replace: true 
          });
      }
  };

  const handlePollClick = () => {
    // Navigate to Poll Creation page, preserving current input
    navigate('/community/create/poll', {
      state: {
        title,
        content,
        isAnonymous,
        pollData, // Pass existing poll data if editing
        initialData, // Pass initial data to keep edit mode context
        isMyPost,
        boardName,
        boardType, // Pass boardType to preserve it
        id // Pass ID to keep context
      }
    });
  };

  // Mock hashtags for selection
  const hashtags = Array(9).fill('# 로스쿨');

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-gray-900"
        >
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">게시글 작성</h1>
        <button
          onClick={handleSubmit}
          className="text-base font-bold text-gray-900"
        >
          완료
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
        {/* Title Input */}
        <div className="px-5 py-4 border-b border-gray-100">
          <input
            type="text"
            placeholder="제목을 입력하세요."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-medium placeholder-gray-400 outline-none text-gray-900"
          />
        </div>

        {/* Content Input */}
        <div className="px-5 py-4 flex-1 min-h-[200px]">
          <textarea
            placeholder="내용을 입력하세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full text-base placeholder-gray-400 outline-none resize-none text-gray-600 leading-relaxed"
          />
        </div>
        
        {/* Attached Poll Indicator */}
        {pollData && (
          <div className="px-5 mb-4">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <BarChart2 className="w-5 h-5 text-blue-500" />
              <div className="flex-1">
                <span className="text-sm font-bold text-blue-700 block">투표 첨부됨</span>
                <span className="text-xs text-blue-600">{pollData.options.length}개 항목 {pollData.allowMultiple ? '(복수선택)' : ''}</span>
              </div>
              <button onClick={() => setPollData(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Hashtag Section */}
        <div className="px-5 pb-8 mt-auto">
           <p className="text-gray-500 mb-3 text-base">해시태그를 선택하세요.</p>
           <div className="bg-gray-100/50 rounded-xl p-6">
               <div className="grid grid-cols-3 gap-3">
               {hashtags.map((tag, idx) => (
                   <button key={idx} className="bg-blue-100/80 text-gray-500 text-xs py-1.5 rounded-md hover:bg-blue-200 transition-colors font-medium">
                       {tag}
                   </button>
               ))}
               </div>
           </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="h-14 border-t border-gray-100 flex items-center justify-between px-5 bg-white sticky bottom-0 z-10">
          <div className="flex gap-4 text-gray-900">
              <button>
                  <ImageIcon className="w-6 h-6" strokeWidth={1.5} />
              </button>
              <button onClick={handlePollClick}>
                  <Users className={`w-6 h-6 ${pollData ? 'text-blue-500 fill-blue-100' : ''}`} strokeWidth={1.5} />
              </button>
          </div>
          
          <button 
            className="flex items-center gap-1.5 focus:outline-none"
            onClick={() => setIsAnonymous(!isAnonymous)}
          >
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isAnonymous ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
                  {isAnonymous && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
              <span className={`text-sm font-medium ${isAnonymous ? 'text-blue-500' : 'text-blue-500'}`}>익명</span>
          </button>
      </div>
    </div>
  );
};

export default CreatePostPage;

