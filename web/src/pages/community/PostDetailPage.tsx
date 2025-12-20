import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, User, Heart, MessageCircle, Bookmark, XSquare, CornerDownRight, Send, Check, EyeOff, X, LayoutGrid, Trash2, PenLine, MoreHorizontal, BarChart2, Loader2, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getPostDetail, togglePostReaction, togglePostScrap, deletePost, votePostPoll, removePostVote, type PostDetailResponse } from '../../api/community/post.api';
import { createComment, createReply, updateComment, deleteComment, toggleCommentReaction } from '../../api/community/comment.api';
import { getAbsoluteUrl } from '../../utils/url';
import { toKST, getNowKST } from '../../utils/date';

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

// 날짜 포맷팅 함수 (한국 시간 기준)
function formatDate(dateString: string): string {
  const date = toKST(dateString);
  const now = getNowKST();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

// 댓글 계층 구조를 평면 배열로 변환
function flattenComments(comments: PostDetailResponse['comments']): Comment[] {
  const result: Comment[] = [];
  let anonymousCounter = 0;
  
  const processComment = (comment: PostDetailResponse['comments'][0], isReply: boolean) => {
    // 원래 닉네임 결정
    let baseAuthorName: string;
    if (comment.author.isPostAuthor) {
      baseAuthorName = '글쓴이';
    } else if (comment.author.nickname === '익명') {
      baseAuthorName = `익명${++anonymousCounter}`;
    } else {
      baseAuthorName = comment.author.nickname;
    }
    
    // 내 댓글인 경우 뒤에 '(나)' 붙이기
    const authorName = comment.author.isMine ? `${baseAuthorName} (나)` : baseAuthorName;
    
    result.push({
      id: comment.id,
      author: authorName,
      isAuthor: comment.author.isPostAuthor,
      content: comment.content,
      time: formatDate(comment.timestamps.createdAt),
      likes: comment.counts.likes,
      isLiked: comment.userInteraction.reaction === 'like',
      isReply,
      isSecret: comment.isSecret,
      isBlocked: comment.isBlockedByFilter,
      isDeleted: comment.status === 'deleted',
      isEdited: comment.status === 'edited',
    });
    
    // 대댓글 처리
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.forEach((reply) => {
        processComment(reply, true);
      });
    }
  };
  
  comments.forEach((comment) => {
    if (comment.parentCommentId === null) {
      processComment(comment, false);
    }
  });
  
  return result;
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

  // Post Data State
  const [postDetail, setPostDetail] = useState<PostDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load post detail on mount
  useEffect(() => {
    const loadPostDetail = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const data = await getPostDetail(Number(id));
        setPostDetail(data);
        // 미디어 갤러리 인덱스 초기화
        setCurrentMediaIndex(0);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || '게시글을 불러오는데 실패했습니다.');
        console.error('Failed to load post detail:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPostDetail();
  }, [id]);

  // Update post data if returning from edit
  useEffect(() => {
    if (updatedPost && postDetail) {
      setPostDetail(prev => prev ? {
        ...prev,
        title: updatedPost.title,
        content: updatedPost.content,
        status: 'edited',
        timestamps: {
          ...prev.timestamps,
          updatedAt: new Date().toISOString(),
        },
      } : null);
    }
  }, [updatedPost, postDetail]);

  // UI State
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);

  // Interaction State (derived from postDetail)
  const isLiked = postDetail?.userInteraction.reaction === 'like';
  const isDisliked = postDetail?.userInteraction.reaction === 'dislike';
  const isScrapped = postDetail?.userInteraction.isScrapped || false;
  const likeCount = postDetail?.counts.likes || 0;
  const dislikeCount = postDetail?.counts.dislikes || 0;
  const scrapCount = postDetail?.counts.scraps || 0;

  // Comment State
  const [commentInput, setCommentInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSecret, setIsSecret] = useState(false);
  const [replyingToId, setReplyingToId] = useState<number | null>(null);

  // Comment Edit/Delete State
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  
  // Media Gallery State
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Comments Data (derived from postDetail)
  const comments: Comment[] = postDetail ? flattenComments(postDetail.comments) : [];

  // 요청 순서 추적을 위한 ref들
  const reactionRequestIdRef = useRef(0);
  const scrapRequestIdRef = useRef(0);
  const commentReactionRequestIdRef = useRef<Map<number, number>>(new Map());
  const commentEditRequestIdRef = useRef<Map<number, number>>(new Map());
  const commentDeleteRequestIdRef = useRef(0);

  const [isDeleting, setIsDeleting] = useState(false);

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
  const handleLike = async () => {
    if (!id || !postDetail) return;
    
    // 요청 ID 증가
    const requestId = ++reactionRequestIdRef.current;
    
    // 낙관적 업데이트: 즉시 UI 업데이트
    const currentReaction = postDetail.userInteraction.reaction;
    const wasLiked = currentReaction === 'like';
    const wasDisliked = currentReaction === 'dislike';
    
    setPostDetail(prev => prev ? {
      ...prev,
      counts: {
        ...prev.counts,
        likes: wasLiked ? prev.counts.likes - 1 : prev.counts.likes + 1,
        dislikes: wasDisliked ? prev.counts.dislikes - 1 : prev.counts.dislikes,
      },
      userInteraction: {
        ...prev.userInteraction,
        reaction: wasLiked ? null : 'like',
      },
    } : null);
    
    // 백그라운드에서 API 호출
    try {
      const result = await togglePostReaction(Number(id), 'like');
      // 가장 최근 요청인지 확인
      if (requestId === reactionRequestIdRef.current) {
        // 성공 시 서버 응답으로 최종 동기화
        setPostDetail(prev => prev ? {
          ...prev,
          counts: {
            ...prev.counts,
            likes: result.likesCount,
            dislikes: result.dislikesCount,
          },
          userInteraction: {
            ...prev.userInteraction,
            reaction: result.userReaction,
          },
        } : null);
      }
    } catch (err) {
      // 가장 최근 요청인지 확인
      if (requestId === reactionRequestIdRef.current) {
        // 실패 시 롤백
        if (id) {
          const data = await getPostDetail(Number(id));
          setPostDetail(data);
        }
      }
      console.error('Failed to toggle like:', err);
    }
  };

  const handleDislike = async () => {
    if (!id || !postDetail) return;
    
    // 요청 ID 증가
    const requestId = ++reactionRequestIdRef.current;
    
    // 낙관적 업데이트: 즉시 UI 업데이트
    const currentReaction = postDetail.userInteraction.reaction;
    const wasLiked = currentReaction === 'like';
    const wasDisliked = currentReaction === 'dislike';
    
    setPostDetail(prev => prev ? {
      ...prev,
      counts: {
        ...prev.counts,
        likes: wasLiked ? prev.counts.likes - 1 : prev.counts.likes,
        dislikes: wasDisliked ? prev.counts.dislikes - 1 : prev.counts.dislikes + 1,
      },
      userInteraction: {
        ...prev.userInteraction,
        reaction: wasDisliked ? null : 'dislike',
      },
    } : null);
    
    // 백그라운드에서 API 호출
    try {
      const result = await togglePostReaction(Number(id), 'dislike');
      // 가장 최근 요청인지 확인
      if (requestId === reactionRequestIdRef.current) {
        // 성공 시 서버 응답으로 최종 동기화
        setPostDetail(prev => prev ? {
          ...prev,
          counts: {
            ...prev.counts,
            likes: result.likesCount,
            dislikes: result.dislikesCount,
          },
          userInteraction: {
            ...prev.userInteraction,
            reaction: result.userReaction,
          },
        } : null);
      }
    } catch (err) {
      // 가장 최근 요청인지 확인
      if (requestId === reactionRequestIdRef.current) {
        // 실패 시 롤백
        if (id) {
          const data = await getPostDetail(Number(id));
          setPostDetail(data);
        }
      }
      console.error('Failed to toggle dislike:', err);
    }
  };

  const handleScrap = async () => {
    if (!id || !postDetail) return;
    
    // 요청 ID 증가
    const requestId = ++scrapRequestIdRef.current;
    
    // 낙관적 업데이트: 즉시 UI 업데이트
    const currentScrapped = postDetail.userInteraction.isScrapped;
    
    setPostDetail(prev => prev ? {
      ...prev,
      counts: {
        ...prev.counts,
        scraps: currentScrapped ? prev.counts.scraps - 1 : prev.counts.scraps + 1,
      },
      userInteraction: {
        ...prev.userInteraction,
        isScrapped: !currentScrapped,
      },
    } : null);
    
    // 백그라운드에서 API 호출
    try {
      const result = await togglePostScrap(Number(id));
      // 가장 최근 요청인지 확인
      if (requestId === scrapRequestIdRef.current) {
        // 성공 시 서버 응답으로 최종 동기화
        setPostDetail(prev => prev ? {
          ...prev,
          counts: {
            ...prev.counts,
            scraps: result.scrapCount,
          },
          userInteraction: {
            ...prev.userInteraction,
            isScrapped: result.isScrapped,
          },
        } : null);
      }
    } catch (err) {
      // 가장 최근 요청인지 확인
      if (requestId === scrapRequestIdRef.current) {
        // 실패 시 롤백
        if (id) {
          const data = await getPostDetail(Number(id));
          setPostDetail(data);
        }
      }
      console.error('Failed to toggle scrap:', err);
    }
  };

  const toggleCommentLike = async (commentId: number) => {
    if (!postDetail) return;
    
    // 댓글별 요청 ID 증가
    const currentId = commentReactionRequestIdRef.current.get(commentId) || 0;
    const requestId = currentId + 1;
    commentReactionRequestIdRef.current.set(commentId, requestId);
    
    // 댓글 찾기 헬퍼 함수
    const findComment = (comments: PostDetailResponse['comments'], targetId: number): PostDetailResponse['comments'][0] | null => {
      for (const comment of comments) {
        if (comment.id === targetId) return comment;
        if (comment.replies && comment.replies.length > 0) {
          for (const reply of comment.replies) {
            if (reply.id === targetId) return reply;
            // 중첩 대댓글도 확인
            if (reply.replies && reply.replies.length > 0) {
              for (const nestedReply of reply.replies) {
                if (nestedReply.id === targetId) return nestedReply;
              }
            }
          }
        }
      }
      return null;
    };
    
    const comment = findComment(postDetail.comments, commentId);
    if (!comment) return;
    
    // 낙관적 업데이트: 즉시 UI 업데이트
    const currentReaction = comment.userInteraction.reaction;
    const wasLiked = currentReaction === 'like';
    const wasDisliked = currentReaction === 'dislike';
    
    setPostDetail(prev => prev ? {
      ...prev,
      comments: prev.comments.map(c => {
        // 부모 댓글인 경우
        if (c.id === commentId) {
          return {
            ...c,
            counts: {
              likes: wasLiked ? c.counts.likes - 1 : c.counts.likes + 1,
              dislikes: wasDisliked ? c.counts.dislikes - 1 : c.counts.dislikes,
            },
            userInteraction: {
              reaction: wasLiked ? null : 'like',
            },
          };
        }
        // 대댓글인 경우
        if (c.replies && c.replies.length > 0) {
          return {
            ...c,
            replies: c.replies.map(reply => {
              if (reply.id === commentId) {
                return {
                  ...reply,
                  counts: {
                    likes: wasLiked ? reply.counts.likes - 1 : reply.counts.likes + 1,
                    dislikes: wasDisliked ? reply.counts.dislikes - 1 : reply.counts.dislikes,
                  },
                  userInteraction: {
                    reaction: wasLiked ? null : 'like',
                  },
                };
              }
              // 중첩 대댓글
              if (reply.replies && reply.replies.length > 0) {
                return {
                  ...reply,
                  replies: reply.replies.map((nestedReply: PostDetailResponse['comments'][0]) => 
                    nestedReply.id === commentId
                      ? {
                          ...nestedReply,
                          counts: {
                            likes: wasLiked ? nestedReply.counts.likes - 1 : nestedReply.counts.likes + 1,
                            dislikes: wasDisliked ? nestedReply.counts.dislikes - 1 : nestedReply.counts.dislikes,
                          },
                          userInteraction: {
                            reaction: wasLiked ? null : 'like',
                          },
                        }
                      : nestedReply
                  ),
                };
              }
              return reply;
            }),
          };
        }
        return c;
      }),
    } : null);
    
    // 백그라운드에서 API 호출
    try {
      await toggleCommentReaction(commentId, 'like');
      // 가장 최근 요청인지 확인
      if (requestId === commentReactionRequestIdRef.current.get(commentId)) {
        // 성공 시 전체 재조회하지 않고 낙관적 업데이트 유지
        // 필요시 여기서 서버 응답으로 동기화 가능
      }
    } catch (err) {
      // 가장 최근 요청인지 확인
      if (requestId === commentReactionRequestIdRef.current.get(commentId)) {
        // 실패 시 롤백
        if (id) {
          const data = await getPostDetail(Number(id));
          setPostDetail(data);
        }
      }
      console.error('Failed to toggle comment like:', err);
    }
  };

  const toggleCommentDislike = async (commentId: number) => {
    if (!postDetail) return;
    
    // 댓글별 요청 ID 증가
    const currentId = commentReactionRequestIdRef.current.get(commentId) || 0;
    const requestId = currentId + 1;
    commentReactionRequestIdRef.current.set(commentId, requestId);
    
    // 댓글 찾기 헬퍼 함수
    const findComment = (comments: PostDetailResponse['comments'], targetId: number): PostDetailResponse['comments'][0] | null => {
      for (const comment of comments) {
        if (comment.id === targetId) return comment;
        if (comment.replies && comment.replies.length > 0) {
          for (const reply of comment.replies) {
            if (reply.id === targetId) return reply;
            // 중첩 대댓글도 확인
            if (reply.replies && reply.replies.length > 0) {
              for (const nestedReply of reply.replies) {
                if (nestedReply.id === targetId) return nestedReply;
              }
            }
          }
        }
      }
      return null;
    };
    
    const comment = findComment(postDetail.comments, commentId);
    if (!comment) return;
    
    // 낙관적 업데이트: 즉시 UI 업데이트
    const currentReaction = comment.userInteraction.reaction;
    const wasLiked = currentReaction === 'like';
    const wasDisliked = currentReaction === 'dislike';
    
    setPostDetail(prev => prev ? {
      ...prev,
      comments: prev.comments.map(c => {
        // 부모 댓글인 경우
        if (c.id === commentId) {
          return {
            ...c,
            counts: {
              likes: wasLiked ? c.counts.likes - 1 : c.counts.likes,
              dislikes: wasDisliked ? c.counts.dislikes - 1 : c.counts.dislikes + 1,
            },
            userInteraction: {
              reaction: wasDisliked ? null : 'dislike',
            },
          };
        }
        // 대댓글인 경우
        if (c.replies && c.replies.length > 0) {
          return {
            ...c,
            replies: c.replies.map(reply => {
              if (reply.id === commentId) {
                return {
                  ...reply,
                  counts: {
                    likes: wasLiked ? reply.counts.likes - 1 : reply.counts.likes,
                    dislikes: wasDisliked ? reply.counts.dislikes - 1 : reply.counts.dislikes + 1,
                  },
                  userInteraction: {
                    reaction: wasDisliked ? null : 'dislike',
                  },
                };
              }
              // 중첩 대댓글
              if (reply.replies && reply.replies.length > 0) {
                return {
                  ...reply,
                  replies: reply.replies.map((nestedReply: PostDetailResponse['comments'][0]) => 
                    nestedReply.id === commentId
                      ? {
                          ...nestedReply,
                          counts: {
                            likes: wasLiked ? nestedReply.counts.likes - 1 : nestedReply.counts.likes,
                            dislikes: wasDisliked ? nestedReply.counts.dislikes - 1 : nestedReply.counts.dislikes + 1,
                          },
                          userInteraction: {
                            reaction: wasDisliked ? null : 'dislike',
                          },
                        }
                      : nestedReply
                  ),
                };
              }
              return reply;
            }),
          };
        }
        return c;
      }),
    } : null);
    
    // 백그라운드에서 API 호출
    try {
      await toggleCommentReaction(commentId, 'dislike');
      // 가장 최근 요청인지 확인
      if (requestId === commentReactionRequestIdRef.current.get(commentId)) {
        // 성공 시 전체 재조회하지 않고 낙관적 업데이트 유지
        // 필요시 여기서 서버 응답으로 동기화 가능
      }
    } catch (err) {
      // 가장 최근 요청인지 확인
      if (requestId === commentReactionRequestIdRef.current.get(commentId)) {
        // 실패 시 롤백
        if (id) {
          const data = await getPostDetail(Number(id));
          setPostDetail(data);
        }
      }
      console.error('Failed to toggle comment dislike:', err);
    }
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

  const handleSaveEditedComment = async (commentId: number) => {
      if (!editCommentContent.trim() || !postDetail) return;
      
      // 댓글별 요청 ID 증가
      const currentId = commentEditRequestIdRef.current.get(commentId) || 0;
      const requestId = currentId + 1;
      commentEditRequestIdRef.current.set(commentId, requestId);
      
      const newContent = editCommentContent.trim();
      const now = new Date().toISOString();
      
      // 낙관적 업데이트: 즉시 UI 업데이트
      setPostDetail(prev => prev ? {
        ...prev,
        comments: prev.comments.map(comment => {
          // 부모 댓글인 경우
          if (comment.id === commentId) {
            return {
              ...comment,
              content: newContent,
              status: 'edited',
              timestamps: {
                ...comment.timestamps,
                updatedAt: now,
              },
            };
          }
          // 대댓글인 경우
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: comment.replies.map(reply => 
                reply.id === commentId
                  ? {
                      ...reply,
                      content: newContent,
                      status: 'edited',
                      timestamps: {
                        ...reply.timestamps,
                        updatedAt: now,
                      },
                    }
                  : reply
              ),
            };
          }
          return comment;
        }),
      } : null);
      
      setEditingCommentId(null);
      const savedContent = editCommentContent;
      setEditCommentContent('');
      
      // 백그라운드에서 API 호출
      try {
        await updateComment(commentId, newContent);
        // 가장 최근 요청인지 확인
        if (requestId === commentEditRequestIdRef.current.get(commentId)) {
          // 성공 시 전체 재조회하지 않고 낙관적 업데이트 유지
        }
      } catch (err) {
        // 가장 최근 요청인지 확인
        if (requestId === commentEditRequestIdRef.current.get(commentId)) {
          // 실패 시 롤백
          if (id) {
            const data = await getPostDetail(Number(id));
            setPostDetail(data);
          }
          setEditCommentContent(savedContent);
          setEditingCommentId(commentId);
        }
        console.error('Failed to update comment:', err);
      }
  };

  const initiateDeleteComment = (commentId: number) => {
      setCommentToDelete(commentId);
      setActiveCommentMenuId(null);
  };

  const confirmDeleteComment = async () => {
      if (commentToDelete === null || !postDetail) return;
      
      // 요청 ID 증가
      const requestId = ++commentDeleteRequestIdRef.current;
      
      const commentIdToDelete = commentToDelete;
      
      // 낙관적 업데이트: 즉시 UI 업데이트 (status를 'deleted'로 변경)
      setPostDetail(prev => prev ? {
        ...prev,
        counts: {
          ...prev.counts,
          comments: prev.counts.comments - 1,
        },
        comments: prev.comments.map(comment => {
          // 부모 댓글인 경우
          if (comment.id === commentIdToDelete) {
            return {
              ...comment,
              status: 'deleted',
              content: '삭제된 댓글입니다.',
            };
          }
          // 대댓글인 경우
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: comment.replies.map(reply => 
                reply.id === commentIdToDelete
                  ? {
                      ...reply,
                      status: 'deleted',
                      content: '삭제된 댓글입니다.',
                    }
                  : reply
              ),
            };
          }
          return comment;
        }),
      } : null);
      
      setCommentToDelete(null);
      
      // 백그라운드에서 API 호출
      try {
        await deleteComment(commentIdToDelete);
        // 가장 최근 요청인지 확인
        if (requestId === commentDeleteRequestIdRef.current) {
          // 성공 시 전체 재조회하지 않고 낙관적 업데이트 유지
        }
      } catch (err) {
        // 가장 최근 요청인지 확인
        if (requestId === commentDeleteRequestIdRef.current) {
          // 실패 시 롤백
          if (id) {
            const data = await getPostDetail(Number(id));
            setPostDetail(data);
          }
        }
        console.error('Failed to delete comment:', err);
      }
  };

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || !id || isSubmittingComment) return;
    
    setIsSubmittingComment(true);
    
    try {
      const payload = {
        content: commentInput.trim(),
        isAnonymous,
        isSecret,
      };
      
      if (replyingToId !== null) {
        await createReply(replyingToId, payload);
      } else {
        await createComment(Number(id), payload);
      }
      
      setCommentInput('');
      setReplyingToId(null);
      
      // API 호출 성공 후 전체 재조회
      const data = await getPostDetail(Number(id));
      setPostDetail(data);
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
      if (!id) return;
      
      try {
        setIsDeleting(true);
        await deletePost(Number(id));
        setShowDeleteModal(false);
        // 삭제 성공 시 이전 페이지로 이동
        if (boardType === 'international') {
          navigate('/community/board/international');
        } else if (boardType === 'my') {
          navigate('/community/board/my');
        } else if (boardType) {
          navigate(`/community/board/${boardType}`);
        } else {
          navigate('/community/board/my');
        }
      } catch (err: any) {
        console.error('Failed to delete post:', err);
        const errorMessage = err.response?.data?.error?.message || '게시글 삭제 중 오류가 발생했습니다.';
        alert(errorMessage);
        setShowDeleteModal(false);
      } finally {
        setIsDeleting(false);
      }
  };

  const handleEditPost = () => {
      if (!postDetail) return;
      setShowMenu(false);
      
      // attachments를 AttachmentItem[] 형식으로 변환
      const attachments = [
        ...postDetail.attachments.images.map(img => ({ type: 'IMAGE' as const, url: img.url })),
        ...postDetail.attachments.videos.map(vid => ({ type: 'VIDEO' as const, url: vid.url }))
      ];
      
      // 태그 ID 배열 추출
      const tagIds = postDetail.tags.map(tag => tag.id);
      
      navigate(`/community/post/${id}/edit`, {
          state: {
              initialData: {
                  title: postDetail.title,
                  content: postDetail.content,
                  attachments: attachments,
                  tagIds: tagIds
              },
              isMyPost: postDetail.author.isMine,
              boardName: postDetail.board.name,
              boardType: boardType,
              boardId: postDetail.board.id
          }
      });
  };

  const handleVote = async (optionId: number) => {
      if (!id || !postDetail || !postDetail.poll || isVoting) return;

      setIsVoting(true);

      try {
        const result = await votePostPoll(Number(id), optionId);
        // 성공 시 서버 응답으로 업데이트
        setPostDetail(prev => prev ? {
          ...prev,
          poll: prev.poll ? {
            ...prev.poll,
            userVote: result.userVote,
            options: result.results.map(r => ({
              id: r.id,
              text: r.text,
              voteCount: r.voteCount,
            })),
          } : null,
        } : null);
      } catch (err) {
        console.error('Failed to vote:', err);
      } finally {
        setIsVoting(false);
      }
  };

  const handleRemoveVote = async () => {
      if (!id || !postDetail || !postDetail.poll || isVoting) return;

      setIsVoting(true);

      try {
        const result = await removePostVote(Number(id));
        // 성공 시 서버 응답으로 업데이트
        setPostDetail(prev => prev ? {
          ...prev,
          poll: prev.poll ? {
            ...prev.poll,
            userVote: result.userVote,
            options: result.results.map(r => ({
              id: r.id,
              text: r.text,
              voteCount: r.voteCount,
            })),
          } : null,
        } : null);
      } catch (err) {
        console.error('Failed to remove vote:', err);
      } finally {
        setIsVoting(false);
      }
  };

  // Close menus when clicking outside
  useEffect(() => {
      const handleClickOutside = () => setActiveCommentMenuId(null);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen font-sans flex items-center justify-center">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (error || !postDetail) {
    return (
      <div className="bg-white min-h-screen font-sans flex flex-col items-center justify-center px-4">
        <div className="text-red-500 mb-4">{error || '게시글을 불러올 수 없습니다.'}</div>
        <button 
          onClick={handleBack}
          className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const currentBoardName = postDetail.board.name || boardName;
  const isMyPostCheck = postDetail.author.isMine || isMyPost;

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
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900">{currentBoardName}</h1>
        
        {/* Right Icon: Menu for author, Report for others */}
        {isMyPostCheck ? (
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
            <div className="font-bold text-gray-900 text-sm">{postDetail.author.nickname}</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span>{formatDate(postDetail.timestamps.createdAt)}</span>
                {postDetail.status === 'edited' && <span>(수정됨)</span>}
            </div>
          </div>
        </div>

        {/* Title & Body */}
        <h2 className="text-xl font-bold text-gray-900 mb-3 leading-snug">{postDetail.title}</h2>
        <p className="text-base text-gray-600 mb-6 leading-relaxed whitespace-pre-wrap">
          {postDetail.content}
        </p>

        {/* Media Gallery (Images & Videos) - 텍스트 바로 다음 */}
        {(() => {
          const allMedia = [
            ...postDetail.attachments.images.map(img => ({ type: 'image' as const, url: img.url })),
            ...postDetail.attachments.videos.map(vid => ({ type: 'video' as const, url: vid.url }))
          ];
          
          if (allMedia.length === 0) return null;
          
          return (
            <div className="mb-6 relative flex items-center gap-2">
              {/* Left Arrow - 이미지 왼쪽 여백 */}
              {allMedia.length > 1 && (
                <button
                  onClick={() => setCurrentMediaIndex(prev => (prev > 0 ? prev - 1 : allMedia.length - 1))}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full flex items-center justify-center transition-colors shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              
              {/* Media Container */}
              <div className="relative flex-1 max-w-[280px] mx-auto aspect-square bg-gray-100 rounded-xl overflow-hidden">
                <div 
                  className="flex transition-transform duration-300 ease-out h-full"
                  style={{ transform: `translateX(-${currentMediaIndex * 100}%)` }}
                >
                  {allMedia.map((media, idx) => (
                    <div key={idx} className="min-w-full h-full relative flex items-center justify-center bg-black">
                      {media.type === 'image' ? (
                        <img 
                          src={getAbsoluteUrl(media.url)} 
                          alt={`게시글 이미지 ${idx + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error('이미지 로드 실패:', media.url);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="relative w-full h-full">
                          <video 
                            src={getAbsoluteUrl(media.url)}
                            className="w-full h-full object-contain"
                            controls
                            onError={() => {
                              console.error('동영상 로드 실패:', media.url);
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            동영상
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Media Indicators */}
                {allMedia.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {allMedia.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentMediaIndex(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentMediaIndex 
                            ? 'bg-white w-6' 
                            : 'bg-white/50 w-1.5 hover:bg-white/75'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Right Arrow - 이미지 오른쪽 여백 */}
              {allMedia.length > 1 && (
                <button
                  onClick={() => setCurrentMediaIndex(prev => (prev < allMedia.length - 1 ? prev + 1 : 0))}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full flex items-center justify-center transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })()}

        {/* Poll Section */}
        {postDetail.poll && (() => {
            // totalVotes를 한 번만 계산
            const totalVotes = postDetail.poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);
            
            return (
                <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-blue-500" />
                            <span className="font-bold text-gray-900">투표</span>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                            {totalVotes}명 참여
                        </span>
                    </div>
                    
                    <div className="space-y-2">
                        {postDetail.poll.options.map(option => {
                            const percent = totalVotes > 0 
                                ? Math.round((option.voteCount / totalVotes) * 100) 
                                : 0;
                            const isVoted = postDetail.poll!.userVote.selectedOptionId === option.id;
                            
                            return (
                                <div 
                                    key={option.id}
                                    onClick={() => !isVoting && handleVote(option.id)}
                                    className={`relative border rounded-lg p-3 transition-all overflow-hidden ${
                                        isVoting 
                                        ? 'cursor-not-allowed opacity-50' 
                                        : 'cursor-pointer btn-press'
                                    } ${
                                        isVoted 
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
                                                isVoted ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                                            }`}>
                                                {isVoted && <Check className="w-2.5 h-2.5 text-white animate-scale-in" strokeWidth={3} />}
                                            </div>
                                            <span className={`text-sm ${isVoted ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                                                {option.text}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500">{option.voteCount}명 ({percent}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {postDetail.poll.userVote.selectedOptionId !== null && (
                        <div className="mt-3 text-center">
                            <button 
                                onClick={handleRemoveVote}
                                disabled={isVoting}
                                className={`text-xs underline transition-colors ${
                                    isVoting 
                                    ? 'text-gray-300 cursor-not-allowed' 
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {isVoting ? (
                                    <span className="flex items-center gap-1 justify-center">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        처리 중...
                                    </span>
                                ) : (
                                    '투표 다시하기'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            );
        })()}

        {/* Hashtags */}
        {postDetail.tags.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
            {postDetail.tags.map((tag) => (
              <span key={tag.id} className="bg-blue-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-medium shrink-0">
                #{tag.name}
              </span>
            ))}
          </div>
        )}

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
                  <span className={`text-sm font-bold ${comment.isAuthor ? 'text-blue-500' : comment.author.includes('(나)') ? 'text-blue-500' : 'text-gray-900'}`}>
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
                        {comment.author.includes('(나)') ? (
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
                disabled={isSubmittingComment}
                className={`flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-gray-400 transition-colors ${
                  isSubmittingComment ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onKeyDown={(e) => e.key === 'Enter' && !isSubmittingComment && handleSubmitComment()}
            />
            <button 
                onClick={handleSubmitComment}
                disabled={!commentInput.trim() || isSubmittingComment}
                className={`p-2 rounded-full transition-all duration-300 ${
                  isSubmittingComment 
                    ? 'text-gray-400 bg-gray-200 scale-95 cursor-not-allowed' 
                    : commentInput.trim() 
                      ? 'text-blue-500 bg-blue-50 scale-100' 
                      : 'text-gray-400 bg-gray-200 scale-95'
                }`}
            >
                {isSubmittingComment ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
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
                          disabled={isDeleting}
                          className="flex-1 py-3 text-base font-medium text-gray-600 hover:bg-gray-400/10 active:bg-gray-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          취소
                      </button>
                      <div className="w-[1px] bg-gray-400/30" />
                      <button 
                          onClick={handleDeletePost}
                          disabled={isDeleting}
                          className="flex-1 py-3 text-base font-medium text-gray-600 hover:bg-gray-400/10 active:bg-gray-400/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                          {isDeleting ? (
                              <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  삭제 중...
                              </>
                          ) : (
                              '삭제'
                          )}
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