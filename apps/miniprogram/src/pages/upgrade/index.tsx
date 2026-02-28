import { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import './index.css'

interface State {
  loading: boolean
}

class UpgradePage extends Component<{}, State> {
  state: State = { loading: false }

  async handleSubscribe() {
    const userId = Taro.getStorageSync('userId')
    if (!userId) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setState({ loading: true })
    try {
      const res = await Taro.request({
        url: `${process.env.API_BASE_URL}/orders`,
        method: 'POST',
        data: { userId },
        header: { 'Content-Type': 'application/json' },
      })

      if (res.statusCode === 201) {
        Taro.setStorageSync('isPro', true)
        Taro.showToast({ title: '升级成功！', icon: 'success' })
        setTimeout(() => Taro.navigateBack(), 1500)
      } else {
        Taro.showToast({ title: res.data?.error || '升级失败', icon: 'none' })
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '网络错误', icon: 'none' })
    } finally {
      this.setState({ loading: false })
    }
  }

  render() {
    const { loading } = this.state

    return (
      <View className='page'>
        <Text className='page-title'>升级 Pro 会员</Text>
        <Text className='page-subtitle'>解锁更多次数，助力健康管理</Text>

        <View className='table'>
          <View className='table-header'>
            <View className='col-label' />
            <View className='col-free'><Text className='col-title'>免费版</Text></View>
            <View className='col-pro'>
              <Text className='col-badge'>推荐</Text>
              <Text className='col-title'>Pro 版</Text>
            </View>
          </View>

          {[
            { label: '每月次数', free: '3 次', pro: '30 次' },
            { label: 'OCR 识别', free: '✓', pro: '✓' },
            { label: 'AI 解读', free: '✓', pro: '✓' },
            { label: '优先处理队列', free: '✗', pro: '✓' },
          ].map((row) => (
            <View key={row.label} className='table-row'>
              <View className='col-label'><Text className='row-label'>{row.label}</Text></View>
              <View className='col-free'><Text className='row-val'>{row.free}</Text></View>
              <View className='col-pro'><Text className='row-val pro-val'>{row.pro}</Text></View>
            </View>
          ))}
        </View>

        <View className='price-wrap'>
          <Text className='price'>¥18</Text>
          <Text className='price-unit'>/月</Text>
        </View>

        <Button
          className={`subscribe-btn ${loading ? 'subscribe-btn-disabled' : ''}`}
          onClick={this.handleSubscribe.bind(this)}
          disabled={loading}
        >
          {loading ? '处理中...' : '立即订阅'}
        </Button>

        <Text className='hint'>模拟支付 · 点击即升级 · 30天有效期</Text>
      </View>
    )
  }
}

export default UpgradePage
