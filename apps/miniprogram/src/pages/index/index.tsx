import { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button, Image } from '@tarojs/components'
import heroIllustration from '../../assets/hero-illustration.svg'
import './index.css'

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    PHYSICAL_EXAM: '综合体检',
    BLOOD_TEST: '血液检查',
    IMAGING: '影像检查',
  }
  return map[type] || '体检报告'
}

interface RecentReport {
  id: string
  reportType: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  videoUrl?: string
}

interface State {
  reports: RecentReport[]
  loading: boolean
  usedThisMonth: number
  isPro: boolean
}

class IndexPage extends Component<{}, State> {
  state: State = {
    reports: [],
    loading: false,
    usedThisMonth: 0,
    isPro: false,
  }

  componentDidShow() {
    this.loadRecentReports()
    this.loadUserQuota()
  }

  async loadUserQuota() {
    const userId = Taro.getStorageSync('userId')
    if (!userId) return
    try {
      const res = await Taro.request({
        url: `${process.env.API_BASE_URL}/user/${userId}`,
        method: 'GET',
      })
      if (res.statusCode === 200) {
        this.setState({ usedThisMonth: res.data.usedThisMonth, isPro: res.data.isPro })
      }
    } catch (e) {
      console.error('[Index] loadUserQuota failed:', e)
    }
  }

  async loadRecentReports() {
    const userId = Taro.getStorageSync('userId')
    if (!userId) return

    this.setState({ loading: true })
    try {
      const res = await Taro.request({
        url: `${process.env.API_BASE_URL}/reports?userId=${userId}&limit=5`,
        method: 'GET',
      })
      if (res.statusCode === 200 && Array.isArray(res.data)) {
        this.setState({ reports: res.data })
      }
    } catch (e) {
      console.error('[Index] loadRecentReports failed:', e)
    } finally {
      this.setState({ loading: false })
    }
  }

  handleUpload() {
    Taro.navigateTo({ url: '/pages/upload/index' })
  }

  handleViewResult(reportId: string) {
    Taro.navigateTo({ url: `/pages/result/index?reportId=${reportId}` })
  }

  getStatusLabel(status: RecentReport['status']): string {
    const map: Record<RecentReport['status'], string> = {
      PENDING: '排队中',
      PROCESSING: '生成中',
      COMPLETED: '已完成',
      FAILED: '失败',
    }
    return map[status]
  }

  getStatusClass(status: RecentReport['status']): string {
    const map: Record<RecentReport['status'], string> = {
      PENDING: 'status-pending',
      PROCESSING: 'status-processing',
      COMPLETED: 'status-completed',
      FAILED: 'status-failed',
    }
    return map[status]
  }

  render() {
    const { reports, loading, usedThisMonth, isPro } = this.state
    const freeLeft = Math.max(0, 3 - usedThisMonth)

    return (
      <View className='page'>
        <View className='cta-card'>
          <Image className='cta-illustration' src={heroIllustration} mode='aspectFit' />
          <Text className='cta-eyebrow'>AI 视频讲解</Text>
          <Text className='cta-title'>让体检报告开口说话</Text>
          <Text className='cta-desc'>
            上传报告照片，自动生成通俗易懂的视频讲解，帮助您和家人轻松了解体检结果
          </Text>
          <Button className='cta-btn' onClick={this.handleUpload.bind(this)}>
            上传报告
          </Button>
          {!isPro && (
            <Text className='cta-quota'>本月剩余 {freeLeft} 次免费</Text>
          )}
        </View>

        {!isPro && usedThisMonth >= 3 && (
          <View
            className='quota-banner'
            onClick={() => Taro.navigateTo({ url: '/pages/upgrade/index' })}
          >
            <Text className='quota-title'>本月免费次数已用完</Text>
            <Text className='quota-action'>升级 Pro ›</Text>
          </View>
        )}

        <View className='how-it-works'>
          <View className='step'>
            <View className='step-num'><Text className='step-num-text'>1</Text></View>
            <Text className='step-label'>拍照上传</Text>
            <Text className='step-desc'>拍摄体检报告页面</Text>
          </View>
          <View className='step-line' />
          <View className='step'>
            <View className='step-num'><Text className='step-num-text'>2</Text></View>
            <Text className='step-label'>AI 解读</Text>
            <Text className='step-desc'>智能分析各项指标</Text>
          </View>
          <View className='step-line' />
          <View className='step'>
            <View className='step-num'><Text className='step-num-text'>3</Text></View>
            <Text className='step-label'>观看视频</Text>
            <Text className='step-desc'>通俗易懂的讲解</Text>
          </View>
        </View>

        <View className='reports-section'>
          <Text className='section-title'>历史记录</Text>
          {loading ? (
            <View className='placeholder'>
              <Text className='placeholder-text'>加载中...</Text>
            </View>
          ) : reports.length === 0 ? (
            <View className='empty-state'>
              <View className='empty-icon'>
                <View className='empty-doc'>
                  <View className='empty-doc-line' />
                  <View className='empty-doc-line short' />
                  <View className='empty-doc-line' />
                </View>
              </View>
              <Text className='empty-title'>还没有报告记录</Text>
              <Text className='empty-desc'>上传您的第一份体检报告，AI 将为您生成专属的健康讲解视频</Text>
            </View>
          ) : (
            <View className='report-list'>
              {reports.map((report) => (
                <View
                  key={report.id}
                  className='report-item'
                  onClick={() => this.handleViewResult(report.id)}
                >
                  <View className='report-left'>
                    <View className={`report-dot ${this.getStatusClass(report.status)}`} />
                    <View className='report-info'>
                      <Text className='report-type'>{getTypeLabel(report.reportType)}</Text>
                      <Text className='report-date'>
                        {new Date(report.createdAt).toLocaleDateString('zh-CN')}
                      </Text>
                    </View>
                  </View>
                  <View className='report-right'>
                    <Text className={`report-status-text ${this.getStatusClass(report.status)}`}>
                      {this.getStatusLabel(report.status)}
                    </Text>
                    <Text className='report-arrow'>›</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    )
  }
}

export default IndexPage
