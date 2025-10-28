/**
 * @zh 游戏日志方法类型
 * @en Game logger method type
 */
declare type GameLoggerMethod = (...args: any[]) => void;

/**
 * @zh 控制台对象，用于在控制台输出信息。
 * @en The console object, used to output information to the console.
 */
declare const console: {
  /**
   * @zh 断言，如果断言为 false，则在控制台输出错误信息。
   * @en Assertion, if the assertion is false, an error message is output to the console.
   */
  assert: (assertion, ...args: any[]) => void;
  /**
   * @zh 在控制台输出日志信息。
   * @en Outputs log information to the console.
   */
  log: GameLoggerMethod;
  /**
   * @zh 在控制台输出调试信息。
   * @en Outputs debug information to the console.
   */
  debug: GameLoggerMethod;
  /**
   * @zh 在控制台输出错误信息。
   * @en Outputs error information to the console.
   */
  error: GameLoggerMethod;
  /**
   * @zh 在控制台输出警告信息。
   * @en Outputs warning information to the console.
   */
  warn: GameLoggerMethod;
  /**
   * @zh 清空控制台。
   * @en Clears the console.
   */
  clear: GameLoggerMethod;
};

/**
 * @zh 当前文件所在的目录的绝对路径。注意：目前仅在客户端的 webpack.config.js 中有效。
 * @en The absolute path of the directory where the current file is located. Note: Currently only effective in the client's webpack.config.js.
 */
declare const __dirname: string;

/**
 * @zh 因神岛平台限制，无法使用Nodejs原生模块，这里是模拟 Node.js 的 process 对象。
 * @en Due to platform limitations, native Node.js modules cannot be used. This is a mock of the Node.js process object.
 */
declare const process: {
  /**
   * @zh 返回一个包含用户环境信息的对象。需结合插件dotenv-webpack使用。
   * @en Returns an object containing user environment information. Requires the use of the dotenv-webpack plugin.
   * @link https://docs.dao3.fun/arenapro/zh/guide/06-advanced-topics/env.html
   */
  env: ProcessEnv;
};

/**
 * @zh 事件处理模块
 * @en Event handling module
 */
declare class EventEmitter<EventMap extends Record<string, any>> {
  /**
   * @zh 监听指定的事件。
   * @en Listens to the specified event.
   * @param type - @zh 监听的事件类型，是个字符串。 @en The type of event to listen for, which is a string.
   * @param listener - @zh 监听到事件类型后的处理函数。 @en The handler function after listening to the event type.
   */
  on<K extends keyof EventMap>(
    type: K,
    listener: (event: EventMap[K]) => void
  ): void;
  /**
   * @zh 与 on 的区别是仅触发一次。
   * @en The difference from on is that it only triggers once.
   * @param type - @zh 监听的事件类型，是个字符串。 @en The type of event to listen for, which is a string.
   * @param listener - @zh 监听到事件类型后的处理函数。 @en The handler function after listening to the event type.
   */
  once<K extends keyof EventMap>(
    type: K,
    listener: (event: EventMap[K]) => void
  ): void;
  /**
   * @zh 移除找到的第一个 listener。
   * @en Removes the first listener found.
   * @param type - @zh 要移除的事件类型。 @en The type of event to remove.
   * @param listener - @zh 要移除的事件处理函数。 @en The event handler function to remove.
   */
  remove<K extends keyof EventMap>(
    type: K,
    listener: (event: EventMap[K]) => void
  ): void;
  /**
   * @zh 移除找到的所有 listener，不传则移除事件下所有。
   * @en Removes all found listeners, or all listeners for the event if none are passed.
   * @param type - @zh 要移除的事件类型。 @en The type of event to remove.
   * @param listener - @zh 可选，要移除的事件处理函数。 @en Optional, the event handler function to remove.
   */
  removeAll<K extends keyof EventMap>(
    type?: K,
    listener?: (event: EventMap[K]) => void
  ): void;
  /**
   * @zh 与 on 是同一个方法，只是方法名不同。
   * @en The same method as on, just with a different name.
   * @param type - @zh 监听的事件类型，是个字符串。 @en The type of event to listen for, which is a string.
   * @param listener - @zh 监听到事件类型后的处理函数。 @en The handler function after listening to the event type.
   */
  add<K extends keyof EventMap>(
    type: K,
    listener: (event: EventMap[K]) => void
  ): void;
  /**
   * @zh 与 remove 是同一个方法，只是方法名不同。
   * @en The same method as remove, just with a different name.
   * @param type - @zh 要移除的事件类型。 @en The type of event to remove.
   * @param listener - @zh 要移除的事件处理函数。 @en The event handler function to remove.
   */
  off<K extends keyof EventMap>(
    type: K,
    listener: (event: EventMap[K]) => void
  ): void;
  /**
   * @zh 触发指定的事件
   * @en Triggers the specified event
   */
  emit<K extends keyof EventMap>(type: K, event: EventMap[K]): void;
}
/**
 * @zh 客户端与服务端通信通道事件
 * @en Client-server communication channel events
 */
declare type ClientRemoteChannelEvents = {
  client: any;
};
/**
 * @zh 客户端与服务端通信通道
 * @en Client-server communication channel
 */
declare class ClientRemoteChannel {
  /**
   * @zh 向服务端发送数据。
   * @en Sends data to the server.
   * @link https://docs.dao3.fun/arenapro/zh/difference/remoteChannel.html
   */
  sendServerEvent<T = any>(event: T): void;
  /**
   * @zh 监听服务端发来的数据事件。
   * @en Listens for data events from the server.
   * @link https://docs.dao3.fun/arenapro/zh/difference/remoteChannel.html
   */
  onClientEvent<T = any>(handler: (event: T) => void): void;
  /**
   * @zh 事件管理器。
   * @en Event manager.
   */
  readonly events: EventEmitter<ClientRemoteChannelEvents>;
}
/**
 * @zh 图像映射中区域的坐标
 * @en Coordinates of the area in the image map
 */
declare class Coord2 {
  /**
   * @zh 节点坐标的偏移量。
   * @en The offset of the node coordinates.
   */
  readonly offset: Vec2;
  /**
   * @zh 节点坐标的缩放比。
   * @en The scaling ratio of the node coordinates.
   */
  readonly scale: Vec2;
  /**
   * @zh 创建并返回一个新的 Coord2，该 Coord2 初始 offset 和 scale 为 {}。
   * @en Creates and returns a new Coord2, with initial offset and scale as {}.
   * @param val - @zh 节点坐标数据。 @en Node coordinate data.
   */
  static create(val?: Coord2 | { offset: Vec2; scale: Vec2 }): Coord2;
}
/**
 * @zh 二维向量
 * @en 2D vector
 */
