// 本文件由ArenaPro工具自动生成，请勿手动修改
// 生成时间: 2025年10月21日星期二 GMT-6 14:09:33

/**
 * ClientUIWindow 是所有 UiIndex_XXX 屏幕索引类的基类。
 *
 * 职责：
 * - 维护屏幕内各 UI 元素的路径缓存，避免重复查找。
 * - 提供按路径查找元素的基础方法。
 * - 在构造时根据传入的 PATHS 进行一次性预热，以提升后续 getter 访问的性能。
 *
 * 成员说明：
 * - ui: 构造时注入的 UiScreen 实例，即目标屏幕。
 * - __paths: 该屏幕下需要缓存的 UI 元素完整路径列表，由具体 UiIndex_XXX 子类提供。
 * - __meta: 与 __paths 一一对应的元信息列表，包含 path、type、name。
 * - __cache: 以完整路径为键的缓存表，值为 UiElement 或 UiScreen。
 */
type UiKind = 'UiBox' | 'UiImage' | 'UiInput' | 'UiScrollBox' | 'UiText';

export default class ClientUIWindow {
  /** 以完整路径为键的元素缓存表 */
  protected __cache: Record<string, UiElement | UiScreen | undefined> = {};
  /** 与 __paths 对齐的元信息 */
  private __meta?: ReadonlyArray<
    Readonly<{ path: string; type: UiKind; name: string }>
  >;

  /**
   * @param ui 目标屏幕实例
   * @param __paths 需要预热缓存的完整路径列表
   */
  constructor(
    protected ui?: UiScreen,
    private __paths?: ReadonlyArray<string>,
    meta?: ReadonlyArray<Readonly<{ path: string; type: UiKind; name: string }>>
  ) {
    this.__meta = meta;
    this.__warmup();
  }

  /**
   * 根据完整路径查找 UI 元素。路径以斜杠分隔，从屏幕根开始。
   * 例如: root/boxA/textB
   * @param path 完整路径
   * @returns 找到则返回 UiScreen 或 UiElement，否则返回 undefined
   */
  protected getByPath(path: string): UiScreen | UiElement | undefined {
    const parts = path.split('/').filter(Boolean);
    let cur: UiScreen | UiElement | undefined = this.ui;
    for (const name of parts) {
      cur = cur?.findChildByName?.(name);
    }
    return cur;
  }

  /**
   * 按 __paths 进行一次性预热，将每个路径对应的元素写入 __cache。
   * 若 ui 或 __paths 为空则直接返回。
   */
  private __warmup() {
    if (!this.ui || !this.__paths?.length) {
      return;
    }
    for (const p of this.__paths) {
      this.__cache[p] = this.getByPath(p);
    }
  }

  /**
   * 获取当前屏幕的 PATHS 列表。
   */
  public getPaths(): ReadonlyArray<string> {
    return (this.__paths as ReadonlyArray<string>) || [];
  }

  /**
   * 获取当前屏幕的 Meta 列表。
   */
  public getMeta(): ReadonlyArray<{
    path: string;
    type: UiKind;
    name: string;
  }> {
    return (
      (this.__meta as ReadonlyArray<{
        path: string;
        type: UiKind;
        name: string;
      }>) || []
    );
  }

  /**
   * 按条件过滤当前屏幕下的 UI 元素。
   *
   * @returns 命中的 { path, type, name, el } 列表；若无命中则返回 undefined
   *
   * @example
   * // 仅按类型：返回 UiText 元素命中
   * const texts = idx?.findBy('UiText');
   *
   * // 类型 + 条件：此时 el 被收窄为 UiImage | undefined
   * const imgs = idx?.findBy('UiImage', (meta, el) => meta.name === "img_1" && el?.visible === true);
   *
   * // 不指定类型
   * const hits = idx?.findBy((meta, el) => meta.name.includes('btn'));
   */
  public findBy(
    predicate: (
      /** 元数据 */
      meta: Readonly<{ path: string; name: string }>,
      /** UI元素 */
      el: UiElement | undefined
    ) => boolean
  ):
    | Array<{ path: string; name: string; el: UiElement | undefined }>
    | undefined;
  public findBy<K extends UiKind>(
    /** 指定UI类型 */
    kind: K,
    predicate?: (
      /** 元数据 */
      meta: Readonly<{ path: string; name: string }>,
      /** 指定后的UI元素 */
      el:
        | (K extends 'UiBox'
            ? UiBox
            : K extends 'UiImage'
              ? UiImage
              : K extends 'UiInput'
                ? UiInput
                : K extends 'UiScrollBox'
                  ? UiScrollBox
                  : K extends 'UiText'
                    ? UiText
                    : UiElement)
        | undefined
    ) => boolean
  ):
    | Array<{
        /** 元素路径*/
        path: string;
        /** 节点名称*/
        name: string;
        /** UI元素 */
        el:
          | (K extends 'UiBox'
              ? UiBox
              : K extends 'UiImage'
                ? UiImage
                : K extends 'UiInput'
                  ? UiInput
                  : K extends 'UiScrollBox'
                    ? UiScrollBox
                    : K extends 'UiText'
                      ? UiText
                      : UiElement)
          | undefined;
      }>
    | undefined;

  // 实现体
  public findBy(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kindOrPredicate: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    maybePredicate?: any
  ):
    | Array<{ path: string; name: string; el: UiElement | undefined }>
    | undefined {
    const out: Array<{
      path: string;
      name: string;
      el: UiElement | undefined;
    }> = [];
    const paths = this.__paths || [];
    const hasKind = typeof kindOrPredicate === 'string';
    const kind: UiKind | undefined = hasKind
      ? (kindOrPredicate as UiKind)
      : undefined;
    const predicate: (
      m: Readonly<{ path: string; name: string }>,
      e: UiElement | undefined
    ) => boolean = hasKind ? (maybePredicate ?? (() => true)) : kindOrPredicate;

    for (let i = 0; i < paths.length; i++) {
      const p = paths[i] as string;
      const meta = (this.__meta?.[i] ?? {
        path: p,
        type: 'UiBox',
        name: p.split('/').pop() || p,
      }) as Readonly<{
        path: string;
        type: UiKind;
        name: string;
      }>;
      if (kind && meta.type !== kind) {
        continue;
      }
      const el = this.__cache[p] as UiElement | undefined;
      if (predicate(meta, el)) {
        out.push({ ...meta, el });
      }
    }
    return out.length ? out : undefined;
  }
}
