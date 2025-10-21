// 本文件由ArenaPro生成的UI索引工具，UiIndex文件夹均为自动生成，请勿手动修改
// 地图ID: 100523740
// 生成时间: 2025年10月21日星期二 GMT-6 14:09:33
//
// - 可在 dao3.config.json -> file.typescript.client.uiIndexPrefix 中设置标签前缀（例如："U_"）。
// - 仅当节点名以此前缀开头时，才会生成对应的强类型 getter；且 getter 名会剥离此前缀。
// - 若未设置该前缀，将对所有节点生成 getter。

import { UiIndex_screen } from './screens/UiIndex_screen';

// 内部构造表与类型
const __UiIndexCtorMap = {
  screen: UiIndex_screen,
} as const;

type __AnyUiIndex = UiIndex_screen;

// 缓存：同一屏幕名的索引实例只构建一次，后续重复调用直接复用
const __UiIndexCache = new Map<string, __AnyUiIndex>();

/**
 * 通过屏幕名获取该屏幕对应的 UI 索引实例。
 *
 * 该索引实例提供了类型安全的快捷属性（如 'uiText_xxx'、'uiImage_xxx'），
 * 你可以直接通过这些属性访问到屏幕下的具体 UI 元素。
 *
 * 注意：
 * - 屏幕内部同名元素会被自动消重并回退为全路径命名，必要时追加序号，确保属性名唯一。
 * - 如果地图当前并不存在给定名称的屏幕，将返回 'undefined'。
 * - 本函数为默认导出，可直接使用：import find from 'client/UiIndex'。
 *
 * @param screenName 屏幕名称（如：'home'、'blackground'）。
 * @returns 对应屏幕的 UI 索引实例；若未找到屏幕则返回 'undefined'。
 *
 * @example
 * import find from '@client/UiIndex';
 * const idx = find('blackground');
 * if (idx) {
 *   // 直接通过强类型属性访问 UI 元素
 *   idx.uiText_content1;
 *   idx.uiImage_logo;
 * }
 */
export default function find<Name extends keyof typeof __UiIndexCtorMap>(
  screenName: Name
): Name extends keyof typeof __UiIndexCtorMap
  ? InstanceType<(typeof __UiIndexCtorMap)[Name]> | undefined
  : never;
// eslint-disable-next-line no-redeclare
export default function find(
  screenName: keyof typeof __UiIndexCtorMap
): __AnyUiIndex | undefined {
  type ScreenKey = keyof typeof __UiIndexCtorMap;
  const name = screenName as ScreenKey;
  const Ctor = __UiIndexCtorMap[name];
  if (!Ctor) {
    return undefined;
  }
  // 若已有缓存，直接返回
  const cached = __UiIndexCache.get(String(screenName));
  if (cached) {
    return cached;
  }
  const uiScreen = UiScreen.getAllScreen().find(
    (s: UiScreen) => s.name === screenName
  );
  if (!uiScreen) {
    return undefined;
  }
  const instance = new Ctor(uiScreen) as __AnyUiIndex;
  __UiIndexCache.set(String(screenName), instance);
  return instance;
}
