// lib/otp.ts
// Generates booking OTP and sends via MSG91

// ─── Generate OTP ────────────────────────────────────────────────────────────

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ─── Format Phone for MSG91 ───────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '')
  if (cleaned.startsWith('+')) return cleaned.slice(1)
  if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned
  return `91${cleaned}`
}

// ─── Send OTP SMS ─────────────────────────────────────────────────────────────

export async function sendOtpSms(
  phone: string,
  otp: string,
  customerName: string
): Promise<boolean> {
  const authKey    = process.env.MSG91_AUTH_KEY
  const templateId = process.env.MSG91_TEMPLATE_ID

  // ── DEBUG ──
  console.log('=== MSG91 DEBUG ===')
  console.log('AUTH KEY:', authKey)
  console.log('TEMPLATE ID:', templateId)
  console.log('RAW PHONE:', phone)
  console.log('FORMATTED PHONE:', formatPhone(phone))
  console.log('OTP:', otp)
  console.log('===================')
  // ───────────

  if (!authKey || !templateId) {
    console.warn('MSG91 not configured — OTP not sent. OTP for dev:', otp)
    return false
  }

  const formatted = formatPhone(phone)

  try {
    const res = await fetch('https://api.msg91.com/api/v5/otp', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authkey':      authKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        mobile:      formatted,
        otp:         otp,
      }),
    })

    const data = await res.json()
    console.log('MSG91 RESPONSE:', JSON.stringify(data))

    if (data.type !== 'success') {
      console.error('MSG91 OTP error:', data)
      return false
    }

    return true
  } catch (err) {
    console.error('MSG91 OTP send failed:', err)
    return false
  }
}

// ─── Verify OTP via MSG91 ─────────────────────────────────────────────────────

export async function verifyOtpSms(
  phone: string,
  otp: string
): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY

  if (!authKey) {
    console.warn('MSG91 not configured — cannot verify OTP')
    return false
  }

  const formatted = formatPhone(phone)
  console.log('=== MSG91 VERIFY DEBUG ===')
  console.log('PHONE:', formatted)
  console.log('OTP:', otp)

  try {
    const res = await fetch(
      `https://api.msg91.com/api/v5/otp/verify?mobile=${formatted}&otp=${otp}`,
      {
        method:  'GET',
        headers: { 'Authkey': authKey },
      }
    )

    const data = await res.json()
    console.log('MSG91 VERIFY RESPONSE:', JSON.stringify(data))
    return data.type === 'success'
  } catch (err) {
    console.error('MSG91 OTP verify failed:', err)
    return false
  }
}

// ─── Resend OTP via MSG91 ─────────────────────────────────────────────────────

export async function resendOtpSms(
  phone: string,
  retryType: 'text' | 'voice' = 'text'
): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY
  if (!authKey) return false

  const formatted = formatPhone(phone)

  try {
    const res = await fetch(
      `https://api.msg91.com/api/v5/otp/retry?mobile=${formatted}&retrytype=${retryType}`,
      {
        method:  'GET',
        headers: { 'Authkey': authKey },
      }
    )

    const data = await res.json()
    return data.type === 'success'
  } catch (err) {
    console.error('MSG91 OTP resend failed:', err)
    return false
  }
}

// ─── Send Booking Confirmation SMS ────────────────────────────────────────────

export async function sendBookingConfirmationSms(
  phone: string,
  serviceName: string,
  scheduledAt: string,
  otp: string
): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY

  if (!authKey) {
    console.warn('MSG91 not configured — booking SMS not sent')
    return false
  }

  const formatted = formatPhone(phone)
  const date = new Date(scheduledAt).toLocaleDateString('en-IN', {
    day:    'numeric',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  })

  const message = `Cleenzo: Your ${serviceName} is booked for ${date}. Share OTP ${otp} with the cleaner on arrival. Help: wa.me/919999999999`

  try {
    const res = await fetch(
      `https://api.msg91.com/api/sendhttp.php?authkey=${authKey}&mobiles=${formatted}&message=${encodeURIComponent(message)}&route=4&country=91`,
      { method: 'GET' }
    )

    const text = await res.text()
    if (isNaN(Number(text))) {
      console.error('Booking SMS failed:', text)
      return false
    }

    return true
  } catch (err) {
    console.error('Booking SMS failed:', err)
    return false
  }
}