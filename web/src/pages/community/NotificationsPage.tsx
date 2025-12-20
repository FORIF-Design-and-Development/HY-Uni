import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  getNotifications,
  Notification,
  NotificationType,
  getNotificationStreamUrl,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../../api/community/notification.api';
import { getHomeData } from '../../api/community/home.api';
import { getBoardPosts, BoardPostListItem } from '../../api/community/post.api';
import { searchPosts, SearchResult } from '../../api/community/search.api';
import { toKST, getNowKST } from '../../utils/date';
import { CheckCheck } from 'lucide-react';

type TabType = 'general' | 'my' | 'keyword';

interface NotificationItem {
  id: number;
  category?: string;
  title: string;
  content: string;
  date: string;
  postId?: number; // 게시글 클릭을 위한 ID
  isRead: boolean;
  rawType: NotificationType; // 필터링을 위해 원본 타입 유지
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

// 알림 타입에 따른 탭 분류
function getNotificationTab(type: NotificationType): TabType | null {
  if (type === 'new_post_in_board') {
    return 'general'; // 즐겨찾기 게시판 새 게시글
  }
  if (
    type === 'new_comment_on_post' ||
    type === 'new_reply_on_comment' ||
    type === 'new_reaction_on_post' ||
    type === 'new_reaction_on_comment'
  ) {
    return 'my'; // 내 게시글/댓글 관련
  }
  return null; // 키워드 알림은 현재 API에 없음
}

// 알림 타입에 따른 제목 생성
function getNotificationTitle(type: NotificationType): string {
  switch (type) {
    case 'new_comment_on_post':
      return '내가 쓴 게시글에 새로운 댓글이 달렸습니다.';
    case 'new_reply_on_comment':
      return '내가 쓴 댓글에 새로운 대댓글이 달렸습니다.';
    case 'new_reaction_on_post':
      return '내가 쓴 게시글이 좋아요를 받았습니다.';
    case 'new_reaction_on_comment':
      return '내가 쓴 댓글이 좋아요를 받았습니다.';
    case 'new_post_in_board':
      return ''; // 게시글 제목 사용
    default:
      return '';
  }
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteBoardIds, setFavoriteBoardIds] = useState<number[]>([]);
  const [preferredKeywords, setPreferredKeywords] = useState<string[]>([]);
  const eventSourceRef = React.useRef<EventSource | null>(null);

