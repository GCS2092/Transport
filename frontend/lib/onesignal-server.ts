type OneSignalResponse = {
  id?: string
  errors?: unknown
  [key: string]: unknown
}

export async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
): Promise<OneSignalResponse> {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY

  if (!appId) throw new Error('NEXT_PUBLIC_ONESIGNAL_APP_ID is missing')
  if (!restApiKey) throw new Error('ONESIGNAL_REST_API_KEY is missing')
  if (!userId) throw new Error('userId is required')

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${restApiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_external_user_ids: [userId],
      channel_for_external_user_ids: 'push',
      headings: { fr: title, en: title },
      contents: { fr: message, en: message },
    }),
  })

  const data = (await res.json()) as OneSignalResponse
  if (!res.ok) {
    throw new Error(
      `OneSignal error (${res.status}): ${JSON.stringify(data?.errors ?? data)}`,
    )
  }
  return data
}