declare class Vec2 {
  /**
   * @zh Vec2 的 x 坐标。
   * @en The x-coordinate of the Vec2.
   */
  x: number;
  /**
   * @zh Vec2 的 y 坐标。
   * @en The y-coordinate of the Vec2.
   */
  y: number;
  /**
   * @zh 复制给定的 Vec2 的 x 和 y 到当前 Vec2。
   * @en Copies the x and y of the given Vec2 to the current Vec2.
   * @param val
   * @zh 节点坐标数据。
   * @en Node coordinate data.
   */
  copy(val: Vec2): void;
  /**
   * @zh 创建并返回一个新的 Vec2。如果提供了一个 Vec2 作为参数，新的 Vec2 的 x 和 y 将被设置为给定 Vec2 的 x 和 y。如果没有提供参数，新的 Vec2 的 x 和 y 将被设置为 0。
   * @en Creates and returns a new Vec2. If a Vec2 is provided as an argument, the new Vec2's x and y will be set to the given Vec2's x and y. If no argument is provided, the new Vec2's x and y will be set to 0.
   * @param val
   * @zh 节点坐标数据。
   * @en Node coordinate data.
   */
  static create(val?: Vec2 | { x: number; y: number }): Vec2;
}
/**
 * @zh 三维向量 & RGB颜色
 * @en 3D Vector & RGB Color
 */
declare class Vec3 {
  /**
   * @zh Vec3的x坐标。
   * @en The x-coordinate of the Vec3.
   */
  x: number;
  /**
   * @zh Vec3的y坐标。
   * @en The y-coordinate of the Vec3.
   */
  y: number;
  /**
   * @zh Vec3的z坐标。
   * @en The z-coordinate of the Vec3.
   */
  z: number;
  /**
   * @zh Vec3的r颜色值。范围：0-255
   * @en The r color value of the Vec3. Range: 0-255
   */
  r: number;
  /**
   * @zh Vec3的g颜色值。范围：0-255
   * @en The g color value of the Vec3. Range: 0-255
   */
  g: number;
  /**
   * @zh Vec3的b颜色值。范围：0-255
   * @en The b color value of the Vec3. Range: 0-255
   */
  b: number;
  /**
   * @zh 复制给定的Vec3的x和y到当前Vec3。
   * @en Copies the x and y of the given Vec3 to the current Vec3.
   * @param val
   * @zh 节点坐标数据。
   * @en Node coordinate data.
   */
  copy(val: Vec3): void;
  /**
   * @zh 创建并返回一个新的Vec3。如果提供了一个Vec3作为参数，新的Vec3的x、y和z将被设置为给定Vec3的x、y和z。如果没有提供参数，新的Vec3的x、y和z将被设置为0。
   * @en Creates and returns a new Vec3. If a Vec3 is provided as an argument, the new Vec3's x, y, and z will be set to the given Vec3's x, y, and z. If no argument is provided, the new Vec3's x, y, and z will be set to 0.
   * @param val
   * @zh 节点坐标数据。
   * @en Node coordinate data.
   */
  static create(
    val?:
      | Vec3
      | { x: number; y: number; z: number }
      | { r: number; g: number; b: number }
  ): Vec3;
}
/**
 * @zh UI事件
 * @en UI Event
 */
interface UiEvent<T = UiNode> {
  /**
   * @zh 触发事件的节点。
   * @en The node that triggered the event.
   */
  target: T;
}

/**
 * @zh UI事件管理器
 * @en UI Event Manager
 */
declare type UiNodeEvents<T = UiNode> = {
  /**
   * @zh 鼠标按下。
   * @en Mouse down.
   */
  pointerdown: UiEvent<T>;
  /**
   * @zh 鼠标抬起。
   * @en Mouse up.
   */
  pointerup: UiEvent<T>;
};

/**
 * @zh UI输入事件管理器
 * @en UI Input Event Manager
 */
declare type UiInputEvents = {
  /**
   * @zh 获得焦点。
   * @en Gains focus.
   */
  focus: UiEvent<UiInput>;
  /**
   * @zh 失去焦点。
   * @en Loses focus.
   */
  blur: UiEvent<UiInput>;
} & UiNodeEvents<UiInput>;

/**
 * @zh 屏幕事件管理器
 * @en Screen Event Manager
 */
declare type ScreenEvents = {
  /**
   * @zh 当屏幕尺寸发生变化时，携带新的屏幕宽度和高度。
   * @en Carries the new screen width and height when the screen size changes.
   */
  resize: ScreenResizeEvent;
};

/**
 * @zh 客户端屏幕分辨率
 * @en Client Screen Resolution
 */
declare type ScreenResizeEvent = {
  /**
   * @zh 游戏屏幕的宽度
   * @en The width of the game screen
   */
  screenWidth: number;
  /**
   * @zh 游戏屏幕的高度
   * @en The height of the game screen
   */
  screenHeight: number;
};

/**
 * @zh 客户端屏幕
 * @en Client Screen
 */
declare class ClientScreen {
  /**
   * @zh 一个只读的事件发射器，用于处理用户界面屏幕事件
   * @en A read-only event emitter for handling user interface screen events
   */
  readonly events: EventEmitter<ScreenEvents>;
}

/**
 * @zh 基础节点
 * @en Base Node
 */
declare class UiNode {
  /**
   * @zh 该节点的标识，可重复。
   * @en The identifier of this node, can be repeated.
   */
  name: string;
  /**
   * @zh 节点的子节点。如需要调整子节点结构，应修改子节点的parent属性。
   * @en The child nodes of this node. To adjust the child node structure, you should modify the parent property of the child node.
   */
  readonly children: ReadonlyArray<UiNode>;
  /**
   * @zh 节点的父节点，非根节点的父节点为空时，该节点将不会被渲染。
   * @en The parent node of this node. If the parent of a non-root node is empty, the node will not be rendered.
   */
  parent: UiNode | undefined;
  /**
   * @zh 按名称查找子节点，返回对应子节点对象。（节点名称可在编辑模式下的属性面板中查看）
   * @en Finds a child node by name and returns the corresponding child node object. (The node name can be viewed in the properties panel in edit mode)
   * @param name
   * @zh 子节点名称。
   * @en The name of the child node.
   * @link https://docs.dao3.fun/arenapro/zh/difference/findChildByName.html
   */
  findChildByName<T extends UiElement>(name: string): T | undefined;
  /**
   * @zh 管理节点相关的事件。
   * @en Manages events related to the node.
   */
  events: EventEmitter<UiNodeEvents>;
  /**
   * @zh 节点等比例缩放数据。
   * @en Node proportional scaling data.
   */
  uiScale: UiScale | undefined;
  /**
   * @zh 克隆节点，包括其子节点。
   * @en Clones the node, including its children.
   */
  clone: () => this;
}

/**
 * @zh 可渲染的UI元素
 * @en Renderable UI Element
 */
type UiElement = UiBox | UiText | UiInput | UiImage | UiScrollBox;

/**
 * @zh UI可渲染的基类
 * @en Base class for UI renderables
 */