  // 즐겨찾기 게시판 ID 및 선호 키워드 조회
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const homeData = await getHomeData();
        const ids = homeData.favoriteBoards.map(board => board.id);
        setFavoriteBoardIds(ids);
        const keywords = homeData.userPreferences.keywords.map(k => k.name);
        setPreferredKeywords(keywords);
      } catch (err) {
        console.error('사용자 설정 조회 실패:', err);
      }
    };
    loadUserPreferences();
  }, []);

  // 단일 알림 처리 함수 (SSE 및 목록 조회 공용)
  const processNotification = (notification: Notification): NotificationItem | null => {
    if (!notification.entityId) return null;

    try {
      const notificationTab = getNotificationTab(notification.type);

      // 현재 탭과 일치하지 않으면 무시 (실시간 알림일 경우 탭에 따라 필터링)
      if (activeTab === 'general' && notificationTab !== 'general') return null;
      if (activeTab === 'my' && notificationTab !== 'my') return null;
      if (activeTab === 'keyword') return null;

      // 데이터가 없는 경우 (오류 상황)
      if (!notification.postTitle || !notification.boardName || !notification.boardId) {
        return null;
      }

      // 일반 탭: 즐겨찾기 게시판인지 확인
      if (activeTab === 'general') {
        if (favoriteBoardIds.length > 0 && notification.boardId && !favoriteBoardIds.includes(notification.boardId)) {
          return null;
        }

        return {
          id: notification.id,
          category: notification.boardName,
          title: notification.postTitle || '',
          content: notification.postContent ? (
            notification.postContent.length > 50
              ? notification.postContent.substring(0, 50) + '...'
              : notification.postContent
          ) : '',
          date: formatDate(notification.createdAt),
          postId: notification.entityId,
          isRead: notification.isRead,
          rawType: notification.type,
        };
      }
      // My 탭: 내 게시글/댓글 관련 알림
      else if (activeTab === 'my') {
        const title = getNotificationTitle(notification.type);

        let content = '';
        if (notification.type === 'new_comment_on_post' || notification.type === 'new_reply_on_comment') {
          content = notification.postContent ? (
            notification.postContent.length > 50
              ? notification.postContent.substring(0, 50) + '...'
              : notification.postContent
          ) : '';
        }

        return {
          id: notification.id,
          title,
          content,
          date: formatDate(notification.createdAt),
          postId: notification.entityId,
          isRead: notification.isRead,
          rawType: notification.type,
        };
      }

      return null;
    } catch (err: any) {
      return null;
    }
  };

  // 게시글을 NotificationItem으로 변환하는 함수
  const convertPostToNotificationItem = (post: BoardPostListItem): NotificationItem => {
    return {
      id: post.id,
      category: post.board.name,
      title: post.title,
      content: post.contentSnippet || (post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content),
      date: formatDate(post.createdAt),
      postId: post.id,
      isRead: false, // 일반 탭에서는 항상 읽지 않은 상태
      rawType: 'new_post_in_board' as NotificationType,
    };
  };

  // 검색 결과를 NotificationItem으로 변환하는 함수
  const convertSearchResultToNotificationItem = (result: SearchResult): NotificationItem => {
    return {
      id: result.id,
      category: result.board?.name || '',
      title: result.title,
      content: result.contentSnippet || '',
      date: formatDate(result.createdAt),
      postId: result.id,
      isRead: false, // 키워드 탭에서는 항상 읽지 않은 상태
      rawType: 'new_post_in_board' as NotificationType,
    };
  };

  // 알림 목록 조회
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 일반 탭: 즐겨찾기 게시판의 모든 게시글 조회
        if (activeTab === 'general') {
          if (favoriteBoardIds.length === 0) {
            setNotifications([]);
            setLoading(false);
            return;
          }

          // 모든 즐겨찾기 게시판에서 게시글 목록을 병렬로 조회
          const postPromises = favoriteBoardIds.map(boardId =>
            getBoardPosts({
              boardId,
              page: 1,
              pageSize: 50,
              sortBy: 'latest'
            }).catch(err => {
              console.error(`게시판 ${boardId} 게시글 조회 실패:`, err);
              return null; // 일부 게시판 실패 시에도 다른 게시판 데이터는 표시
            })
          );

          const postResponses = await Promise.all(postPromises);
          
          // 모든 게시글을 하나의 배열로 병합
          const allPosts: BoardPostListItem[] = [];
          postResponses.forEach(response => {
            if (response && response.posts) {
              allPosts.push(...response.posts);
            }
          });

          // createdAt 기준 최신순 정렬
          allPosts.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

          // NotificationItem 형태로 변환 (읽음 상태 반영)
          const notificationItems = allPosts.map(convertPostToNotificationItem);
          setNotifications(notificationItems);
        }
        // My 탭: 알림 조회
        else if (activeTab === 'my') {
          // 모든 알림 조회 (백엔드에서 JOIN된 데이터가 옴)
          const response = await getNotifications(50, 0); // limit 50

          // My 탭: 댓글, 답글, 반응 관련 알림만 필터링
          const filteredNotifications = response.notifications.filter(
            (n) =>
              n.type === 'new_comment_on_post' ||
              n.type === 'new_reply_on_comment' ||
              n.type === 'new_reaction_on_post' ||
              n.type === 'new_reaction_on_comment'
          );

          // 최신순 정렬 보장 (createdAt 기준 내림차순)
          filteredNotifications.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

          // 매핑 처리
          const validNotifications = filteredNotifications
            .map(processNotification)
            .filter((item): item is NotificationItem => item !== null);

          setNotifications(validNotifications);
        }
        // 키워드 탭: 선호 키워드로 게시글 검색
        else if (activeTab === 'keyword') {
          if (preferredKeywords.length === 0) {
            setNotifications([]);
            setLoading(false);
            return;
          }

          // 각 선호 키워드별로 게시글 검색 (병렬 처리)
          const searchPromises = preferredKeywords.map(keyword =>
            searchPosts(keyword, 1, 50, 'relevance').catch(err => {
              console.error(`키워드 "${keyword}" 검색 실패:`, err);
              return null; // 일부 키워드 검색 실패 시에도 다른 키워드 결과는 표시
            })
          );

          const searchResponses = await Promise.all(searchPromises);

          // 모든 검색 결과를 하나의 배열로 병합
          const allSearchResults: SearchResult[] = [];
          searchResponses.forEach(response => {
            if (response && response.results) {
              allSearchResults.push(...response.results);
            }
          });

          // 게시글 ID 기준으로 중복 제거
          const uniqueResults = Array.from(
            new Map(allSearchResults.map(result => [result.id, result])).values()
          );

          // createdAt 기준 최신순 정렬
          uniqueResults.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

          // NotificationItem 형태로 변환
          const notificationItems = uniqueResults.map(convertSearchResultToNotificationItem);
          setNotifications(notificationItems);
        }
      } catch (err: any) {
        console.error('데이터 조회 실패:', err);
        setError(err.response?.data?.error?.message || '데이터를 불러오는데 실패했습니다.');
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    // 일반 탭: 즐겨찾기 게시판 ID가 로드된 후에만 조회
    // My 탭: 즉시 조회 가능
    // 키워드 탭: 선호 키워드가 로드된 후에만 조회
    if (activeTab === 'general') {
      if (favoriteBoardIds.length > 0) {
        loadData();
      }
    } else if (activeTab === 'my') {
      loadData();
    } else if (activeTab === 'keyword') {
      if (preferredKeywords.length > 0) {
        loadData();
      }
    }
  }, [activeTab, favoriteBoardIds, preferredKeywords]);

  // SSE 실시간 알림 연결 (My 탭에서만 사용)
  useEffect(() => {
    // 일반 탭과 키워드 탭에서는 SSE 연결 비활성화
    if (activeTab === 'general' || activeTab === 'keyword') {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // 기존 연결 종료
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = getNotificationStreamUrl();
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification' && data.notification) {
          const notification = data.notification as Notification;
          
          // My 탭: 댓글, 답글, 반응 관련 알림만 처리
          if (activeTab === 'my') {
            if (
              notification.type !== 'new_comment_on_post' &&
              notification.type !== 'new_reply_on_comment' &&
              notification.type !== 'new_reaction_on_post' &&
              notification.type !== 'new_reaction_on_comment'
            ) {
              return;
            }
          }
          
          // 동기적으로 처리 가능
          const newItem = processNotification(notification);
          if (newItem) {
            // 최신순 유지 (맨 앞에 추가)
            setNotifications(prev => [newItem, ...prev]);
          }
        }
      } catch (err) {
        console.error('SSE 메시지 파싱 오류:', err);
      }
    };

    return () => {
      es.close();
    };
  }, [activeTab, favoriteBoardIds]); // 의존성 변경 시 재연결하여 필터링 로직(processNotification) 갱신

  const handleNotificationClick = async (notificationId: number, postId?: number) => {
    if (!postId) return;

    // 일반 탭과 키워드 탭에서는 읽음 처리하지 않음
    if (activeTab === 'my') {
      // My 탭: 서버에 읽음 처리
      try {
        // 읽음 처리 (에러가 나도 이동은 함)
        await markNotificationAsRead(notificationId);
        // 해당 항목의 isRead 상태 업데이트
        setNotifications(prev => 
          prev.map(item => 
            item.id === notificationId ? { ...item, isRead: true } : item
          )
        );
      } catch (err) {
        console.error('알림 읽음 처리 실패:', err);
      }
    }

    navigate(`/community/post/${postId}`);
  };

  const handleMarkAllAsRead = async () => {
    if (confirm('모든 알림을 읽음 처리하시겠습니까?')) {
      try {
        await markAllNotificationsAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        alert('모든 알림이 읽음 처리되었습니다.');
      } catch (err: any) {
        alert(err.response?.data?.error?.message || '처리 중 오류가 발생했습니다.');
      }
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <span className="text-gray-400 text-sm">알림을 불러오는 중...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex justify-center items-center py-8">
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="flex justify-center items-center py-8">
          <span className="text-gray-400 text-sm">알림이 없습니다.</span>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-100">
        {notifications.map((item, idx) => {
          // 일반 탭과 키워드 탭에서는 항상 읽은 상태 스타일 적용
          const isReadStyle = (activeTab === 'general' || activeTab === 'keyword') ? true : item.isRead;
          
          return (
            <div
              key={item.id}
              className={`p-4 transition-colors animate-fade-in-up cursor-pointer relative ${
                isReadStyle 
                  ? 'bg-gray-50 hover:bg-gray-100 border-l-4 border-transparent' 
                  : 'bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-500'
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
              onClick={() => handleNotificationClick(item.id, item.postId)}
            >
              {item.category && (
                <div className={`text-xs mb-1 font-medium ${
                  isReadStyle ? 'text-gray-500' : 'text-blue-700'
                }`}>
                  {item.category}
                </div>
              )}
              <h3 className={`text-base mb-1 leading-tight ${
                isReadStyle 
                  ? 'font-semibold text-gray-700' 
                  : 'font-bold text-gray-900'
              }`}>
                {item.title}
              </h3>
              {item.content && (
                <p className={`text-sm line-clamp-2 mb-1.5 whitespace-pre-wrap leading-relaxed ${
                  isReadStyle ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  {item.content}
                </p>
              )}
              <div className={`text-xs ${
                isReadStyle ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {item.date}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header */}
      <header className="flex items-center h-14 px-4 bg-white sticky top-0 z-10 border-b border-gray-100 animate-fade-in-up">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors btn-press"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900">알림</h1>
        <button
          onClick={handleMarkAllAsRead}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          title="모두 읽음 처리"
        >
          <CheckCheck className="w-5 h-5" />
        </button>
      </header>

      {/* Tabs */}
      <div className="px-4 py-3 bg-white sticky top-14 z-10 animate-fade-in-up delay-75">
        <div className="flex gap-2">
          {['general', 'my', 'keyword'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 btn-press ${activeTab === tab ? 'bg-blue-100 text-gray-900 scale-105' : 'bg-blue-50 text-gray-500'
                }`}
            >
              {tab === 'general' ? '일반' : tab === 'my' ? 'My' : '키워드'}
            </button>
          ))}
        </div>
      </div>

      {/* List Content */}
      <main key={activeTab}>
        {renderContent()}
      </main>
    </div>
  );
};

export default NotificationsPage;

