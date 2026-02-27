import { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image, Button } from '@tarojs/components'
import './index.css'

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
}

class IndexPage extends Component<{}, State> {
  state: State = {
    reports: [],
    loading: false,
  }

  componentDidShow() {
    this.loadRecentReports()
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
    const { reports, loading } = this.state

    return (
      <View className='page'>
        {/* Hero */}
        <View className='hero'>
          <View className='hero-icon'>🩺</View>
          <Text className='hero-title'>EchoHealth</Text>
          <Text className='hero-subtitle'>让体检报告说话</Text>
          <Text className='hero-desc'>上传您的体检报告，AI 自动生成通俗易懂的讲解视频</Text>
        </View>

        {/* Upload Button */}
        <View className='upload-btn-wrap'>
          <Button className='upload-btn' onClick={this.handleUpload.bind(this)}>
            📤 上传体检报告
          </Button>
        </View>

        {/* Features */}
        <View className='features'>
          <View className='feature-item'>
            <Text className='feature-icon'>🔍</Text>
            <Text className='feature-title'>智能识别</Text>
            <Text className='feature-desc'>OCR 提取报告数据</Text>
          </View>
          <View className='feature-item'>
            <Text className='feature-icon'>🤖</Text>
            <Text className='feature-title'>AI 解读</Text>
            <Text className='feature-desc'>专业医学知识讲解</Text>
          </View>
          <View className='feature-item'>
            <Text className='feature-icon'>🎬</Text>
            <Text className='feature-title'>视频生成</Text>
            <Text className='feature-desc'>配音解说视频</Text>
          </View>
        </View>

        {/* Recent Reports */}
        {reports.length > 0 && (
          <View className='recent'>
            <Text className='section-title'>最近记录</Text>
            {loading ? (
              <Text className='loading-text'>加载中...</Text>
            ) : (
              reports.map((report) => (
                <View
                  key={report.id}
                  className='report-item'
                  onClick={() => this.handleViewResult(report.id)}
                >
                  <View className='report-info'>
                    <Text className='report-type'>{report.reportType}</Text>
                    <Text className='report-date'>
                      {new Date(report.createdAt).toLocaleDateString('zh-CN')}
                    </Text>
                  </View>
                  <View className={`report-status ${this.getStatusClass(report.status)}`}>
                    <Text className='status-text'>{this.getStatusLabel(report.status)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    )
  }
}

export default IndexPage