declare class UiRenderable extends UiNode {
  /**
   * @zh 节点的锚点，用于确定节点的位置。
   * @en The anchor of the node, used to determine the position of the node.
   */
  readonly anchor: Vec2;
  /**
   * @zh 节点的位置，相对于父节点的位置。
   * @en The position of the node, relative to the parent node.
   */
  readonly position: Coord2;
  /**
   * @zh 节点的背景颜色。
   * @en The background color of the node.
   */
  readonly backgroundColor: Vec3;
  /**
   * @zh 节点的背景透明度。
   * @en The background opacity of the node.
   */
  backgroundOpacity: number;
  /**
   * @zh 节点的旋转（角度）
   * @en The rotation of the node (in degrees).
   */
  rotation: number;
  /**
   * @zh 节点的尺寸。
   * @en The size of the node.
   */
  readonly size: Coord2;
  /**
   * @zh 节点的层级，用于确定节点的渲染顺序。
   * @en The z-index of the node, used to determine the rendering order.
   */
  zIndex: number;
  /**
   * @zh 节点的自动调整尺寸的方式。
   * @en The way the node automatically resizes.
   */
  autoResize: "NONE" | "X" | "Y" | "XY";
  /**
   * @zh 节点的可见性。
   * @en The visibility of the node.
   */
  visible: boolean;
  /**
   * @zh 配置鼠标指针事件的响应方式
   * @en Configures the response method for mouse pointer events
   */
  pointerEventBehavior: PointerEventBehavior;
}
/**
 * @zh UI盒子
 * @en UI Box
 */
declare class UiBox extends UiRenderable {
  private constructor();
  /**
   * @zh 事件管理器。
   * @en Event manager.
   */
  readonly events: EventEmitter<UiNodeEvents<UiBox>>;
  /**
   * @zh 创建一个新的 Ui盒子 实例。
   * @en Creates a new UiBox instance.
   */
  static create(): UiBox;
}

/**
 * @zh UI滚动框
 * @en UI Scroll Box
 */
declare class UiScrollBox extends UiRenderable {
  /**
   * @zh 滚动的位置，设置后，会受到当前可滚动范围约束
   * @en The scrolling position. After setting, it will be constrained by the current scrollable range
   */
  readonly scrollPosition: Vec2;
  /**
   * @zh 创建一个新的 Ui滚动框 实例。
   * @en Creates a new UiScrollBox instance.
   */
  static create(): UiScrollBox;
}

/**
 * @zh UI文本
 * @en UI Text
 */
declare class UiText extends UiRenderable {
  /**
   * @zh 事件管理器。
   * @en Event manager.
   */
  readonly events: EventEmitter<UiNodeEvents<UiText>>;
  /**
   * @zh 文本元素的内容，支持转义字符与换行，会对自身元素的自适应大小产生影响。
   * - 换行后，所有受到元素大小影响的属性，均需以新的大小进行计算，
   * - 当{@link UiText.richText}为真时，将开启富文本解析。
   * @en The content of the text element, supports escape characters and line breaks, and will affect the adaptive size of the element itself.
   * - After a line break, all properties affected by the element size need to be calculated with the new size.
   * - When {@link UiText.richText} is true, rich text parsing will be enabled.
   */
  textContent: string;
  /**
   * @zh 富文本标记，表示内容是否支持富文本格式
   * 当前支持的xml标签有：
   * - <font size="16" color="#D03737">内容</font>
   * - <stroke color="#00FFFF" thickness="10" opacity="0.6">内容</stroke>
   * @en Rich text flag, indicating whether the content supports rich text format.
   * Currently supported XML tags are:
   * - <font size="16" color="#D03737">Content</font>
   * - <stroke color="#00FFFF" thickness="10" opacity="0.6">Content</stroke>
   */
  richText: boolean;
  /**
   * @zh 节点显示的文本的字体大小。
   * @en The font size of the text displayed by the node.
   */
  textFontSize: number;
  /**
   * @zh 节点显示的文本的颜色。
   * @en The color of the text displayed by the node.
   */
  readonly textColor: Vec3;
  /**
   * @zh 节点显示的文本的水平对齐方式。
   * @en The horizontal alignment of the text displayed by the node.
   */
  textXAlignment: "Center" | "Left" | "Right";
  /**
   * @zh 节点显示的文本的垂直对齐方式。
   * @en The vertical alignment of the text displayed by the node.
   */
  textYAlignment: "Center" | "Top" | "Bottom";
  /**
   * @zh 是否开启自动换行。
   * @en Whether to enable automatic line wrapping.
   */
  autoWordWrap: boolean;
  /**
   * @zh 文本的行高。
   * @en The line height of the text.
   */
  textLineHeight: number;
  /**
   * @zh 只读属性，定义文本的描边颜色。
   * @en Read-only property that defines the stroke color of the text.
   */
  readonly textStrokeColor: Vec3;
  /**
   * @zh 定义文本描边的不透明度。
   * @en Defines the opacity of the text stroke.
   */
  textStrokeOpacity: number;
  /**
   * @zh 定义文本描边的厚度。
   * @en Defines the thickness of the text stroke.
   */
  textStrokeThickness: number;
  /**
   * @zh 定义文本使用的字体。
   * @en Defines the font used for the text.
   */
  textFontFamily: UITextFontFamily;
  /**
   * @zh 创建一个新的 Ui文本 实例。
   * @en Creates a new UiText instance.
   */
  static create(): UiText;
}
/**
 * @zh UI输入框
 * @en UI Input Box
 */
declare class UiInput extends UiText {
  /**
   * @zh 事件管理器。
   * @en Event manager.
   */
  readonly events: EventEmitter<UiInputEvents>;
  /**
   * @zh 输入框的未输入时文本提示内容。
   * @en The placeholder text content of the input box when it is empty.
   */
  placeholder: string;
  /**
   * @zh 输入框显示的占位文本的颜色。
   * @en The color of the placeholder text displayed in the input box.
   */
  readonly placeholderColor: Vec3;
  /**
   * @zh 输入框提示文本的不透明度。
   * @en The opacity of the placeholder text in the input box.
   */
  readonly placeholderOpacity: number;
  /**
   * @zh 输入框是否聚焦。
   * @en Whether the input box is focused.
   */
  readonly isFocus: boolean;
  /**
   * @zh 使输入框聚焦。
   * @en Focuses the input box.
   */
  readonly focus: () => void;
  /**
   * @zh 使输入框失去焦点。
   * @en Makes the input box lose focus.
   */
  readonly blur: () => string;
  /**
   * @zh 创建一个新的 Ui输入框 实例。
   * @en Creates a new UiInput instance.
   */
  static create(): UiInput;
}
/**
 * @zh UI屏幕
 * @en UI Screen
 */
