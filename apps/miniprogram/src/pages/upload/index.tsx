import { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image, Button } from '@tarojs/components'
import './index.css'

interface State {
  photos: string[]
  submitting: boolean
}

class UploadPage extends Component<{}, State> {
  state: State = {
    photos: [],
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

  async handleSubmit() {
    const { photos, submitting } = this.state
    if (submitting) return

    if (photos.length === 0) {
      Taro.showToast({ title: '请先上传报告照片', icon: 'none' })
      return
    }

    let userId = Taro.getStorageSync('userId')
    if (!userId) {
      try {
        Taro.showLoading({ title: '登录中...' })
        const loginRes = await Taro.login()
        const authRes = await Taro.request({
          url: `${process.env.API_BASE_URL}/auth/login`,
          method: 'POST',
          data: { code: loginRes.code },
        })
        Taro.hideLoading()
        if (authRes.statusCode === 200 && authRes.data.userId) {
          Taro.setStorageSync('userId', authRes.data.userId)
          Taro.setStorageSync('isPro', authRes.data.isPro)
          userId = authRes.data.userId
        } else {
          Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
          return
        }
      } catch (e) {
        Taro.hideLoading()
        Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
        return
      }
    }

    this.setState({ submitting: true })

    try {
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

      Taro.showLoading({ title: '提交中...' })
      const res = await Taro.request({
        url: `${process.env.API_BASE_URL}/reports`,
        method: 'POST',
        data: { userId, photoUrls },
        header: { 'Content-Type': 'application/json' },
      })
      Taro.hideLoading()

      if (res.statusCode === 201) {
        const reportId = res.data.reportId
        Taro.showToast({ title: '提交成功', icon: 'success' })
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
    const { photos, submitting } = this.state

    return (
      <View className='page'>
        <View className='section'>
          <Text className='section-title'>报告照片</Text>
          <Text className='section-hint'>请拍摄清晰的体检报告，最多 5 张</Text>
          {photos.length === 0 ? (
            <View className='photo-empty' onClick={this.handlePickPhotos.bind(this)}>
              <View className='empty-camera'>
                <View className='camera-body'>
                  <View className='camera-lens' />
                </View>
              </View>
              <Text className='empty-action'>点击拍照或从相册选择</Text>
              <Text className='empty-limit'>最多 5 张，建议上传完整报告</Text>
            </View>
          ) : (
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
                  <Text className='add-text'>添加</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View className='tips-section'>
          <Text className='tips-title'>上传建议</Text>
          <Text className='tips-item'>· 报告封面页（含姓名、日期）</Text>
          <Text className='tips-item'>· 各检验项目页（血常规、生化等）</Text>
          <Text className='tips-item'>· 报告结论 / 诊断页</Text>
          <Text className='tips-item'>· 确保文字清晰，光线充足</Text>
          {photos.length === 1 && (
            <Text className='tips-warn'>仅 1 张可能遗漏指标，建议上传完整报告</Text>
          )}
        </View>

        <View className='submit-wrap'>
          <Button
            className={`submit-btn ${submitting ? 'submit-btn-disabled' : ''}`}
            onClick={this.handleSubmit.bind(this)}
            disabled={submitting}
          >
            {submitting ? '生成中...' : '生成讲解视频'}
          </Button>
        </View>
      </View>
    )
  }
}

export default UploadPage
