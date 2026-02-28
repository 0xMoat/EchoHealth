import { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image, Button, Picker } from '@tarojs/components'
import './index.css'

const REPORT_TYPES = ['血常规', '尿常规', '肝功能', '肾功能', '血脂', '血糖', '心电图', '胸片/CT', '综合体检', '其他']

interface State {
  photos: string[]
  reportType: string
  reportTypeIndex: number
  submitting: boolean
}

class UploadPage extends Component<{}, State> {
  state: State = {
    photos: [],
    reportType: REPORT_TYPES[0],
    reportTypeIndex: 0,
    submitting: false,
  }

  async handlePickPhotos() {
    const { photos } = this.state
    if (photos.length >= 5) {
      Taro.showToast({ title: '最多上传5张', icon: 'none' })
      return
    }

    try {
      const res = await Taro.chooseImage({
        count: 5 - photos.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      this.setState({ photos: [...photos, ...res.tempFilePaths].slice(0, 5) })
    } catch (e) {
      // user cancelled
    }
  }

  handleRemovePhoto(index: number) {
    const { photos } = this.state
    this.setState({ photos: photos.filter((_, i) => i !== index) })
  }

  handleTypeChange(e: any) {
    const index = Number(e.detail.value)
    this.setState({ reportTypeIndex: index, reportType: REPORT_TYPES[index] })
  }

  async handleSubmit() {
    const { photos, reportType, submitting } = this.state
    if (submitting) return

    if (photos.length === 0) {
      Taro.showToast({ title: '请先上传报告照片', icon: 'none' })
      return
    }

    const userId = Taro.getStorageSync('userId')
    if (!userId) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setState({ submitting: true })

    try {
      // Upload each photo to get URLs
      const photoUrls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        Taro.showLoading({ title: `上传图片 ${i + 1}/${photos.length}` })
        const uploadRes = await Taro.uploadFile({
          url: `${process.env.API_BASE_URL}/upload/image`,
          filePath: photos[i],
          name: 'file',
          header: { 'x-user-id': userId },
        })
        Taro.hideLoading()
        const data = JSON.parse(uploadRes.data)
        if (data.url) {
          photoUrls.push(data.url)
        }
      }

      if (photoUrls.length === 0) {
        throw new Error('图片上传失败')
      }

      // Create report
      Taro.showLoading({ title: '提交中...' })
      const res = await Taro.request({
        url: `${process.env.API_BASE_URL}/reports`,
        method: 'POST',
        data: { userId, reportType, photoUrls },
        header: { 'Content-Type': 'application/json' },
      })
      Taro.hideLoading()

      if (res.statusCode === 201) {
        const reportId = res.data.reportId
        Taro.showToast({ title: '提交成功！', icon: 'success' })
        setTimeout(() => {
          Taro.redirectTo({ url: `/pages/result/index?reportId=${reportId}` })
        }, 1000)
      } else if (res.statusCode === 429) {
        Taro.showModal({
          title: '本月次数已用完',
          content: '免费版每月 3 次，升级 Pro 享 30 次/月',
          confirmText: '立即升级',
          cancelText: '下月再来',
          success: (modalRes) => {
            if (modalRes.confirm) {
              Taro.navigateTo({ url: '/pages/upgrade/index' })
            }
          },
        })
      } else {
        Taro.showToast({ title: res.data.error || '提交失败', icon: 'none' })
      }
    } catch (e: any) {
      Taro.hideLoading()
      Taro.showToast({ title: e.message || '网络错误', icon: 'none' })
    } finally {
      this.setState({ submitting: false })
    }
  }

  render() {
    const { photos, reportTypeIndex, submitting } = this.state

    return (
      <View className='page'>
        <View className='section'>
          <Text className='section-title'>报告照片</Text>
          <Text className='section-hint'>请拍摄清晰照片，最多5张</Text>
          <View className='photo-grid'>
            {photos.map((photo, index) => (
              <View key={index} className='photo-item'>
                <Image src={photo} className='photo-img' mode='aspectFill' />
                <View
                  className='photo-remove'
                  onClick={() => this.handleRemovePhoto(index)}
                >
                  <Text className='remove-icon'>×</Text>
                </View>
              </View>
            ))}
            {photos.length < 5 && (
              <View className='photo-add' onClick={this.handlePickPhotos.bind(this)}>
                <Text className='add-icon'>+</Text>
                <Text className='add-text'>添加照片</Text>
              </View>
            )}
          </View>
        </View>

        <View className='section'>
          <Text className='section-title'>报告类型</Text>
          <Picker
            mode='selector'
            range={REPORT_TYPES}
            value={reportTypeIndex}
            onChange={this.handleTypeChange.bind(this)}
          >
            <View className='picker-value'>
              <Text className='picker-text'>{REPORT_TYPES[reportTypeIndex]}</Text>
              <Text className='picker-arrow'>›</Text>
            </View>
          </Picker>
        </View>

        <View className='tips-box'>
          <Text className='tips-title'>📋 拍摄提示</Text>
          <Text className='tips-item'>• 确保报告文字清晰可见，避免模糊</Text>
          <Text className='tips-item'>• 光线充足，减少反光</Text>
          <Text className='tips-item'>• 完整拍摄每一页数据</Text>
        </View>

        <View className='submit-wrap'>
          <Button
            className={`submit-btn ${submitting ? 'submit-btn-disabled' : ''}`}
            onClick={this.handleSubmit.bind(this)}
            disabled={submitting}
          >
            {submitting ? '生成中...' : '🎬 生成讲解视频'}
          </Button>
        </View>
      </View>
    )
  }
}

export default UploadPage
