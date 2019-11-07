// Type defined by feihua

import { EventEmitter } from 'events'

declare class TarsConfig extends EventEmitter {
  /**
   * 创建 TarsConfig 实例
   * @param data tars 配置文件路径, 或已配置的 @tars/utils.tars-config-parser 实例. 如果服务通过 node-agent (或在tars平台) 运行，则无需传入
   */
  constructor (data?: any)

  /** 配置文件的格式 */
  readonly FORMAT: {
    C: 'C',
    JSON: 'JSON',
    TEXT: 'TEXT'
  }

  /** 配置文件存放的区域 */
  readonly LOCATION: {
    SERVER: 'SERVER',
    APP: 'APP'
  }

  /** 获取默认配置文件 (文件名由 App.Server.conf 组成) */
  loadServerConfig<T = any> (options?: TarsConfig.TarsConfigOptions): Promise<T>

  /** 获取配置文件列表 (所有配置文件名) */
  loadList (options?: TarsConfig.TarsConfigOptions): Promise<string[]>

  /** 获取配置文件内容 */
  loadConfig (): Promise<TarsConfig.Config[]>
  loadConfig<T = any> (fileName: string, options?: TarsConfig.TarsConfigOptions): Promise<T>
  loadConfig (fileNames: string[], options?: TarsConfig.TarsConfigOptions): Promise<TarsConfig.Config[]>
}

declare namespace TarsConfig {
  interface TarsConfigOptions {
    format?: 'C' | 'JSON' | 'TEXT',
    location?: 'SERVER' | 'APP'
  }

  interface Config<T = any> {
    filename: string,
    content: T
  }
}

export = TarsConfig
