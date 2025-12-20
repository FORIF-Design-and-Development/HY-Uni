export interface KeywordItem {
  id: number;
  text: string;
  top: string;
  left: string;
  rotate?: string;
  size?: string;
}

export interface PostItem {
  id: number;
  boardName: string;
  title: string;
  highlightedWord?: string;
  contentPreview?: string;
  date: string;
  time: string;
  likes: number;
  comments: number;
  isHot?: boolean;
  matchedKeywords?: string[];
}

export interface FavoriteItem {
  id: number;
  boardName: string;
  description: string;
  date: string;
  time: string;
  boardType?: string;
}

