import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Send push notification via Firebase FCM
async function sendFcmNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? '{}')
  if (!serviceAccount.project_id) {
    console.warn('Firebase not configured — skipping push notification')
    return false
  }

  try {
    // Get FCM access token
    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion:  createJwt(serviceAccount),
        }),
      }
    )
    const { access_token } = await tokenRes.json()

    // Send notification
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title, body },
            data: data ?? {},
            android: { priority: 'high' },
            apns: {
              payload: { aps: { sound: 'default', badge: 1 } },
            },
          },
        }),
      }
    )
    return res.ok
  } catch (err) {
    console.error('FCM error:', err)
    return false
  }
}

function createJwt(serviceAccount: any): string {
  // Simple JWT for Google OAuth — in production use google-auth-library
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const now     = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    iss:   serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  })).toString('base64url')
  return `${header}.${payload}.signature` // simplified — use proper signing in production
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { user_id, title, body, data } = await req.json()

    // get user FCM token
    const { data: userData } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('id', user_id)
      .single()

    if (!userData?.fcm_token) {
      return NextResponse.json({ success: false, reason: 'No FCM token' })
    }

    const sent = await sendFcmNotification(userData.fcm_token, title, body, data)
    return NextResponse.json({ success: sent })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}