declare class UiScreen extends UiNode {
  /**
   * @zh 该屏幕的标识。
   * @en The identifier for this screen.
   */
  name: UiScreenName;
  /**
   * @zh 屏幕是否可见。
   * @en Whether the screen is visible.
   */
  visible: boolean;
  /**
   * @zh 屏幕层级，层级越高的屏幕会显示在顶部，遮盖住层级较低的屏幕。
   * @en The screen layer level. Screens with a higher z-index will be displayed on top, covering screens with a lower z-index.
   */
  zIndex: number;
  /**
   * @zh 创建一个新的 Ui屏幕 实例。
   * @en Creates a new UiScreen instance.
   */
  static create(): UiScreen;
  /**
   * @zh 获取当前所有存在的屏幕实例。
   * @en Gets all existing screen instances.
   */
  static getAllScreen(): UiScreen[];
}

/**
 * @zh UI图片事件
 * @en UI Image Event
 */
declare type UiImageEvents = {
  /**
   * @zh 图片加载完成事件。
   * @en Image loaded event.
   */
  load: UiEvent<UiImage>;
} & UiNodeEvents<UiImage>;

/**
 * @zh UI图片
 * @en UI Image
 */
declare class UiImage extends UiRenderable {
  /**
   * @zh 图片元素是否加载完成。
   * @en Whether the image element has finished loading.
   */
  readonly complete: boolean;
  /**
   * @zh 图片元素的内容，应为图片的路径或者 URL。
   * @en The content of the image element, which should be the path or URL of the image.
   */
  image: (string & {}) | GamePictureAssets;
  /**
   * @zh 图片元素的透明度。
   * @en The opacity of the image element.
   */
  imageOpacity: number;
  /**
   * @zh 图片元素的图片资源展示方式
   * @en The display mode of the image resource for the image element
   *  @zh 图片元素中的图片资源不属于其子元素，所以图片资源只受imageDisplayMode属性影响，不受其所在元素的裁剪、自适应作用。
   *  @zh 缺省值：ImageDisplayMode.Fill
   *  @en The image resource in the image element is not a child element, so the image resource is only affected by the imageDisplayMode property and is not affected by the clipping and adaptive effects of its parent element.
   *  @en Default value: ImageDisplayMode.Fill
   */
  imageDisplayMode: ImageDisplayMode;
  /**
   * @zh 事件管理器。
   * @en Event manager.
   */
  readonly events: EventEmitter<UiImageEvents>;
  /**
   * @zh 创建一个新的 Ui图片 实例。
   * @en Creates a new UiImage instance.
   */
  static create(): UiImage;
}
/**
 * @zh UI组件
 * @en UI Component
 */
declare class UiComponent {}
/**
 * @zh UI缩放
 * @en UI Scale
 */
declare class UiScale extends UiComponent {
  /**
   * @zh 缩放倍数，仅允许设置大于等于0的数字。当传入非法值时，不会生效并会在控制台打印一条警告。
   * @en Scaling factor, only numbers greater than or equal to 0 are allowed. When an illegal value is passed in, it will not take effect and a warning will be printed in the console.
   */
  scale: number;
  /**
   * @zh 创建一个新的 Ui缩放 实例。
   * @en Creates a new UiScale instance.
   */
  static create(): UiScale;
}

/**
 * @zh 字体样式
 * @en Font Style
 */
declare enum UITextFontFamily {
  /**
   * @zh 默认字体
   * @en Default font
   */
  Default = 0,
  /**
   * @zh 粗圆体
   * @en Bold Round
   */
  BoldRound = 1,
  /**
   * @zh Code New Roman Bold
   * @en Code New Roman Bold
   */
  CodeNewRomanBold = 2,
  /**
   * @zh EN-Serif
   * @en EN-Serif
   */
  ENSerif = 3,
}

/**
 * @zh 控制图像的显示方式
 * @en Controls how the image is displayed
 */
declare enum ImageDisplayMode {
  /**
   * @zh 铺满：（默认）适配元素外框长宽拉伸铺满展示，图片可能会变形
   * @en Fill: (Default) Stretches the image to fill the container, the image may be distorted.
   */
  Fill = 0,
  /**
   * @zh 等比铺满：等比缩放保证图片完整展示在外框内
   * @en Contain: Scales the image proportionally to ensure it is fully visible within the container.
   */
  Contain = 1,
  /**
   * @zh 等比截取：等比缩放图片使图片填满外框，超出部分将被裁剪（隐藏显示）
   * @en Cover: Scales the image proportionally to fill the container, with any excess parts being cropped (hidden).
   */
  Cover = 2,
  /**
   * @zh 无：按图片正常尺寸与外框中心对齐展示，不对图片进行任何缩放调整，但是超出元素框部分会被裁剪（隐藏显示）
   * @en None: Displays the image at its original size, centered within the container. No scaling is applied, but parts outside the container will be cropped (hidden).
   */
  None = 3,
}

/**
 * @zh 指针事件行为
 * @en Pointer Event Behavior
 */
declare enum PointerEventBehavior {
  /**
   * @zh 不响应，且不允许位于元素后方的其他元素响应。
   * @en Does not respond, and does not allow other elements behind the element to respond.
   */
  DISABLE_AND_BLOCK_PASS_THROUGH = 0,
  /**
   * @zh 不响应。
   * @en Does not respond.
   */
  DISABLE = 1,
  /**
   * @zh 不允许位于元素后方的其他元素响应。
   * @en Does not allow other elements behind the element to respond.
   */
  BLOCK_PASS_THROUGH = 2,
  /**
   * @zh 正常响应。
   * @en Responds normally.
   */
  ENABLE = 3,
}

/**
 * @zh 指针锁定状态变化事件。
 * @en Pointer lock state change event.
 */
declare type PointerLockChangeEvent = {
  /**
   * @zh 表示指针是否锁定。
   * @en Indicates whether the pointer is locked.
   */
  isLocked: boolean;
};
/**
 * @zh 玩家指针锁定状态变化或出错时产生的事件。
 * @en Event generated when the player's pointer lock state changes or an error occurs.
 */
declare type PointerLockEvents = {
  /**
   * @zh 玩家指针锁定状态变化或出错时产生的事件。
   * @en Event generated when the player's pointer lock state changes or an error occurs.
   */
  pointerlockchange: PointerLockChangeEvent;
  /**
   * @zh 玩家指针锁定状态变化或出错时产生的事件。
   * @en Event generated when the player's pointer lock state changes or an error occurs.
   */
  pointerlockerror: undefined;
};

/**
 * @zh 全局监听玩家的输入。
 * @en Globally listens for player input.
 */
