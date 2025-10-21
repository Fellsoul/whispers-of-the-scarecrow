/**
 * JSON 模块类型声明
 * 允许直接导入 .json 文件
 */

declare module '*.json' {
  const value: any;
  export default value;
}
