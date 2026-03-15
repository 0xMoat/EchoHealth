import { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Video, Button } from '@tarojs/components'
import './index.css'

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    PHYSICAL_EXAM: '综合体检',
    BLOOD_TEST: '血液检查',
    IMAGING: '影像检查',
  }
  return map[type] || '体检报告'
}

type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface Report {
  id: string
  status: ReportStatus
  reportType: string
  errorMsg?: string
  video?: {
    url: string
    durationSec: number
    createdAt: string
  }
}

interface State {
  report: Report | null
  loading: boolean
  error: string
  hintIndex: number
}

const POLL_INTERVAL = 3000

const WAITING_HINTS = [
  '通常需要 1-3 分钟，请耐心等待',
  '正在逐项分析您的体检指标...',
  '生成通俗易懂的讲解内容...',
  '快好了，正在合成视频画面...',
  '您的健康，值得这份等待',
]

class ResultPage extends Component<{}, State> {
  state: State = {
    report: null,
    loading: true,
    error: '',
    hintIndex: 0,
  }

  private reportId = ''
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private hintTimer: ReturnType<typeof setInterval> | null = null

  componentDidMount() {
    const params = Taro.getCurrentInstance().router?.params
    this.reportId = params?.reportId || ''
    if (this.reportId) {
      this.fetchReport()
      this.startHintRotation()
    } else {
      this.setState({ loading: false, error: '报告 ID 缺失' })
    }
  }

  componentWillUnmount() {
    this.clearPoll()
    this.clearHintRotation()
  }

  clearPoll() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }

  startHintRotation() {
    this.hintTimer = setInterval(() => {
      this.setState((prev) => ({
        hintIndex: (prev.hintIndex + 1) % WAITING_HINTS.length,
      }))
    }, 5000)
  }

  clearHintRotation() {
    if (this.hintTimer) {
      clearInterval(this.hintTimer)
      this.hintTimer = null
    }
  }

  async fetchReport() {
    try {
      const res = await Taro.request({
        url: `${process.env.API_BASE_URL}/reports/${this.reportId}`,
        method: 'GET',
      })
      if (res.statusCode === 200) {
        const report: Report = res.data
        this.setState({ report, loading: false, error: '' })

        if (report.status === 'PENDING' || report.status === 'PROCESSING') {
          this.pollTimer = setTimeout(() => this.fetchReport(), POLL_INTERVAL)
        }
      } else if (res.statusCode === 404) {
        this.setState({ loading: false, error: '报告不存在' })
      } else {
        this.setState({ loading: false, error: '加载失败' })
      }
    } catch (e) {
      this.setState({ loading: false, error: '网络错误，请稍后重试' })
      this.pollTimer = setTimeout(() => this.fetchReport(), POLL_INTERVAL * 2)
    }
  }

  handleShare() {
    Taro.showShareMenu({ withShareTicket: true })
  }

  handleRetry() {
    Taro.navigateBack()
  }

  getProgressText(status: ReportStatus): string {
    const map: Record<ReportStatus, string> = {
      PENDING: '排队等待中，请稍候...',
      PROCESSING: 'AI 正在生成讲解视频...',
      COMPLETED: '视频已生成',
      FAILED: '生成失败',
    }
    return map[status]
  }

  getProgressPercent(status: ReportStatus): number {
    const map: Record<ReportStatus, number> = {
      PENDING: 15,
      PROCESSING: 65,
      COMPLETED: 100,
      FAILED: 0,
    }
    return map[status]
  }

  renderLoading() {
    return (
      <View className='center-wrap'>
        <View className='spinner' />
        <Text className='center-text'>加载中...</Text>
      </View>
    )
  }

  renderError() {
    return (
      <View className='center-wrap'>
        <View className='error-circle'>
          <Text className='error-mark'>!</Text>
        </View>
        <Text className='center-title'>{this.state.error}</Text>
        <Button className='action-btn outline-btn' onClick={this.handleRetry.bind(this)}>
          返回重试
        </Button>
      </View>
    )
  }

  renderProcessing(report: Report) {
    const percent = this.getProgressPercent(report.status)
    const text = this.getProgressText(report.status)
    const isFailed = report.status === 'FAILED'

    return (
      <View className='center-wrap'>
        {isFailed ? (
          <View className='failed-circle'>
            <Text className='failed-mark'>!</Text>
          </View>
        ) : (
          <View className='processing-ring' />
        )}
        <Text className='center-title'>{text}</Text>
        {isFailed && report.errorMsg && (
          <Text className='error-detail'>{report.errorMsg}</Text>
        )}
        {!isFailed && (
          <View className='progress-track'>
            <View className='progress-fill' style={{ width: `${percent}%` }} />
          </View>
        )}
        {!isFailed && (
          <Text className='progress-hint'>{WAITING_HINTS[this.state.hintIndex]}</Text>
        )}
        {isFailed && (
          <Button className='action-btn primary-btn' onClick={this.handleRetry.bind(this)}>
            重新上传
          </Button>
        )}
      </View>
    )
  }

  renderCompleted(report: Report) {
    const video = report.video!

    return (
      <View className='completed-wrap'>
        <View className='success-bar'>
          <View className='success-check-circle'>
            <View className='success-check' />
          </View>
          <Text className='success-text'>视频已生成，快来看看吧</Text>
        </View>
        <View className='video-container'>
          <Video
            src={video.url}
            className='video-player'
            controls
            showFullscreenBtn
            showPlayBtn
            autoplay={false}
            loop={false}
            muted={false}
            objectFit='contain'
            showProgress
          />
        </View>

        <View className='video-info'>
          <Text className='video-title'>{getTypeLabel(report.reportType)} 讲解视频</Text>
          <Text className='video-meta'>
            时长 {Math.ceil(video.durationSec)} 秒 · {new Date(video.createdAt).toLocaleDateString('zh-CN')}
          </Text>
        </View>

        <View className='action-row'>
          <Button
            className='action-btn primary-btn'
            onClick={this.handleShare.bind(this)}
            openType='share'
          >
            分享给家人
          </Button>
        </View>

        <View className='disclaimer'>
          <Text className='disclaimer-text'>
            本视频由 AI 生成，仅供健康知识参考，不作为医学诊断依据。如有疑问请咨询专业医生。
          </Text>
        </View>
      </View>
    )
  }

  render() {
    const { report, loading, error } = this.state

    if (loading) return this.renderLoading()
    if (error) return this.renderError()
    if (!report) return null

    return (
      <View className='page'>
        {report.status === 'COMPLETED'
          ? this.renderCompleted(report)
          : this.renderProcessing(report)}
      </View>
    )
  }
}

export default ResultPage
