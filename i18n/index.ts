/**
 * @file i18next 实例配置文件
 * @description
 * 这个文件负责初始化 i18next 库，并将其配置为在客户端和服务端中使用。
 * 最后导出一个已配置好的 i18n 实例，供整个应用使用。
 *
 * @link https://www.i18next.com/
 */

import i18n from 'i18next';

// 导入不同语言和命名空间的翻译文件
// English translations
import en_UI from './res/en/ui.json';
import en_Common from './res/en/common.json';
import en_Book_Pages from './res/en/book/pages.json';
import en_Book_Bookmarks from './res/en/book/bookmarks.json';
import en_Book_Conditions from './res/en/book/conditions.json';
import en_Character from './res/en/character.json';
import en_Item from './res/en/item.json';
import en_Qte from './res/en/qte.json';

// 中文翻译
import zhCN_UI from './res/zh-CN/ui.json';
import zhCN_Common from './res/zh-CN/common.json';
import zhCN_Book_Pages from './res/zh-CN/book/pages.json';
import zhCN_Book_Bookmarks from './res/zh-CN/book/bookmarks.json';
import zhCN_Book_Conditions from './res/zh-CN/book/conditions.json';
import zhCN_Character from './res/zh-CN/character.json';
import zhCN_Item from './res/zh-CN/item.json';
import zhCN_Qte from './res/zh-CN/qte.json';

// 处理在服务端（无 navigator）与客户端环境下读取语言
const getNavigatorLanguage = (): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = (globalThis as any).navigator;
    if (nav && typeof nav.language === 'string' && nav.language) {
      return nav.language;
    }
  } catch (e) {
    // 在服务端环境下可能会出错，忽略即可
  }
  return 'zh-CN';
};

// 初始化 i18next 实例
i18n.init({
  // `lng`: 设置当前语言。这里使用客户端 `navigator.language` 来获取浏览器的语言设置。
  // 如果没有检测到语言，i18next 将会使用这里指定的 'zh-CN' 作为默认语言。
  lng: getNavigatorLanguage(),

  // `fallbackLng`: 设置回退语言。如果 `lng` 检测到的语言在 `resources` 中不存在对应的翻译，
  // i18next 将会使用这里指定的 'zh-CN' 作为备用语言，以确保总有内容显示。
  fallbackLng: 'zh-CN',

  // `debug`: 开启调试模式。在开发环境中设置为 `true`，i18next 会在控制台输出详细信息，
  // 如语言加载、缺失键等，非常有助于调试。在生产环境中应务必设置为 `false` 以避免性能损耗和信息泄露。
  debug: false,

  // `defaultNS`: 设置默认的命名空间（namespace）。
  // 当调用 `t()` 函数且未指定命名空间时，i18next 将会在此处指定的 'ui' 命名空间下查找键。
  defaultNS: 'ui',

  // `ns`: 指定要加载的命名空间
  ns: ['ui', 'common', 'book_pages', 'book_bookmarks', 'book_conditions', 'character', 'item', 'qte'],

  // `interpolation`: 插值配置，启用变量替换功能
  interpolation: {
    escapeValue: false, // 不转义插值内容（React 已经处理了 XSS）
  },

  // `resources`: 提供翻译资源。这是一个对象，键是语言代码（如 'en', 'zh-CN'），
  // 值是该语言的命名空间和翻译内容。使用命名空间组织不同模块的翻译。
  resources: {
    en: {
      ui: en_UI,
      common: en_Common,
      book_pages: en_Book_Pages,
      book_bookmarks: en_Book_Bookmarks,
      book_conditions: en_Book_Conditions,
      character: en_Character,
      item: en_Item,
      qte: en_Qte,
    },
    'zh-CN': {
      ui: zhCN_UI,
      common: zhCN_Common,
      book_pages: zhCN_Book_Pages,
      book_bookmarks: zhCN_Book_Bookmarks,
      book_conditions: zhCN_Book_Conditions,
      character: zhCN_Character,
      item: zhCN_Item,
      qte: zhCN_Qte,
    },
  },
});

/**
 * @zh
 * i18next 实例
 * @en
 * i18next instance
 */
export default i18n;
