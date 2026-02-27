import COS from 'cos-nodejs-sdk-v5'
import { createReadStream, statSync } from 'fs'

function createCOSClient(): COS {
  const secretId = process.env.COS_SECRET_ID
  const secretKey = process.env.COS_SECRET_KEY
  if (!secretId || !secretKey) {
    throw new Error('Missing COS_SECRET_ID or COS_SECRET_KEY environment variables')
  }
  return new COS({ SecretId: secretId, SecretKey: secretKey })
}

function getCOSConfig(): { bucket: string; region: string } {
  const bucket = process.env.COS_BUCKET
  const region = process.env.COS_REGION
  if (!bucket || !region) {
    throw new Error('Missing COS_BUCKET or COS_REGION environment variables')
  }
  return { bucket, region }
}

async function putFile(localPath: string, key: string): Promise<string> {
  const cos = createCOSClient()
  const { bucket, region } = getCOSConfig()

  await new Promise<void>((resolve, reject) => {
    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: createReadStream(localPath),
        ContentLength: statSync(localPath).size,
      },
      (err) => {
        if (err) {
          reject(new Error(`COS upload failed: ${JSON.stringify(err)}`))
        } else {
          resolve()
        }
      },
    )
  })

  return `https://${bucket}.cos.${region}.myqcloud.com/${key}`
}

/** Upload a rendered MP4 video and return its public HTTPS URL. */
export async function uploadVideo(localPath: string, reportId: string): Promise<string> {
  return putFile(localPath, `videos/${reportId}/${Date.now()}.mp4`)
}

/** Upload a TTS audio file and return its public HTTPS URL. */
export async function uploadAudio(localPath: string, reportId: string): Promise<string> {
  return putFile(localPath, `audio/${reportId}/narration.mp3`)
}

/** Upload a raw image buffer and return its public HTTPS URL. */
export async function uploadImageBuffer(
  buf: Buffer,
  userId: string,
  ext: string,
): Promise<string> {
  const cos = createCOSClient()
  const { bucket, region } = getCOSConfig()
  const key = `images/${userId}/${Date.now()}.${ext}`

  await new Promise<void>((resolve, reject) => {
    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: buf,
        ContentLength: buf.length,
      },
      (err) => {
        if (err) reject(new Error(`COS upload failed: ${JSON.stringify(err)}`))
        else resolve()
      },
    )
  })

  return `https://${bucket}.cos.${region}.myqcloud.com/${key}`
}
