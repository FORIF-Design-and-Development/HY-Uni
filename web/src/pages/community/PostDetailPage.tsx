import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, User, Heart, MessageCircle, Bookmark, XSquare, CornerDownRight, Send, Check, EyeOff, X, LayoutGrid, Trash2, PenLine, MoreHorizontal, BarChart2 } from 'lucide-react';

interface Comment {
  id: number;
  author: string;
  isAuthor: boolean; // 글쓴이 여부
  content: string;
  time: string;
  likes: number;
  isLiked: boolean;
  isReply: boolean;
  isSecret?: boolean;
  isBlocked?: boolean;
  isDeleted?: boolean;
  isEdited?: boolean;
}

interface PollOption {
  id: number;
  text: string;
  votes: number;
  isVoted: boolean;
}

interface Poll {
  options: PollOption[];
  allowMultiple: boolean;
  totalVotes: number;
  isClosed?: boolean;
}

const PostDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Navigation State
  const boardName = location.state?.boardName || '자유 게시판';
  const isMyPost = location.state?.isMyPost || false;
  const updatedPost = location.state?.updatedPost;
  const boardType = location.state?.boardType;

  // Post Data State with Poll
  const [postData, setPostData] = useState<{
      title: string;
      content: string;
      time: string;
      isEdited: boolean;
      poll?: Poll;
  }>({
    title: '크리스마스 기다려져><',
    content: '크리스마스 때 다들 뭐할 거야??\n나만 아직 계획없는 거 아니지\n\n일본 가고 싶은데 어느 도시로 갈지 모르겠어ㅠㅠ',
    time: '09/30 11:30',
    isEdited: false,
    poll: { // Mock Poll Data
        allowMultiple: false,
        totalVotes: 12,
        options: [
            { id: 1, text: '도쿄 (디즈니랜드 가야지)', votes: 5, isVoted: false },
            { id: 2, text: '오사카 (유니버셜 스튜디오!)', votes: 4, isVoted: true }, // Current user voted here
            { id: 3, text: '삿포로 (눈 구경)', votes: 3, isVoted: false },
            { id: 4, text: '후쿠오카 (온천 여행)', votes: 0, isVoted: false }
        ]
    }
  });

  // Update post data if returning from edit
  useEffect(() => {
    if (updatedPost) {
      setPostData(prev => ({
        ...prev,
        title: updatedPost.title,
        content: updatedPost.content,
        isEdited: true,
      }));
    }
  }, [updatedPost]);

  // UI State
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);

  // Interaction State
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isScrapped, setIsScrapped] = useState(false);
  const [likeCount, setLikeCount] = useState(3);
  const [dislikeCount, setDislikeCount] = useState(1);
  const [scrapCount, setScrapCount] = useState(1);

  // Comment State
  const [commentInput, setCommentInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSecret, setIsSecret] = useState(false);
  const [replyingToId, setReplyingToId] = useState<number | null>(null);

  // Comment Edit/Delete State
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  // Mock Comments Data
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 1,
      author: '익명1',
      isAuthor: false,
      content: '크리스마스 빨리 왔음 좋겠당><\n나는 뭐할지도 모르겠는데...?',
      time: '09/30 13:30',
      likes: 3,
      isLiked: false,
      isReply: false,
    },
    {
      id: 2,
      author: '글쓴이',
      isAuthor: true,
      content: '남친이나 여친없어?\n가까운 데 놀러가 ㄱㄱ',
      time: '09/30 13:30',
      likes: 1,
      isLiked: false,
      isReply: true,
    },
    {
        id: 3,
        author: '나',
        isAuthor: false,
        content: '남친이나 여친없으세요?\n가까운 데 놀러가세요.',
        time: '09/30 13:30',
        likes: 0,
        isLiked: false,
        isReply: true,
        isSecret: false,
    },
    {
        id: 4,
        author: '(차단)',
        isAuthor: false,
        content: '차단된 키워드를 포함한 댓글입니다.',
        time: '',
        likes: 0,
        isLiked: false,
        isReply: true,
        isBlocked: true,
    },
    {
        id: 5,
        author: '(삭제)',
        isAuthor: false,
        content: '삭제된 댓글입니다.',
        time: '',
        likes: 0,
        isLiked: false,
        isReply: false,
        isDeleted: true,
    }
  ]);

  const handleBack = () => {
      if (boardType === 'international') {
          navigate('/community/board/international');
      } else if (boardType === 'my') {
          navigate('/community/board/my');
      } else if (boardType) {
          navigate(`/community/board/${boardType}`);
      } else {
          navigate(-1);
      }
  };

  // Handlers
  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      if (isDisliked) {
        setIsDisliked(false);
        setDislikeCount(prev => prev - 1);
      }
    }
  };

  const handleDislike = () => {
    if (isDisliked) {
      setIsDisliked(false);
      setDislikeCount(prev => prev - 1);
    } else {
      setIsDisliked(true);
      setDislikeCount(prev => prev + 1);
      if (isLiked) {
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      }
    }
  };

  const handleScrap = () => {
    setIsScrapped(!isScrapped);
    setScrapCount(prev => isScrapped ? prev - 1 : prev + 1);
  };

  const toggleCommentLike = (commentId: number) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked: !comment.isLiked,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
        };
      }
      return comment;
    }));
  };

  const handleReplyClick = (commentId: number) => {
    setReplyingToId(commentId);
    if (inputRef.current) {
        inputRef.current.focus();
    }
  };

  const cancelReply = () => {
      setReplyingToId(null);
  };

  // Comment Edit/Delete Handlers
  const openCommentMenu = (e: React.MouseEvent, commentId: number) => {
      e.stopPropagation();
      setActiveCommentMenuId(activeCommentMenuId === commentId ? null : commentId);
  };

  const handleEditCommentClick = (comment: Comment) => {
      setEditingCommentId(comment.id);
      setEditCommentContent(comment.content);
      setActiveCommentMenuId(null);
  };

  const handleSaveEditedComment = (commentId: number) => {
      if (!editCommentContent.trim()) return;
      
      setComments(comments.map(c => 
          c.id === commentId 
          ? { 
              ...c, 
              content: editCommentContent, 
              isEdited: true, 
              time: '09/30 15:30' // Updated mock time
            } 
          : c
      ));
      setEditingCommentId(null);
  };

  const initiateDeleteComment = (commentId: number) => {
      setCommentToDelete(commentId);
      setActiveCommentMenuId(null);
  };

  const confirmDeleteComment = () => {
      if (commentToDelete === null) return;
      
      setComments(comments.map(c => 
          c.id === commentToDelete 
          ? { 
              ...c, 
              isDeleted: true, 
              content: '삭제된 댓글입니다.', 
              author: '(삭제)', 
              isAuthor: false,
              likes: 0
            } 
          : c
      ));
      setCommentToDelete(null);
  };

  const handleSubmitComment = () => {
    if (!commentInput.trim()) return;
    
    const newComment: Comment = {
      id: Date.now(),
      author: isAnonymous ? '익명' : '나',
      isAuthor: false,
      content: commentInput,
      time: '방금 전',
      likes: 0,
      isLiked: false,
      isReply: replyingToId !== null,
      isSecret: isSecret,
    };

    if (replyingToId !== null) {
        const parentIndex = comments.findIndex(c => c.id === replyingToId);
        let insertIndex = parentIndex + 1;
        while(insertIndex < comments.length && comments[insertIndex].isReply) {
            insertIndex++;
        }
        
        const newComments = [...comments];
        newComments.splice(insertIndex, 0, newComment);
        setComments(newComments);
        setReplyingToId(null);
    } else {
        setComments([...comments, newComment]);
    }
    setCommentInput('');
    // Scroll to bottom or new comment logic could be added here
  };

  const handleDeletePost = () => {
      // Logic to delete post, then redirect to My Board list
      navigate('/community/board/my');
  };

  const handleEditPost = () => {
      setShowMenu(false);
      navigate(`/community/post/${id}/edit`, {
          state: {
              initialData: {
                  title: postData.title,
                  content: postData.content
              },
              isMyPost: true,
              boardName: boardName,
              boardType: boardType
          }
      });
  };

  const handleVote = (optionId: number) => {
      if (!postData.poll) return;

      const newOptions = postData.poll.options.map(opt => {
          if (postData.poll!.allowMultiple) {
              if (opt.id === optionId) {
                  return { ...opt, isVoted: !opt.isVoted, votes: opt.isVoted ? opt.votes - 1 : opt.votes + 1 };
              }
              return opt;
          } else {
              if (opt.id === optionId) {
                   return { ...opt, isVoted: true, votes: opt.votes + 1 };
              }
              // Unvote others if single choice
              return { ...opt, isVoted: false, votes: opt.isVoted ? opt.votes - 1 : opt.votes };
          }
      });
      
      const newTotal = newOptions.reduce((acc, curr) => acc + curr.votes, 0);

      setPostData({
          ...postData,
          poll: {
              ...postData.poll,
              options: newOptions,
              totalVotes: newTotal
          }
      });
  };

  // Close menus when clicking outside
  useEffect(() => {
      const handleClickOutside = () => setActiveCommentMenuId(null);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col relative pb-20">
      {/* Header */}
      <header className="flex items-center h-14 px-4 bg-white sticky top-0 z-20 border-b border-gray-100 animate-fade-in-up">
        <button 
          onClick={handleBack} 
          className="p-2 -ml-2 text-gray-900 rounded-full hover:bg-gray-100 transition-colors btn-press"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900">{boardName}</h1>
        
        {/* Right Icon: Menu for author, Report for others */}
        {isMyPost ? (
            <div className="relative">
                <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 -mr-2 text-gray-900 rounded-full hover:bg-gray-100 btn-press"
                >
                    <LayoutGrid className="w-6 h-6" />
                </button>
                
                {/* Menu Dropdown */}
                {showMenu && (
                    <>
                        <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowMenu(false)} 
                        />
                        <div className="absolute right-0 top-full mt-1 w-32 bg-gray-200/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg z-20 flex flex-col border border-gray-200 animate-scale-in origin-top-right">
                             <button 
                                onClick={() => { setShowMenu(false); setShowDeleteModal(true); }}
                                className="px-4 py-3 text-sm text-gray-700 hover:bg-white/50 flex items-center gap-2 border-b border-gray-300/50"
                             >
                                 <Trash2 className="w-4 h-4" />
                                 삭제
                             </button>
                             <button 
                                onClick={handleEditPost}
                                className="px-4 py-3 text-sm text-gray-700 hover:bg-white/50 flex items-center gap-2"
                             >
                                 <PenLine className="w-4 h-4" />
                                 수정
                             </button>
                        </div>
                    </>
                )}
            </div>
        ) : (
            <button className="p-2 -mr-2 text-gray-900 btn-press">
              <AlertTriangle className="w-5 h-5" />
            </button>
        )}
      </header>

      {/* Post Content */}
      <div className="px-5 py-6 border-b border-gray-100 animate-fade-in-up delay-75">
        {/* Author Info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">익명</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span>{postData.time}</span>
                {postData.isEdited && <span>(수정됨)</span>}
            </div>
          </div>
        </div>

        {/* Title & Body */}
        <h2 className="text-xl font-bold text-gray-900 mb-3 leading-snug">{postData.title}</h2>
        <p className="text-base text-gray-600 mb-6 leading-relaxed whitespace-pre-wrap">
          {postData.content}
        </p>

        {/* Poll Section */}
        {postData.poll && (
            <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-blue-500" />
                        <span className="font-bold text-gray-900">투표</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                        {postData.poll.totalVotes}명 참여 {postData.poll.allowMultiple ? '· 복수선택' : ''}
                    </span>
                </div>
                
                <div className="space-y-2">
                    {postData.poll.options.map(option => {
                        const percent = postData.poll!.totalVotes > 0 
                            ? Math.round((option.votes / postData.poll!.totalVotes) * 100) 
                            : 0;
                        
                        return (
                            <div 
                                key={option.id}
                                onClick={() => handleVote(option.id)}
                                className={`relative border rounded-lg p-3 cursor-pointer transition-all overflow-hidden btn-press ${
                                    option.isVoted 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                {/* Progress Bar Background */}
                                <div 
                                    className="absolute top-0 left-0 bottom-0 bg-blue-100/50 transition-all duration-500 ease-out"
                                    style={{ width: `${percent}%` }}
                                />
                                
                                <div className="relative flex justify-between items-center z-10">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                            option.isVoted ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                                        }`}>
                                            {option.isVoted && <Check className="w-2.5 h-2.5 text-white animate-scale-in" strokeWidth={3} />}
                                        </div>
                                        <span className={`text-sm ${option.isVoted ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                                            {option.text}
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-500">{option.votes}명 ({percent}%)</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-3 text-center">
                    <button className="text-xs text-gray-400 hover:text-gray-600 underline">
                        투표 다시하기
                    </button>
                </div>
            </div>
        )}

        {/* Hashtags */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {['#크리스마스', '#겨울방학', '#일본여행'].map((tag, idx) => (
            <span key={idx} className="bg-blue-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-medium shrink-0">
              {tag}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-around py-2">
          <button 
            onClick={handleLike}
            className={`flex flex-col items-center gap-1 btn-press transition-colors ${isLiked ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <Heart className={`w-6 h-6 transition-all duration-200 ${isLiked ? 'fill-blue-500 animate-pop' : ''}`} />
            <span className="text-xs font-medium">좋아요 <span className="ml-0.5">{likeCount}</span></span>
          </button>

          <button 
            onClick={handleDislike}
            className={`flex flex-col items-center gap-1 btn-press transition-colors ${isDisliked ? 'text-red-500' : 'text-gray-400'}`}
          >
            <XSquare className={`w-6 h-6 transition-all duration-200 ${isDisliked ? 'fill-red-500 animate-pop' : ''}`} />
            <span className="text-xs font-medium">싫어요 <span className="ml-0.5">{dislikeCount}</span></span>
          </button>

          <div className="flex flex-col items-center gap-1 text-gray-400">
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs font-medium">댓글 <span className="ml-0.5">{comments.length}</span></span>
          </div>

          <button 
            onClick={handleScrap}
            className={`flex flex-col items-center gap-1 btn-press transition-colors ${isScrapped ? 'text-yellow-400' : 'text-gray-400'}`}
          >
            <Bookmark className={`w-6 h-6 transition-all duration-200 ${isScrapped ? 'fill-yellow-400 animate-pop' : ''}`} />
            <span className="text-xs font-medium">스크랩 <span className="ml-0.5">{scrapCount}</span></span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <div className="flex-1 bg-white">
        {comments.map((comment, idx) => (
          <div 
            key={comment.id} 
            className={`flex p-5 border-b border-gray-50 ${comment.isReply ? 'bg-gray-50/50' : ''} animate-fade-in-up`}
            style={{ animationDelay: `${100 + (idx * 50)}ms` }}
          >
            {comment.isReply && (
              <div className="mr-3 pt-1 text-gray-400">
                <CornerDownRight className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  {comment.isAuthor ? (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <span className={`text-sm font-bold ${comment.isAuthor ? 'text-blue-500' : comment.author === '나' ? 'text-blue-500' : 'text-gray-900'}`}>
                    {comment.author}
                  </span>
                </div>
                
                {!comment.isBlocked && !comment.isDeleted && (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => toggleCommentLike(comment.id)}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-xs btn-press transition-colors ${
                                comment.isLiked 
                                ? 'border-red-200 bg-red-50 text-red-500' 
                                : 'border-gray-200 text-gray-400'
                            }`}
                        >
                            <Heart className={`w-3 h-3 transition-colors ${comment.isLiked ? 'fill-red-500' : ''}`} />
                            <span>{comment.likes}</span>
                        </button>
                        
                        {!comment.isReply && (
                            <button 
                                onClick={() => handleReplyClick(comment.id)}
                                className="text-gray-400 hover:text-gray-600 btn-press"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </button>
                        )}

                        {/* If it's my comment, show Edit/Delete Menu, otherwise show Report */}
                        {comment.author === '나' ? (
                             <div className="relative">
                                <button 
                                    onClick={(e) => openCommentMenu(e, comment.id)}
                                    className="text-gray-400 hover:text-gray-600 p-0.5 btn-press"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                                {activeCommentMenuId === comment.id && (
                                    <div className="absolute right-0 top-full mt-1 w-24 bg-gray-200/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-gray-200 z-10 flex flex-col animate-scale-in origin-top-right">
                                        <button 
                                            onClick={() => initiateDeleteComment(comment.id)}
                                            className="px-3 py-2 text-xs text-blue-900 hover:bg-white/50 flex items-center gap-2 border-b border-gray-300/50"
                                        >
                                            <Trash2 className="w-3 h-3" /> 삭제
                                        </button>
                                        <button 
                                            onClick={() => handleEditCommentClick(comment)}
                                            className="px-3 py-2 text-xs text-blue-900 hover:bg-white/50 flex items-center gap-2"
                                        >
                                            <PenLine className="w-3 h-3" /> 수정
                                        </button>
                                    </div>
                                )}
                             </div>
                        ) : (
                            <button className="text-gray-400 hover:text-gray-600 btn-press">
                                <AlertTriangle className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
              </div>

              <div className="pl-10">
                {/* Content Rendering (View vs Edit Mode) */}
                {editingCommentId === comment.id ? (
                    <div className="mt-1 mb-2 animate-fade-in-up">
                        <textarea 
                            value={editCommentContent}
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            className="w-full p-2 text-sm text-gray-900 border border-gray-300 rounded-md outline-none resize-none bg-gray-50 focus:bg-white focus:border-blue-400 transition-colors"
                            rows={3}
                        />
                        <div className="flex justify-end gap-2 mt-1">
                            <button 
                                onClick={() => setEditingCommentId(null)}
                                className="px-3 py-1 text-xs text-gray-500 bg-gray-200 rounded-md btn-press"
                            >
                                취소
                            </button>
                            <button 
                                onClick={() => handleSaveEditedComment(comment.id)}
                                className="px-3 py-1 text-xs text-white bg-blue-500 rounded-md btn-press"
                            >
                                완료
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {comment.isBlocked ? (
                            <div className="bg-gray-100 p-3 rounded-md text-gray-500 text-sm">
                                {comment.content}
                            </div>
                        ) : (
                            <p className={`text-sm mb-1.5 whitespace-pre-wrap ${
                                comment.isDeleted 
                                ? 'text-gray-400' 
                                : comment.isSecret 
                                ? 'text-gray-400' 
                                : 'text-gray-700'
                            }`}>
                                {comment.content}
                            </p>
                        )}
                    </>
                )}
                
                {/* Footer Info */}
                {!comment.isBlocked && !comment.isDeleted && editingCommentId !== comment.id && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        {comment.isEdited && <span>(수정됨)</span>}
                        <span>{comment.time}</span>
                    </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gray-100 px-4 py-3 border-t border-gray-200 z-20 animate-fade-in-up">
        {replyingToId !== null && (
            <div className="flex items-center justify-between bg-blue-50 px-3 py-1.5 mb-2 rounded-lg border border-blue-100 animate-fade-in-up">
                <span className="text-xs text-blue-600 font-medium">대댓글 작성 중...</span>
                <button onClick={cancelReply} className="text-gray-400 hover:text-gray-600 btn-press">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        )}

        <div className="flex items-center justify-between mb-2">
             <div className="flex gap-3">
                 <button 
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className="flex items-center gap-1.5 focus:outline-none btn-press"
                 >
                     <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isAnonymous ? 'bg-blue-500 border-blue-500' : 'border-gray-400 bg-white'}`}>
                        {isAnonymous && <Check className="w-3 h-3 text-white animate-scale-in" strokeWidth={3} />}
                     </div>
                     <span className={`text-xs font-bold transition-colors ${isAnonymous ? 'text-blue-500' : 'text-gray-500'}`}>익명</span>
                 </button>

                 <button 
                    onClick={() => setIsSecret(!isSecret)}
                    className="flex items-center gap-1.5 focus:outline-none btn-press"
                 >
                     <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSecret ? 'bg-blue-500 border-blue-500' : 'border-gray-400 bg-white'}`}>
                        {isSecret && <EyeOff className="w-2.5 h-2.5 text-white animate-scale-in" />}
                     </div>
                     <span className={`text-xs font-bold transition-colors ${isSecret ? 'text-blue-500' : 'text-gray-500'}`}>비밀</span>
                 </button>
             </div>
        </div>
        
        <div className="flex gap-2 items-center">
            <input 
                ref={inputRef}
                type="text" 
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={replyingToId !== null ? "대댓글을 입력하세요." : "댓글을 입력하세요."}
                className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
            />
            <button 
                onClick={handleSubmitComment}
                disabled={!commentInput.trim()}
                className={`p-2 rounded-full transition-all duration-300 ${commentInput.trim() ? 'text-blue-500 bg-blue-50 scale-100' : 'text-gray-400 bg-gray-200 scale-95'}`}
            >
                <Send className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Delete Post Modal */}
      {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
              <div className="bg-gray-300 w-[280px] rounded-2xl overflow-hidden shadow-xl animate-scale-in">
                  <div className="px-4 py-6 text-center">
                      <p className="text-base font-bold text-gray-700">정말로 삭제하시겠습니까?</p>
                  </div>
                  <div className="flex border-t border-gray-400/30">
                      <button 
                          onClick={() => setShowDeleteModal(false)}
                          className="flex-1 py-3 text-base font-medium text-gray-600 hover:bg-gray-400/10 active:bg-gray-400/20"
                      >
                          취소
                      </button>
                      <div className="w-[1px] bg-gray-400/30" />
                      <button 
                          onClick={handleDeletePost}
                          className="flex-1 py-3 text-base font-medium text-gray-600 hover:bg-gray-400/10 active:bg-gray-400/20"
                      >
                          삭제
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Comment Modal */}
      {commentToDelete !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
              <div className="bg-gray-300 w-[280px] rounded-2xl overflow-hidden shadow-xl animate-scale-in">
                  <div className="px-4 py-6 text-center">
                      <p className="text-base font-bold text-gray-700">정말로 삭제하시겠습니까?</p>
                  </div>
                  <div className="flex border-t border-gray-400/30">
                      <button 
                          onClick={() => setCommentToDelete(null)}
                          className="flex-1 py-3 text-base font-medium text-gray-600 hover:bg-gray-400/10 active:bg-gray-400/20"
                      >
                          취소
                      </button>
                      <div className="w-[1px] bg-gray-400/30" />
                      <button 
                          onClick={confirmDeleteComment}
                          className="flex-1 py-3 text-base font-medium text-gray-600 hover:bg-gray-400/10 active:bg-gray-400/20"
                      >
                          삭제
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PostDetailPage;