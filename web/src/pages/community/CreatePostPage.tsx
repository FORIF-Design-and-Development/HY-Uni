import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { X, Image as ImageIcon, Users, Check, BarChart2 } from 'lucide-react';
import { getBoardTags, Tag } from '../../api/community/preferred-tag.api';
import { createPost, PollPayload } from '../../api/community/post.api';

interface PollData {
  options: string[];
  allowMultiple: boolean;
  question?: string;
}

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  
  // 네비게이션 상태(투표 페이지 또는 편집 페이지에서 반환된 데이터)
  const navState = location.state || {};
  const initialData = navState.initialData;
  const isMyPost = navState.isMyPost;
  const boardName = navState.boardName;
  const boardType = navState.boardType; // 게시판 타입
  const boardId = navState.boardId; // 게시판 ID
  const incomingPollData = navState.pollData;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [pollData, setPollData] = useState<PollData | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 데이터 초기화(한 번 또는 새로운 상태로 반환될 때)
  useEffect(() => {
      // 투표 페이지 또는 편집 페이지에서 반환된 상태가 있을 때
      if (navState.title !== undefined) setTitle(navState.title);
      else if (initialData?.title) setTitle(initialData.title);

      if (navState.content !== undefined) setContent(navState.content);
      else if (initialData?.content) setContent(initialData.content);

      if (navState.isAnonymous !== undefined) setIsAnonymous(navState.isAnonymous);

      if (incomingPollData) setPollData(incomingPollData);
  }, [navState, initialData, incomingPollData]);

  // 게시판 ID 있을 때 사용 가능한 해시태그 조회
  useEffect(() => {
    if (!boardId) return;

    const loadTags = async () => {
      try {
        setLoadingTags(true);
        const response = await getBoardTags(boardId);
        setAvailableTags(response.availableTags);
      } catch (err: any) {
        console.error('해시태그 목록 조회 실패:', err);
        // 에러 발생 시 빈 배열로 설정
        setAvailableTags([]);
      } finally {
        setLoadingTags(false);
      }
    };

    loadTags();
  }, [boardId]);

  const handleSubmit = async () => {
      // 편집 중이면 업데이트된 데이터로 상세 페이지로 이동
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
                  boardType: boardType // 네비게이션 시 게시판 타입 유지
              },
              replace: true
          });
          return;
      }

      // 필수 필드 검증
      if (!title.trim() || !content.trim()) {
          alert('제목과 내용을 입력해주세요.');
          return;
      }

      if (!boardId) {
          alert('게시판 정보를 찾을 수 없습니다.');
          return;
      }

      try {
          setIsSubmitting(true);

          // 투표 데이터를 PollPayload 형식으로 변환
          const pollPayload: PollPayload | null = pollData ? {
              question: pollData.question || '투표',
              options: pollData.options,
              expiredAt: null
          } : null;

          // API를 통해 게시글 생성
          const response = await createPost(boardId, {
              title: title.trim(),
              content: content.trim(),
              isAnonymous,
              tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
              poll: pollPayload
          });

          // 게시글 상세 페이지로 이동
          navigate(`/community/post/${response.postId}`, {
              state: {
                  boardName: boardName,
                  boardType: boardType
              },
              replace: true
          });
      } catch (err: any) {
          console.error('게시글 작성 실패:', err);
          const errorMessage = err.response?.data?.error?.message || '게시글 작성 중 오류가 발생했습니다.';
          alert(errorMessage);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handlePollClick = () => {
    // 투표 생성 페이지로 이동, 현재 입력 데이터 유지
    navigate('/community/create/poll', {
      state: {
        title,
        content,
        isAnonymous,
        pollData, // 편집 중이면 기존 투표 데이터 전달
        initialData, // 편집 모드 컨텍스트 유지를 위해 초기 데이터 전달
        isMyPost,
        boardName,
        boardType, // 게시판 타입 전달, 네비게이션 시 게시판 타입 유지
        boardId, // 게시판 ID 전달, 네비게이션 시 게시판 ID 유지
        id // ID 전달, 네비게이션 시 컨텍스트 유지
      }
    });
  };

  const handleTagClick = (tagId: number) => {
      setSelectedTagIds(prev => {
          // 이미 선택된 태그면 제거
          if (prev.includes(tagId)) {
              return prev.filter(id => id !== tagId);
          }
          // 최대 5개까지만 선택 가능
          if (prev.length >= 5) {
              alert('해시태그는 최대 5개까지만 선택할 수 있습니다.');
              return prev;
          }
          // 새 태그 추가
          return [...prev, tagId];
      });
  };

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col">
      {/* 상단 헤더 */}
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
          disabled={isSubmitting}
          className={`text-base font-bold ${isSubmitting ? 'text-gray-400' : 'text-gray-900'}`}
        >
          {isSubmitting ? '작성 중...' : '완료'}
        </button>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
        {/* 제목 입력 */}
        <div className="px-5 py-4 border-b border-gray-100">
          <input
            type="text"
            placeholder="제목을 입력하세요."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-medium placeholder-gray-400 outline-none text-gray-900"
          />
        </div>

        {/* 내용 입력 */}
        <div className="px-5 py-4 flex-1 min-h-[200px]">
          <textarea
            placeholder="내용을 입력하세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full text-base placeholder-gray-400 outline-none resize-none text-gray-600 leading-relaxed"
          />
        </div>
        
        {/* 투표 첨부 표시 */}
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

        {/* 해시태그 섹션 */}
        <div className="px-5 pb-8 mt-auto">
           <p className="text-gray-500 mb-3 text-base">
             해시태그를 선택하세요. ({selectedTagIds.length}/5)
           </p>
           {loadingTags ? (
             <div className="bg-gray-100/50 rounded-xl p-6 flex items-center justify-center">
               <span className="text-gray-400 text-sm">해시태그를 불러오는 중...</span>
             </div>
           ) : availableTags.length === 0 ? (
             <div className="bg-gray-100/50 rounded-xl p-6 flex items-center justify-center">
               <span className="text-gray-400 text-sm">사용 가능한 해시태그가 없습니다.</span>
             </div>
           ) : (
             <div className="bg-gray-100/50 rounded-xl p-6">
               <div className="grid grid-cols-3 gap-3">
                 {availableTags.map((tag) => {
                   const isSelected = selectedTagIds.includes(tag.id);
                   return (
                     <button
                       key={tag.id}
                       onClick={() => handleTagClick(tag.id)}
                       className={`text-xs py-1.5 rounded-md transition-colors font-medium ${
                         isSelected
                           ? 'bg-blue-500 text-white hover:bg-blue-600'
                           : 'bg-blue-100/80 text-gray-500 hover:bg-blue-200'
                       }`}
                     >
                       #{tag.name}
                     </button>
                   );
                 })}
               </div>
             </div>
           )}
        </div>
      </div>

      {/* 하단 바 */}
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

