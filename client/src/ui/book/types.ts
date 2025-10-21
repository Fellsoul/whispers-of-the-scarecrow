/**
 * 书本 UI 类型定义
 * Book UI Type Definitions
 */

// ================== 行类型枚举 ==================
export type LineType =
  | 'Title'
  | 'Separator'
  | 'SubTitle'
  | 'SubTitleSeparator'
  | 'Paragraph'
  | 'Image'
  | 'ImageParagraph';

// ================== 基础行接口 ==================
export interface LineBase {
  type: LineType;
  visible?: boolean;
  visibleRef?: string;
  styleRef?: string;
  layout?: {
    maxWidthRef?: string;
    lineHeightRef?: string;
    marginTopRef?: string;
    heightRef?: string;
    gapBetweenRef?: string;
  };
}

// ================== 文本行（Paragraph/Title/SubTitle）==================
export interface ParagraphLine extends LineBase {
  type: 'Paragraph' | 'Title' | 'SubTitle';
  text?: string;
  i18n?: string;
  fallbackText?: string; // i18n 未找到时的后备文本
}

// ================== 分隔线（Separator）==================
export interface SeparatorLine extends LineBase {
  type: 'Separator' | 'SubTitleSeparator';
}

// ================== 图片行 ==================
export interface ImageLine extends LineBase {
  type: 'Image';
  image: {
    srcRef: string;
    alt?: string;
    align?: 'left' | 'center' | 'right';
    height?: number;
    widthRef?: string;
    fit?: 'contain' | 'cover';
    radiusRef?: string;
    tintRef?: string;
  };
}

// ================== 图文混合行 ==================
export interface ImageParagraphLine extends LineBase {
  type: 'ImageParagraph';
  mode: 'imageBefore' | 'imageAfter';
  image: {
    srcRef: string;
    alt?: string;
    align?: 'left' | 'center' | 'right';
    height?: number;
    widthRef?: string;
    fit?: 'contain' | 'cover';
    radiusRef?: string;
    tintRef?: string;
  };
  paragraph: {
    text?: string;
    i18n?: string;
    fallbackText?: string;
    styleRef?: string;
  };
}

// ================== 行类型联合 ==================
export type AnyLine =
  | ParagraphLine
  | SeparatorLine
  | ImageLine
  | ImageParagraphLine;

// ================== 页面可见性配置 ==================
export interface PageVisibility {
  chapterTitle?: boolean;
  chapterSeparator?: boolean;
  subTitle?: boolean;
  subTitleSeparator?: boolean;
}

// ================== 页面覆盖配置 ==================
export interface PageOverrides {
  box?: {
    widthRef?: string;
    heightRef?: string;
  };
  anchor?: 'textTop' | string;
}

// ================== 页面定义 ==================
export interface Page {
  pageNumber: string;
  pageDisplayNumber?: string;
  template: 'textTop' | string;
  overrides?: PageOverrides;
  visibility?: PageVisibility;
  lines: AnyLine[];
}

// ================== 书本数据定义 ==================
export interface BookData {
  locale: string;
  version: number;
  settingsRef: string;
  pages: Page[];
}

// ================== 书签定义 ==================
export interface BookMark {
  id: string;
  label: string;
  i18n?: string;
  pageNumber?: string; // 旧版本兼容，已弃用
  pageNumberLeft: number; // 左侧页码
  pageNumberRight: number; // 右侧页码
  side?: 'left' | 'right'; // 旧版本兼容，已弃用
  order?: number; // 旧版本兼容，已弃用
  enabled?: boolean; // 旧版本兼容，已弃用
  visible?: boolean; // 旧版本兼容，已弃用
}

export interface BookMarkData {
  version: number;
  bookMarks: BookMark[];
}

// ================== 渲染上下文 ==================
export interface RenderContext {
  currentPage: number;
  totalPages: number;
  page: Page;
  locale: string;
}

// ================== 样式配置接口 ==================
export interface StyleConfig {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
}

// ================== 布局测量结果 ==================
export interface MeasureResult {
  width: number;
  height: number;
  lines?: string[];
}

// ================== 书本状态 ==================
export enum BookState {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  OPEN = 'open',
  CLOSED = 'closed',
  ERROR = 'error',
}

// ================== 导航事件 Payload ==================
export interface NavigationPayload {
  pageNumber?: string;
  pageIndex?: number;
}

export interface BookmarkClickPayload {
  bookmarkId: string;
  pageNumber: string;
}

// ================== UI 元素类型==================
// 直接使用引擎提供的类型，这些类在 ClientAPI.d.ts 中定义
// UiText, UiImage, UiBox 等类型由引擎全局提供，无需重新定义

// ================== 条件显示相关 ==================
export interface Condition {
  type: 'character_familiarity' | 'match_count' | 'achievement' | 'custom';
  characterId?: string;
  minValue?: number;
  maxValue?: number;
  achievementId?: string;
  customKey?: string;
  description?: string;
}

export interface ConditionalConfig {
  conditions: Condition[];
  operator: 'AND' | 'OR';
}

export interface ConditionsData {
  [elementId: string]: ConditionalConfig;
}
