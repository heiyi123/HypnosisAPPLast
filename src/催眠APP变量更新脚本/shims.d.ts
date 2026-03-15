/** 脚本运行在酒馆环境中，lodash 由 webpack 打包；此处仅满足类型检查 */
declare module 'lodash' {
  const _: { get: (...args: any[]) => any; set: (...args: any[]) => any; isPlainObject: (v: any) => boolean; isEqual: (a: any, b: any) => boolean; has: (o: object, path: string) => boolean; unset: (o: object, path: string) => boolean; [key: string]: any };
  export default _;
}
