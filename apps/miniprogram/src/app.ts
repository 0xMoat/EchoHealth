import { Component } from 'react'
import Taro from '@tarojs/taro'
import './app.css'

class App extends Component {
  componentDidMount() {
    // Auto-login on first launch
    this.initUser()
  }

  async initUser() {
    const stored = Taro.getStorageSync('userId')
    if (stored) return

    try {
      const loginRes = await Taro.login()
      const res = await Taro.request({
        url: `${process.env.API_BASE_URL}/auth/login`,
        method: 'POST',
        data: { code: loginRes.code },
      })
      if (res.statusCode === 200 && res.data.userId) {
        Taro.setStorageSync('userId', res.data.userId)
        Taro.setStorageSync('isPro', res.data.isPro)
      }
    } catch (e) {
      console.error('[App] initUser failed:', e)
    }
  }

  render() {
    return this.props.children
  }
}

export default App
