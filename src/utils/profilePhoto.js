const PROFILE_PHOTO_KEY_PREFIX = 'digiclinic_profile_photo_v1'

function normalizeIdentityValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
}

export function getProfilePhotoIdentity(user) {
  const candidate = user?.id ?? user?.user_id ?? user?.username ?? user?.email ?? 'default'
  const normalized = normalizeIdentityValue(candidate)
  return normalized || 'default'
}

export function getProfilePhotoStorageKey(user) {
  return `${PROFILE_PHOTO_KEY_PREFIX}:${getProfilePhotoIdentity(user)}`
}

export function getStoredProfilePhoto(user) {
  if (typeof localStorage === 'undefined') return null
  try {
    const key = getProfilePhotoStorageKey(user)
    const value = localStorage.getItem(key)
    return value || null
  } catch {
    return null
  }
}

export function setStoredProfilePhoto(user, dataUrl) {
  if (typeof localStorage === 'undefined') return
  const key = getProfilePhotoStorageKey(user)
  if (dataUrl) {
    localStorage.setItem(key, dataUrl)
  } else {
    localStorage.removeItem(key)
  }
}

export function withStoredProfilePhoto(user) {
  if (!user) return user
  const stored = getStoredProfilePhoto(user)
  if (!stored) return user
  return { ...user, avatar_url: user.avatar_url || stored }
}