declare class InputSystem {
  /**
   * @zh 全局监听玩家指针与UI元素交互时的产生的事件。
   * @en Globally listens for events generated when the player's pointer interacts with UI elements.
   */
  readonly uiEvents: EventEmitter<UiNodeEvents<UiElement>>;
  /**
   * @zh 全局监听当玩家指针锁定状态变化或出错时产生的事件。
   * @en Globally listens for events generated when the player's pointer lock state changes or an error occurs.
   */
  readonly pointerLockEvents: EventEmitter<PointerLockEvents>;
  /**
   * @zh 全局监听当玩家按下鼠标时产生的事件。
   * @en Globally listens for events generated when the player presses the mouse button.
   */
  onPointerDown: { sub: (handler: (e: { target: UiNode }) => void) => void };
  /**
   * @zh 调用后解锁鼠标指针。
   * @en Unlocks the mouse pointer after being called.
   */
  unlockPointer(): void;
  /**
   * @zh 调用后锁定鼠标指针，由于浏览器限制，此操作可能会失败。
   * @zh 有兴趣可以查看https://w3c.github.io/pointerlock/#dom-element-requestpointerlock。
   * @en Locks the mouse pointer after being called. This operation may fail due to browser restrictions.
   * @en For those interested, you can check https://w3c.github.io/pointerlock/#dom-element-requestpointerlock.
   */
  lockPointer(): void;
}

/**
 * @zh 代表客户端上的游戏世界。
 * @en Represents the game world on the client.
 */
declare class ClientWorld {
  /**
   * @zh 控制是否渲染3D场景。
   * @zh - 当关闭(false)时，3D 场景的渲染将在客户端暂停，画面会停留在最后一次渲染的状态。
   * @zh - 2D UI 不受此属性影响，除 3D 渲染外的客户端行为不受此属性影响。
   * @en Controls whether to render the 3D scene.
   * @en - When turned off (false), the rendering of the 3D scene will be paused on the client, and the screen will remain in the state of the last render.
   * @en - 2D UI is not affected by this property, and client behaviors other than 3D rendering are not affected by this property.
   */
  rendering3d: boolean;
}

/**
 * @zh 设备信息。
 * @en Device information.
 */
declare interface DeviceInfo {
  /**
   * @zh 设备类型。
   * @zh - Desktop : 桌面设备
   * @zh - Mobile : 手机设备
   * @en Device type.
   * @en - Desktop : Desktop device
   * @en - Mobile : Mobile device
   */
  deviceType: "Desktop" | "Mobile";
  /**
   * @zh 屏幕信息。
   * @en Screen information.
   */
  screen: {
    /**
     * @zh 屏幕宽度。
     * @en Screen width.
     */
    width: number;
    /**
     * @zh 屏幕高度。
     * @en Screen height.
     */
    height: number;
  };
}

/**
 * @zh 导航器。
 * @en Navigator.
 */
declare class ClientNavigator {
  /**
   * @zh 获取该客户端的用户代理信息。
   * @zh 值以及属性特性与浏览器本身的属性保持一致。
   * @en Gets the user agent information for this client.
   * @en The value and attribute characteristics are consistent with the browser's own properties.
   */
  readonly userAgent: string;

  /**
   * @zh 获取该客户端当前语言。
   * @zh 有效的语言代码示例包括“en”、“zh-CN”、“fr”、“fr-FR”、“es-ES”等。
   * @zh 值以及属性特性与浏览器本身的属性保持一致。
   * @en Gets the current language of this client.
   * @en Examples of valid language codes include "en", "zh-CN", "fr", "fr-FR", "es-ES", etc.
   * @en The value and attribute characteristics are consistent with the browser's own properties.
   */
  readonly language: string;

  /**
   * @zhcn 获取该客户端当前设备以及屏幕分辨率
   * @en Gets the current device and screen resolution of this client.
   */
  getDeviceInfo(): DeviceInfo;
}

/**
 * @zh 定义Audio事件的接口，包含事件的目标是Audio实例
 * @en Defines the interface for an Audio event, which includes the target, an Audio instance.
 */
interface AudioEvent {
  target: Audio;
}

/**
 * @zh 定义Audio事件映射类型，包括结束播放、数据加载和错误事件
 * @en Defines the Audio event map type, including events for playback ended, data loaded, and errors.
 */
type AudioEventMap = {
  /**
   * @zh 当音频播放结束时触发的事件
   * @en Event triggered when audio playback ends.
   */
  ended: AudioEvent;

  /**
   * @zh 当音频数据加载完成时触发的事件
   * @en Event triggered when audio data has finished loading.
   */
  loadeddata: AudioEvent;

  /**
   * @zh 当音频播放过程中发生错误时触发的事件
   * @en Event triggered when an error occurs during audio playback.
   */
  error: AudioEvent;
};

/**
 * @zh 客户端音频，继承自EventEmitter
 * @en Client-side audio, inherits from EventEmitter
 */
declare class Audio extends EventEmitter<AudioEventMap> {
  /**
   * @zh 创建一个新的Audio实例
   * @en Creates a new Audio instance.
   * @param url
   * @zh 设置音频的源路径
   * @en Sets the source path of the audio.
   */
  constructor(url: string);
  /**
   * @zh 设置或获取音频的源路径
   * @en Sets or gets the source path of the audio.
   */
  src: string;
  /**
   * @zh 设置或获取音频的音量，取值范围为0到1
   * @en Sets or gets the volume of the audio, with a value range from 0 to 1.
   */
  volume: number;
  /**
   * @zh 获取音频播放过程中的错误信息，如果没有错误则为null
   * @en Gets the error information during audio playback. Returns null if there is no error.
   */
  error: MediaError | null;
  /**
   * @zh 加载音频文件
   * @en Loads the audio file.
   */
  load(): void;
  /**
   * @zh 播放音频
   * @en Plays the audio.
   * @returns
   * @zh Promise，表示音频播放完成
   * @en A Promise that resolves when the audio playback is complete.
   */
  play(): Promise<void>;
  /**
   * @zh 暂停音频播放
   * @en Pauses the audio playback.
   */
  pause(): void;
}

/**
 * @zh 表示媒体操作期间发生的错误。该类用于封装媒体错误的详细信息。
 * @en Represents an error that occurred during a media operation. This class is used to encapsulate the details of media errors.
 */
declare class MediaError {
  /**
   * @zh 创建 MediaError 的实例。
   * @en Creates an instance of MediaError.
   * @param code
   * @zh 表示媒体错误类型的 MediaErrorCode 枚举值。
   * @en A MediaErrorCode enum value representing the type of media error.
   * @param message
   * @zh 描述错误详细信息的字符串。
   * @en A string describing the details of the error.
   */
  constructor(code: MediaErrorCode, message: string);

  /**
   * @zh 错误代码，表示媒体错误的类型。
   * @en The error code, indicating the type of media error.
   */
  code: MediaErrorCode;

  /**
   * @zh 错误消息，提供错误的详细描述。
   * @en The error message, providing a detailed description of the error.
   */
  message: string;
}

/**
 * @zh 定义了一组媒体错误代码。这些错误代码用于标识不同类型的媒体错误。
 * @en Defines a set of media error codes. These error codes are used to identify different types of media errors.
 */
declare enum MediaErrorCode {
  /**
   * @zh 媒体播放被中止。
   * @en Media playback was aborted.
   */
  MEDIA_ERR_ABORTED = 1,

  /**
   * @zh 网络错误导致媒体播放失败。
   * @en A network error caused the media playback to fail.
   */
  MEDIA_ERR_NETWORK = 2,

