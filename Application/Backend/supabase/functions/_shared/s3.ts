import { S3Client, PutObjectCommand, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.433.0"
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.433.0"

//the photo bucket is private, every read and write goes through a short-lived presigned URL 
//minted by one of the edge functions, after they've checked the caller is allowed to touch that chore's photos

const bucket = () => Deno.env.get('MY_AWS_S3_BUCKET_NAME')

const client = () => new S3Client({
  region: Deno.env.get('MY_AWS_REGION'),
  credentials: {
    accessKeyId: Deno.env.get('MY_AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('MY_AWS_SECRET_ACCESS_KEY')!,
  },
})

//photo types the app may upload, and the file extension each one is stored under
export const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png' } as const
export type PhotoType = keyof typeof PHOTO_TYPES

//5 MB - also Claude's per-image limit, so anything bigger couldn't be verified anyway
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

//content-type and content-length are part of the signature, so S3 rejects an
//upload whose type or exact size differs from what the server approved
export function signUpload(key: string, contentType: PhotoType, size: number, expiresIn = 300) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn, signableHeaders: new Set(['content-type', 'content-length']) },
  )
}

export function signDownload(key: string, expiresIn = 3600) {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn })
}

//random, server-chosen key
export function newPhotoKey(choreId: string | number, kind: 'before' | 'after', contentType: PhotoType) {
  return `chores/${choreId}/${kind}_${crypto.randomUUID()}.${PHOTO_TYPES[contentType]}`
}

//makes sure the key is in the right format for this chore
export function isKeyForChore(key: unknown, choreId: string | number): key is string {
  if (typeof key !== 'string') return false
  const id = String(choreId)
  if (key.startsWith(`chores/${id}/`) && !key.includes('..')) return true
  return new RegExp(`^(before|after)_${id.replace(/[^\w-]/g, '')}_\\d+\\.jpg$`).test(key)
}