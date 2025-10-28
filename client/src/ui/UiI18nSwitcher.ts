/**
 * UI国际化切换器 - 监听i18n语言切换事件并更新UI显示
 * 核心思想：递归遍历UI树，找到以"i18n"开头的UiBox，切换其子元素的可见性
 * 假设i18n开头的UiBox有两个子元素：第一个是en-US，第二个是zh-CN
 */

import i18n from '@root/i18n';

export class UiI18nSwitcher {
  private currentLanguage: string;
  private rootNode: UiNode | null = null;

  constructor() {
    this.currentLanguage = i18n.language || 'zh-CN';
    this.setupLanguageListener();
  }

  /**
   * 设置语言切换监听器
   */
  private setupLanguageListener(): void {
    i18n.on('languageChanged', (lng: string) => {
      console.log(
        `[UiI18nSwitcher] Language changed from ${this.currentLanguage} to ${lng}`
      );
      this.currentLanguage = lng;
      if (this.rootNode) {
        this.applyLanguageSwitch(this.rootNode);
      }
    });
  }

  /**
   * 对外入口：应用i18n切换到UI树
   * @param root UI根节点
   */
  switchUI(root: UiNode): void {
    console.log(
      `[UiI18nSwitcher] Applying language switch with language: ${this.currentLanguage}`
    );
    this.rootNode = root;
    this.applyLanguageSwitch(root);
    console.log('[UiI18nSwitcher] Language switch completed');
  }

  /**
   * 应用语言切换，递归遍历所有元素
   * @param node 当前节点
   */
  private applyLanguageSwitch(node: UiNode): void {
    // 检查节点名称是否以 "i18n" 开头
    if (node.name && node.name.startsWith('i18n')) {
      this.switchLanguageForI18nBox(node);
    }

    // 递归处理所有子节点
    node.children?.forEach((child: UiNode) => this.applyLanguageSwitch(child));
  }

  /**
   * 对 i18n 开头的 UiBox 进行语言切换
   * 假设其下有两个子元素：第一个是 en-US，第二个是 zh-CN
   * @param node i18n UiBox 节点
   */
  private switchLanguageForI18nBox(node: UiNode): void {
    const { children } = node;

    if (!children || children.length < 2) {
      console.warn(
        `[UiI18nSwitcher] i18n box "${node.name}" does not have exactly 2 children, skipping`
      );
      return;
    }

    // 假设第一个子元素是 en-US，第二个是 zh-CN
    const enElement = children[0] as UiRenderable;
    const zhElement = children[1] as UiRenderable;

    // 根据当前语言显示/隐藏对应元素
    if (this.currentLanguage === 'zh-CN') {
      this.setVisible(enElement, false);
      this.setVisible(zhElement, true);
      console.log(
        `[UiI18nSwitcher] "${node.name}": showing zh-CN, hiding en-US`
      );
    } else {
      // 默认显示英文（en 或 en-US）
      this.setVisible(enElement, true);
      this.setVisible(zhElement, false);
      console.log(
        `[UiI18nSwitcher] "${node.name}": showing en-US, hiding zh-CN`
      );
    }
  }

  /**
   * 设置元素的可见性
   * @param node 节点
   * @param visible 是否可见
   */
  private setVisible(node: UiRenderable, visible: boolean): void {
    if (!node) {
      return;
    }

    // 通过设置 visible 属性来控制可见性
    node.visible = visible;
  }
}