  /**
   * @zh 解码错误导致媒体播放失败。
   * @en A decoding error caused the media playback to fail.
   */
  MEDIA_ERR_DECODE = 3,

  /**
   * @zh 媒体源不受支持。
   * @en The media source is not supported.
   */
  MEDIA_ERR_SRC_NOT_SUPPORTED = 4,
}

/**
 * @zh 客户端媒体控制类。提供音频播放、停止播放、开始录音和停止录音等功能。
 * @en Client media control class. Provides functions such as playing audio, stopping audio, starting recording, and stopping recording.
 */
declare class ClientMedia {
  /**
   * @zh 播放音频
   * @en Plays audio.
   * @param spec
   * @zh 可选的音频配置参数，包含音频数据blob
   * @en Optional audio configuration parameters, including audio data blob.
   * @returns
   * @zh 返回一个Promise，表示音频播放完毕
   * @en Returns a Promise that resolves when audio playback is complete.
   */
  playAudio(
    spec?: Partial<{
      /**
       * @zh 音频Blob数据
       * @en Audio Blob data.
       */
      blob: Blob;
      /**
       * @zh 音频声音增益
       * @en Audio sound gain.
       */
      gain: number;
    }>
  ): Promise<void>;

  /**
   * @zh 停止播放音频
   * @en Stops playing audio.
   */
  stopPlayAudio(): void;

  /**
   * @zh 开始录音
   * @en Starts recording.
   * @returns
   * @zh 返回一个Promise，表示成功开始录音，反之则抛出错误
   * @en Returns a Promise that resolves on successful start of recording, or rejects with an error.
   */
  startRecording(): Promise<void>;

  /**
   * @zh 停止录音
   * @en Stops recording.
   * @returns
   * @zh 返回一个Promise，解析为录音的Blob对象，格式为`wav`
   * @en Returns a Promise that resolves to a Blob object of the recording in `wav` format.
   */
  stopRecording(): Promise<Blob>;
}

/**
 * @zh 表示一个 blob 对象，它是一个不可变的、类似文件的对象，用于表示原始二进制数据。Blob 通常用于处理 Web 应用程序中的二进制数据，例如图像、视频或其他文件类型。
 * @en Represents a blob object, which is an immutable, file-like object used for representing raw binary data. Blobs are often used to handle binary data in web applications, such as images, videos, or other file types.
 */
declare class Blob {
  /**
   * @zh Blob 接口的构造函数，用于创建一个新的 blob 对象。
   * @en Blob interface constructor function, used to create a new blob object.
   * @param blobParts
   * @zh 一个由 ArrayBufferView、ArrayBuffer、Blob 或字符串对象组成的数组，用于构成 blob。
   * @en An array of ArrayBufferView, ArrayBuffer, Blob, or string objects that make up the blob.
   * @param options
   * @zh 创建 blob 的可选参数，包括类型（MIME 类型）和结尾（行尾处理）。
   * @en Optional parameters for creating the blob, including type (MIME type) and endings (line ending handling).
   * @returns
   * @zh 返回一个新的 blob 对象。
   * @en Returns a new blob object.
   */
  constructor(
    blobParts?: ArrayBufferView[] | ArrayBuffer[] | Blob[] | string[],
    options?: BlobPropertyBag
  ): Blob;

  /**
   * @zh blob 的大小（以字节为单位），用于获取二进制数据的长度。
   * @en The size of the blob in bytes, used to get the length of the binary data.
   */
  readonly size: number;

  /**
   * @zh blob 的 MIME 类型，用于描述二进制数据的类型。如果类型未知，则可能为 null。
   * @en The MIME type of the blob, used to describe the type of binary data. It may be null if the type is unknown.
   */
  readonly type: string | null;

  /**
   * @zh 创建一个包含原始 blob 数据子集的新 blob 对象。
   * @en Creates a new blob object that contains a subset of the original blob's data.
   * @param start
   * @zh 子集的起始位置。如果未指定，则默认为 0。
   * @en The starting position of the subset. If not specified, it defaults to 0.
   * @param end
   * @zh 子集的结束位置。如果未指定，则默认为 blob 的大小。
   * @en The ending position of the subset. If not specified, it defaults to the size of the blob.
   * @param contentType
   * @zh 新 blob 的 MIME 类型。如果未指定，则默认为原始 blob 的类型。
   * @en The MIME type of the new blob. If not specified, it defaults to the type of the original blob.
   * @returns
   * @zh 返回一个包含指定数据子集的新 blob 对象。
   * @en Returns a new blob object containing the specified subset of data.
   */
  slice(start?: number, end?: number, contentType?: string): Blob;

  /**
   * @zh 返回一个包含 blob 二进制数据的 ArrayBuffer。
   * @en Returns an ArrayBuffer that contains the binary data of the blob.
   * @returns
   * @zh 返回一个 Promise，该 Promise 解析为表示 blob 数据的 ArrayBuffer。
   * @en Returns a Promise that resolves with an ArrayBuffer representing the blob's data.
   */
  arrayBuffer(): Promise<ArrayBuffer>;

  /**
   * @zh 返回一个 ReadableStream，可用于将 blob 的数据作为 Uint8Array 流读取。
   * @en Returns a ReadableStream that can be used to read the blob's data as a stream of Uint8Array.
   * @returns
   * @zh 返回一个表示 blob 数据的 ReadableStream。
   * @en Returns a ReadableStream that represents the blob's data.
   */
  stream(): ReadableStream<Uint8Array>;

  /**
   * @zh 返回 blob 数据的文本表示形式。
   * @en Returns the text representation of the blob's data.
   * @returns
   * @zh 返回一个 Promise，该 Promise 解析为表示 blob 数据的字符串。
   * @en Returns a Promise that resolves with a string representing the blob's data.
   */
  text(): Promise<string>;
}

/**
 * @zh 创建 blob 的可选参数，包括 MIME 类型和行尾处理。
 * @en Optional parameters for creating a blob, including the MIME type and line ending handling.
 */
interface BlobPropertyBag {
  /**
   * @zh blob 的 MIME 类型，用于描述二进制数据的类型。如果未指定类型，则可能为 undefined。
   * @en The MIME type of the blob, used to describe the type of binary data. It may be undefined if no type is specified.
   */
  type?: string;

  /**
   * @zh 指定从文本创建 blob 时如何处理行尾。如果不需要特殊处理，则可能为 undefined。
   * @en Specifies how line endings are handled when creating a blob from text. It may be undefined if no special handling is required.
   */
  endings?: string;
}

/**
 * @zh 用于执行 HTTP 请求。
 * @en Used to perform HTTP requests.
 */
