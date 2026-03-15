# Auto Report Type Detection — Design Spec

**Date:** 2026-03-12
**Status:** Approved

## Problem

The upload page forces users to manually select a report type from a picker (血常规, 尿常规, etc.). This is unnecessary friction: users shouldn't need to categorize their own medical reports, and the selection is unreliable (users pick wrong types). All reports can currently be processed as PHYSICAL_EXAM without loss of quality.

## Goal

1. Remove the manual report type picker from the upload page.
2. Consolidate photo guidance into one clear hints block.
3. Simplify the backend to always use `PHYSICAL_EXAM` as the report type.

## Design

### Frontend: Upload Page (`apps/miniprogram/src/pages/upload/index.tsx`)

**Remove:**
- `REPORT_TYPES` constant array
- `reportTypeIndex` and `reportType` fields from `State` interface and initial state
- `handleTypeChange` method
- `Picker` from the `@tarojs/components` import (becomes unused)
- The entire Picker `<View className='section'>` block (lines 180–193)
- `reportType` from `handleSubmit` POST body destructuring and request body
- `reportTypeIndex` from `render()` destructuring (line 152)

**Replace existing `tips-box`** (lines 195–200) with a single unified guidance card.
The existing "📋 拍摄提示" block is replaced entirely — do not keep it alongside the new card.

New card structure (uses existing `.tips-box` CSS class to stay consistent with project style):

```tsx
<View className='tips-box'>
  <Text className='tips-title'>📋 上传建议</Text>
  <Text className='tips-item'>• 封面页（含姓名、日期）</Text>
  <Text className='tips-item'>• 各检验项目页</Text>
  <Text className='tips-item'>• 报告结论页</Text>
  <Text className='tips-item'>• 确保文字清晰，光线充足，避免反光</Text>
  {photos.length === 1 && (
    <Text className='tips-warn'>⚠ 仅1张可能遗漏部分指标，建议上传完整报告所有页</Text>
  )}
</View>
```

**Remove dead CSS classes** from `index.css`: `.picker-value`, `.picker-text`, `.picker-arrow` (become unreferenced after picker block removal).

**New CSS class** added to `index.css`:
```css
.tips-warn {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  color: #ea580c; /* orange-600, consistent with warning tone */
}
```

### Backend: POST /reports (`apps/server/src/routes/reports.ts`)

**Changes:**
- Update route generic type: `Body: { userId: string; reportType?: string; photoUrls: string[] }`
- Remove `reportType` from `required` array in JSON schema
- Remove `reportType` from handler body destructure (`const { userId, photoUrls } = request.body`)
- Delete `typeMap` Record and the `type` variable derived from it
- Replace with: `const type: ReportType = 'PHYSICAL_EXAM'`
- Delete `VALID_REPORT_TYPES` Set (no longer needed)

**Backward compatibility:** Old clients that still send `reportType` are safely ignored.
The current schema does not set `additionalProperties: false`, so the extra field passes through without error.

### Tests to update

- `apps/server/src/__tests__/contract.test.ts`: update `POST /reports` payload to omit `reportType`, reflecting what new clients actually send. Response shape is unchanged (201 + `{ reportId, status }`), so the snapshot contract remains valid.
- No other test files require changes: existing tests that send `reportType` still pass since the field is now optional-and-ignored.

### No changes to:
- Worker pipeline
- LLM prompt
- Remotion video renderer
- Database schema

## Testing

| Case | Expected |
|------|----------|
| POST /reports without `reportType` | 201, `report.type === 'PHYSICAL_EXAM'` |
| POST /reports with old `reportType` value | 201, value ignored, `report.type === 'PHYSICAL_EXAM'` |
| Upload page with 1 photo | `.tips-warn` shown, submit not blocked |
| Upload page with 2+ photos | `.tips-warn` not rendered |
