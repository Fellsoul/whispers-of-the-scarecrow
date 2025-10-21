import i18n from '@root/i18n';
import { UiManager } from './mgr/UiManager';
import find from '@client/UiIndex';

// 当前i18n配置已支持语言自动切换，客户端下默认会跟随用户浏览器语言设置。例如，若用户浏览器语言为 zh-CN，则界面将显示为简体中文。
console.log('(client)：', i18n.t('welcome_game'));
console.log('(client)：', i18n.t('welcome_ap'));
console.log(
  '(client)：',
  i18n.t('navigator.language', { language: navigator.language })
);

// 初始化 UI 管理器s
async function initializeUI() {
  // 获取 UI Screen 实例
  const uiScreen = find('screen');

  if (!uiScreen) {
    console.error('[ClientApp] Failed to find UI screen');
    return;
  }

  // 初始化 UiManager 并传入 uiScreen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await UiManager.instance.initialize(uiScreen as any);

  console.log('[ClientApp] UI Manager initialized');
}

// 启动初始化
initializeUI().catch(console.error);