declare class ClientHttp {
  /**
   * @zh 使用给定的 URL 和选项来发起 HTTP 请求。
   * @en Initiates an HTTP request using the given URL and options.
   *
   * @param url
   * @zh 请求的 URL 地址。
   * @en The URL address for the request.
   * @param options
   * @zh 可选的请求配置项，包括请求方法、头部信息等。
   * @en Optional request configuration items, including request method, header information, etc.
   * @returns
   * @zh 返回一个 Promise，该 Promise 解析为服务器的响应。
   * @en Returns a Promise that resolves to the server's response.
   */
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

/**
 * @zh 游戏屏幕的宽度，取决于玩家进入游戏时的屏幕大小。
 * @en The width of the game screen, which depends on the screen size when the player enters the game.
 */
declare const screenWidth: number;
/**
 * @zh 游戏屏幕的高度，取决于玩家进入游戏时的屏幕大小。
 * @en The height of the game screen, which depends on the screen size when the player enters the game.
 */
declare const screenHeight: number;
/**
 * @zh 默认的屏幕下的UI根节点。
 * @en The root UI node under the default screen.
 * @deprecated
 * @zh 已不推荐使用该属性，请使用{@link UiScreen}获取屏幕对象。
 * @en This property is deprecated. Please use {@link UiScreen} to get the screen object.
 */
declare const ui: UiNode;
/**
 * @zh 客户端与服务端通信的通道。
 * @en The communication channel between the client and the server.
 */
declare const remoteChannel: ClientRemoteChannel;
/**
 * @zh 获取客户端的浏览器信息。
 * @en Gets the client's browser information.
 */
declare const navigator: ClientNavigator;
/**
 * @zh 获取客户端的游戏世界。
 * @en Gets the client's game world.
 */
declare const world: ClientWorld;
/**
 * @zh 全局监听玩家的输入。
 * @en Globally listens for player input.
 */
declare const input: InputSystem;
/**
 * @zh 全局监听玩家的屏幕。
 * @en Globally listens for the player's screen.
 */
declare const screen: ClientScreen;
/**
 * @zh 获取客户端的录音管理器。
 * @en Gets the client's recording manager.
 */
declare const media: ClientMedia;
/**
 * @zh 客户端请求外部数据
 * @en Client requests external data.
 */
declare const http: ClientHttp;

type AbortSignal = {
  readonly aborted: boolean;

  addEventListener: (
    type: "abort",
    listener: (this: AbortSignal) => void
  ) => void;
  removeEventListener: (
    type: "abort",
    listener: (this: AbortSignal) => void
  ) => void;
};

type HeadersInit =
  | Headers
  | Record<string, string>
  | Iterable<readonly [string, string]>
  | Iterable<Iterable<string>>;

/**
 * @zh 此 Fetch API 接口允许您对 HTTP 请求和响应头执行各种操作。这些操作包括检索、设置、添加和删除。Headers 对象具有一个关联的头列表，该列表最初为空，由零个或多个名称和值对组成。您可以使用 append() 等方法向其添加内容（请参阅示例）。在此接口的所有方法中，头名称都通过不区分大小写的字节序列进行匹配。
 * @en This Fetch API interface allows you to perform various actions on HTTP request and response headers. These actions include retrieving, setting, adding to, and removing. A Headers object has an associated header list, which is initially empty and consists of zero or more name and value pairs. You can add to this using methods like append() (see Examples.) In all methods of this interface, header names are matched by case-insensitive byte sequence.
 */
class Headers {
  constructor(init?: HeadersInit);

  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(
    callbackfn: (value: string, key: string, parent: Headers) => void,
    thisArg?: any
  ): void;

  [Symbol.iterator](): IterableIterator<[string, string]>;
  /**
   * @zh 返回一个迭代器，允许遍历此对象中包含的所有键/值对。
   * @en Returns an iterator allowing to go through all key/value pairs contained in this object.
   */
  entries(): IterableIterator<[string, string]>;
  /**
   * @zh 返回一个迭代器，允许遍历此对象中包含的键/值对的所有键。
   * @en Returns an iterator allowing to go through all keys of the key/value pairs contained in this object.
   */
  keys(): IterableIterator<string>;
  /**
   * @zh 返回一个迭代器，允许遍历此对象中包含的键/值对的所有值。
   * @en Returns an iterator allowing to go through all values of the key/value pairs contained in this object.
   */
  values(): IterableIterator<string>;

  /** Node-fetch extension */
  raw(): Record<string, string[]>;
}

interface RequestInit {
  /**
   * @zh 一个 BodyInit 对象或 null，用于设置请求的正文。
   * @en A BodyInit object or null to set request's body.
   */
  body?: BodyInit | null;
  /**
   * @zh 一个 Headers 对象、一个对象字面量或一个由双元素数组组成的数组，用于设置请求的头部。
   * @en A Headers object, an object literal, or an array of two-item arrays to set request's headers.
   */
  headers?: HeadersInit;
  /**
   * @zh 一个字符串，用于设置请求的方法。
   * @en A string to set request's method.
   */
  method?: string;
  /**
   * @zh 一个字符串，指示请求是否应遵循重定向、在遇到重定向时是否应报错，或是否应（以不透明方式）返回重定向。用于设置请求的重定向策略。
   * @en A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.
   */
  redirect?: RequestRedirect;
  /**
   * @zh 一个 AbortSignal，用于设置请求的信号。
   * @en An AbortSignal to set request's signal.
   */
  signal?: AbortSignal | null;
  /**
   * @zh 一个字符串，其值为同源 URL、“about:client”或空字符串，用于设置请求的引用来源。
   * @en A string whose value is a same-origin URL, "about:client", or the empty string, to set request’s referrer.
   */
  referrer?: string;
  /**
   * @zh 一个引用策略，用于设置请求的 referrerPolicy。
   * @en A referrer policy to set request’s referrerPolicy.
   */
  referrerPolicy?: ReferrerPolicy;
}

interface ResponseInit {
  headers?: HeadersInit;
  status?: number;
  statusText?: string;
}

type BodyInit =
  | Blob
  | Buffer
  | URLSearchParams
  | FormData
  | NodeJS.ReadableStream
  | string;
declare class BodyMixin {
  constructor(body?: BodyInit, options?: { size?: number });

  readonly body: NodeJS.ReadableStream | null;
  readonly bodyUsed: boolean;
  readonly size: number;

