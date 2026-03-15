/**
 * EchoHealth 小程序集成测试
 * 所有页面测试合并在一个文件中，复用单个 WebSocket 连接
 */
import automator from 'miniprogram-automator'
import fs from 'fs'
import path from 'path'

const WS_ENDPOINT = 'ws://localhost:9420'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let mini: any

beforeAll(async () => {
  mini = await automator.connect({ wsEndpoint: WS_ENDPOINT })
}, 30_000)

afterAll(async () => {
  if (mini) await mini.disconnect()
}, 10_000)

// ─── 构建产物检查 ───
describe('构建产物', () => {
  it('app.json 导航栏标题为"爸妈看懂"', () => {
    const appJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'app.json'), 'utf-8')
    )
    expect(appJson.window.navigationBarTitleText).toBe('爸妈看懂')
  })

  it('app.json 包含 4 个页面', () => {
    const appJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'app.json'), 'utf-8')
    )
    expect(appJson.pages).toHaveLength(4)
    expect(appJson.pages).toContain('pages/index/index')
    expect(appJson.pages).toContain('pages/upload/index')
    expect(appJson.pages).toContain('pages/result/index')
    expect(appJson.pages).toContain('pages/upgrade/index')
  })
})

// ─── 首页 ───
describe('首页', () => {
  beforeAll(async () => {
    await mini.reLaunch('/pages/index/index')
    await sleep(1500)
  })

  it('显示 CTA 卡片', async () => {
    const page = await mini.currentPage()
    const card = await page.$('.cta-card')
    expect(card).toBeTruthy()
  })

  it('显示三步流程', async () => {
    const page = await mini.currentPage()
    const steps = await page.$$('.step')
    expect(steps.length).toBe(3)
  })

  it('CTA 按钮可点击跳转到上传页', async () => {
    const page = await mini.currentPage()
    const btn = await page.$('.cta-btn')
    expect(btn).toBeTruthy()
    await btn.tap()
    await sleep(1500)

    const cur = await mini.currentPage()
    expect(cur.path).toBe('pages/upload/index')

    await mini.navigateBack()
    await sleep(1500)
  })

  it('有报告列表、空状态或加载态', async () => {
    const page = await mini.currentPage()
    const emptyState = await page.$('.empty-state')
    const reportList = await page.$('.report-list')
    const placeholder = await page.$('.placeholder')
    expect(emptyState || reportList || placeholder).toBeTruthy()
  })
})

// ─── 上传页 ───
describe('上传页', () => {
  beforeAll(async () => {
    await mini.reLaunch('/pages/upload/index')
    await sleep(1500)
  })

  it('显示照片上传区域', async () => {
    const page = await mini.currentPage()
    const section = await page.$('.section')
    expect(section).toBeTruthy()
  })

  it('初始为空状态', async () => {
    const page = await mini.currentPage()
    const emptyArea = await page.$('.photo-empty')
    expect(emptyArea).toBeTruthy()
  })

  it('显示上传建议（至少 3 条）', async () => {
    const page = await mini.currentPage()
    const items = await page.$$('.tips-item')
    expect(items.length).toBeGreaterThanOrEqual(3)
  })

  it('提交按钮存在', async () => {
    const page = await mini.currentPage()
    const btn = await page.$('.submit-btn')
    expect(btn).toBeTruthy()
  })

  it('标题为"报告照片"', async () => {
    const page = await mini.currentPage()
    const title = await page.$('.section-title')
    const text = await title.text()
    expect(text).toBe('报告照片')
  })
})

// ─── 结果页 ───
describe('结果页', () => {
  it('缺少 reportId 时显示错误', async () => {
    await mini.reLaunch('/pages/result/index')
    await sleep(1500)
    const page = await mini.currentPage()
    const errorCircle = await page.$('.error-circle')
    expect(errorCircle).toBeTruthy()
  })

  it('带 reportId 时显示中心状态区', async () => {
    await mini.reLaunch('/pages/result/index?reportId=test-e2e')
    await sleep(2000)
    const page = await mini.currentPage()
    const centerWrap = await page.$('.center-wrap')
    expect(centerWrap).toBeTruthy()
  })
})

// ─── 升级页 ───
describe('升级页', () => {
  beforeAll(async () => {
    await mini.reLaunch('/pages/upgrade/index')
    await sleep(1500)
  })

  it('显示定价卡片', async () => {
    const page = await mini.currentPage()
    const card = await page.$('.pricing-card')
    expect(card).toBeTruthy()
  })

  it('价格为 ¥18', async () => {
    const page = await mini.currentPage()
    const amount = await page.$('.price-amount')
    const text = await amount.text()
    expect(text).toBe('18')
  })

  it('功能对比表至少 3 行', async () => {
    const page = await mini.currentPage()
    const rows = await page.$$('.table-row')
    expect(rows.length).toBeGreaterThanOrEqual(3)
  })

  it('订阅按钮存在', async () => {
    const page = await mini.currentPage()
    const btn = await page.$('.subscribe-btn')
    expect(btn).toBeTruthy()
  })
})
