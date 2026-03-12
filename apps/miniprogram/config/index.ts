import type { UserConfigExport } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'

const config: UserConfigExport = {
  projectName: 'EchoHealth',
  date: '2025-01-01',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {},
  copy: { patterns: [], options: {} },
  framework: 'react',
  compiler: 'webpack5',
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      url: { enable: true },
      cssModules: { enable: false },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    router: { mode: 'browser' },
    postcss: {
      autoprefixer: { enable: true },
      cssModules: { enable: false },
    },
  },
  // API_BASE_URL is set in config/dev.ts and config/prod.ts
  // (shallow merge from env-specific config overwrites this `env` block)
}

export default {
  ...config,
  ...(process.env.NODE_ENV === 'development' ? devConfig : prodConfig),
}