  /**
   * @deprecated
   * @zh 请改用 `body.arrayBuffer()`。
   * @en Use `body.arrayBuffer()` instead.
   */
  buffer(): Promise<Buffer>;
  /**
   * @zh 读取响应流并将其解析为 ArrayBuffer。
   * @en Reads the response stream and resolves it as an ArrayBuffer.
   * @returns
   * @zh 一个解析为 ArrayBuffer 的 Promise。
   * @en A promise that resolves with an ArrayBuffer.
   */
  arrayBuffer(): Promise<ArrayBuffer>;
  /**
   * @zh 读取响应流并将其解析为 FormData 对象。
   * @en Reads the response stream and resolves it as a FormData object.
   * @returns
   * @zh 一个解析为 FormData 对象的 Promise。
   * @en A promise that resolves with a FormData object.
   */
  formData(): Promise<FormData>;
  /**
   * @zh 读取响应流并将其解析为 Blob。
   * @en Reads the response stream and resolves it as a Blob.
   * @returns
   * @zh 一个解析为 Blob 的 Promise。
   * @en A promise that resolves with a Blob.
   */
  blob(): Promise<Blob>;
  /**
   * @zh 读取响应流并将其解析为 JSON。
   * @en Reads the response stream and resolves it as JSON.
   * @returns
   * @zh 一个解析为 JSON 对象的 Promise。
   * @en A promise that resolves with a JSON object.
   */
  json(): Promise<unknown>;
  /**
   * @zh 读取响应流并将其解析为文本。
   * @en Reads the response stream and resolves it as text.
   * @returns
   * @zh 一个解析为字符串的 Promise。
   * @en A promise that resolves with a string.
   */
  text(): Promise<string>;
}

type RequestRedirect = "error" | "follow" | "manual";
type ReferrerPolicy =
  | ""
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "same-origin"
  | "origin"
  | "strict-origin"
  | "origin-when-cross-origin"
  | "strict-origin-when-cross-origin"
  | "unsafe-url";
type RequestInfo = string | Request;

type ResponseType =
  | "basic"
  | "cors"
  | "default"
  | "error"
  | "opaque"
  | "opaqueredirect";

/**
 * @zh 此接口表示对请求的响应。
 * @en This interface represents the response to a request.
 */
class Response extends BodyMixin {
  /**
   * @zh 创建一个新的 Response 对象。
   * @en Creates a new Response object.
   */
  constructor(body?: BodyInit | null, init?: ResponseInit);

  /**
   * @zh 与响应关联的 Headers 对象。
   * @en The Headers object associated with the response.
   */
  readonly headers: Headers;
  /**
   * @zh 一个布尔值，指示响应是否成功（状态在 200-299 范围内）。
   * @en A boolean indicating whether the response was successful (status in the range 200-299).
   */
  readonly ok: boolean;
  /**
   * @zh 指示响应是否是重定向的结果。
   * @en Indicates if the response is the result of a redirect.
   */
  readonly redirected: boolean;
  /**
   * @zh 响应的状态码。
   * @en The status code of the response.
   */
  readonly status: number;
  /**
   * @zh 与状态码对应的状态消息。
   * @en The status message corresponding to the status code.
   */
  readonly statusText: string;
  /**
   * @zh 响应的类型。
   * @en The type of the response.
   */
  readonly type: ResponseType;
  /**
   * @zh 响应的 URL。
   * @en The URL of the response.
   */
  readonly url: string;
  /**
   * @zh 创建 Response 对象的克隆。
   * @en Creates a clone of a Response object.
   */
  clone(): Response;

  /**
   * @zh 返回一个与网络错误关联的新 Response 对象。
   * @en Returns a new Response object associated with a network error.
   */
  static error(): Response;
  /**
   * @zh 创建一个重定向到指定 URL 的新响应。
   * @en Creates a new response that redirects to a specified URL.
   */
  static redirect(url: string, status?: number): Response;
  /**
   * @zh 创建一个表示 JSON 的新响应。
   * @en Creates a new response that represents JSON.
   */
  static json(data: any, init?: ResponseInit): Response;
}

/**
 * @zh 表示一个 fetch 错误。
 * @en Represents a fetch error.
 */
class FetchError extends Error {
  constructor(
    message: string,
    type: string,
    systemError?: Record<string, unknown>
  );

  name: "FetchError";
  [Symbol.toStringTag]: "FetchError";
  type: string;
  code?: string;
  errno?: string;
}

/**
 * @zh 表示一个中止错误。
 * @en Represents an abort error.
 */
class AbortError extends Error {
  type: string;
  name: "AbortError";
  [Symbol.toStringTag]: "AbortError";
}

/**
 * @zh 延迟指定毫秒后返回一个 resolve 的 Promise 对象。
 * @en Returns a Promise that resolves after a specified number of milliseconds.
 * @param ms
 * @zh 延迟的毫秒数。
 * @en The number of milliseconds to delay.
 * @returns
 * @zh 一个 Promise，在指定的毫秒数后 resolve。
 * @en A Promise that resolves after the specified number of milliseconds.
 * @example
 *
 * // 返回Promise，有两种基本用法
 * // #1
 *
 * sleep(1000).then(() => {
 *   console.log('这句话将在一秒后输出。')
 * })
 *
 * // #2
 *
 * (async () => {
 *     await sleep(1000);
 *     console.log('这句话将在一秒后输出。')
 * })();
 */
declare function sleep(ms: number): Promise<void>;
/**
 * @zh 用于延迟执行函数的计时器，`delayMs` 毫秒后异步执行回调函数 `callback`。
 * @en A timer for delayed execution of a function. Asynchronously executes the callback function `callback` after `delayMs` milliseconds.
 * @param callback
 * @zh 要延迟执行的回调函数。
 * @en The callback function to be executed with a delay.
 * @param delayMs
 * @zh 延迟的毫秒数。
 * @en The delay in milliseconds.
 * @returns
 * @zh 用于清除计时器的 ID。
 * @en The ID used to clear the timer.
 */
declare function setTimeout(callback: Function, delayMs: number): number;
/**
 * @zh 用于清除传入 ID 对应的 `setTimeout` 计时器。
 * @en Clears the `setTimeout` timer corresponding to the provided ID.
 * @param id
 * @zh 要清除的计时器的 ID。
 * @en The ID of the timer to be cleared.
 */
declare function clearTimeout(id: number): void;
/**
 * @zh 用于定时执行函数的计时器，每 `delayMs` 毫秒后异步执行回调函数 `callback`。
 * @en A timer for periodic execution of a function. Asynchronously executes the callback function `callback` every `delayMs` milliseconds.
 * @param callback
 * @zh 要定时执行的回调函数。
 * @en The callback function to be executed periodically.
 * @param delayMs
 * @zh 间隔的毫秒数。
 * @en The interval in milliseconds.
 * @returns
 * @zh 用于清除计时器的 ID。
 * @en The ID used to clear the timer.
 */
declare function setInterval(callback: Function, delayMs: number): number;
/**
 * @zh 用于清除传入 ID 对应的 `setInterval` 计时器。
 * @en Clears the `setInterval` timer corresponding to the provided ID.
 * @param id
 * @zh 要清除的计时器的 ID。
 * @en The ID of the timer to be cleared.
 */
declare function clearInterval(id: number): void;

/**
 * @zh 子窗口向父窗口通信
 * @en Child window communicates with parent window.
 * @zh 仅在 Webview 中 callback 生效
 * @en The callback is only effective in a Webview.
 */
declare function call(key, value, callback?): any;
/**
 * @zh 子窗口向父窗口异步通信
 * @en Child window communicates with parent window asynchronously.
 */
declare function callAsync(key, value): Promise<any>;
