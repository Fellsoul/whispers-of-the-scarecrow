/**
 * 书本 UI 事件常量
 * Book UI Event Constants
 */

export const BookEvents = {
  // 书本生命周期事件
  BOOK_OPEN: 'ui:book:open', // 打开书本，payload: { pageNumber?: string }
  BOOK_CLOSE: 'ui:book:close', // 关闭书本
  BOOK_READY: 'ui:book:ready', // 书本就绪（资源加载完成，渲染器初始化完毕）
  BOOK_ERROR: 'ui:book:error', // 书本错误，payload: { error: Error }

  // 导航事件
  BOOK_GOTO: 'ui:book:goto', // 跳转到指定页，payload: { pageNumber: string }
  BOOK_NEXT: 'ui:book:next', // 翻到下一页
  BOOK_PREV: 'ui:book:prev', // 翻到上一页
  BOOK_PAGE_CHANGED: 'ui:book:page:changed', // 页面已改变，payload: { pageNumber: string, pageIndex: number }

  // 书签事件
  BOOK_BOOKMARK_CLICK: 'ui:book:bookmark:click', // 点击书签，payload: { bookmarkId: string, pageNumber: string }
  BOOK_BOOKMARK_ADD: 'ui:book:bookmark:add', // 添加书签，payload: { pageNumber: string }
  BOOK_BOOKMARK_REMOVE: 'ui:book:bookmark:remove', // 移除书签，payload: { bookmarkId: string }

  // 渲染事件
  BOOK_RENDER_START: 'ui:book:render:start', // 开始渲染页面
  BOOK_RENDER_COMPLETE: 'ui:book:render:complete', // 渲染完成

  // 交互事件
  BOOK_LINE_CLICK: 'ui:book:line:click', // 点击某一行，payload: { lineIndex: number, line: AnyLine }
  BOOK_IMAGE_CLICK: 'ui:book:image:click', // 点击图片，payload: { srcRef: string }
} as const;

// 导出类型以获得更好的类型推导
export type BookEventType = (typeof BookEvents)[keyof typeof BookEvents];
