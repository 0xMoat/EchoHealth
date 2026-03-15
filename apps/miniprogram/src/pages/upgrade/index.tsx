import { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import './index.css'

interface State {
  loading: boolean
}

const FEATURES = [
  { label: '每月次数', free: '3 次', pro: '30 次' },
  { label: 'OCR 识别', free: true, pro: true },
  { label: 'AI 解读', free: true, pro: true },
  { label: '优先队列', free: false, pro: true },
]

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
        Taro.showToast({ title: '升级成功', icon: 'success' })
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

  renderCheck(val: boolean | string, isPro: boolean) {
    if (typeof val === 'string') {
      return <Text className={`cell-val ${isPro ? 'cell-val-pro' : ''}`}>{val}</Text>
    }
    if (val) {
      return <Text className={`cell-check ${isPro ? 'cell-check-pro' : ''}`}>&#10003;</Text>
    }
    return <Text className='cell-dash'>—</Text>
  }

  render() {
    const { loading } = this.state

    return (
      <View className='page'>
        <View className='header'>
          <Text className='header-eyebrow'>PRO</Text>
          <Text className='header-title'>升级会员</Text>
          <Text className='header-desc'>解锁更多次数，助力健康管理</Text>
        </View>

        <View className='pricing-card'>
          <View className='price-row'>
            <Text className='price-currency'>¥</Text>
            <Text className='price-amount'>18</Text>
            <Text className='price-period'>/月</Text>
          </View>

          <View className='compare-table'>
            <View className='table-head'>
              <View className='col-label' />
              <View className='col-plan'>
                <Text className='plan-name'>免费</Text>
              </View>
              <View className='col-plan col-pro'>
                <Text className='plan-name plan-name-pro'>Pro</Text>
              </View>
            </View>

            {FEATURES.map((row) => (
              <View key={row.label} className='table-row'>
                <View className='col-label'>
                  <Text className='row-label'>{row.label}</Text>
                </View>
                <View className='col-plan'>
                  {this.renderCheck(row.free, false)}
                </View>
                <View className='col-plan col-pro'>
                  {this.renderCheck(row.pro, true)}
                </View>
              </View>
            ))}
          </View>

          <Button
            className={`subscribe-btn ${loading ? 'subscribe-btn-disabled' : ''}`}
            onClick={this.handleSubscribe.bind(this)}
            disabled={loading}
          >
            {loading ? '处理中...' : '立即订阅'}
          </Button>
        </View>

        <Text className='footer-hint'>模拟支付 · 点击即升级 · 30 天有效</Text>
      </View>
    )
  }
}

export default UpgradePage
