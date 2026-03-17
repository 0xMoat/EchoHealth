export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type VideoLanguage = 'AUTO' | 'EN' | 'ZH'
export type InputType = 'IMAGE' | 'PDF'

export interface User {
  id: string
  email: string | null
  nickname: string | null
  avatarUrl: string | null
  isPro: boolean
  usedThisMonth: number
  proExpireAt: string | null
  usageResetAt: string | null
}

export interface Video {
  id: string
  reportId: string
  cosUrl: string
  duration: number
  createdAt: string
}

export interface Report {
  id: string
  userId: string
  type: string
  photoUrls: string[]
  status: ReportStatus
  language: VideoLanguage
  inputType: InputType
  source: string
  errorMsg: string | null
  video: Video | null
  createdAt: string
  updatedAt: string
}
