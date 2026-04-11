import "server-only"

type SendWithdrawalRejectedEmailInput = {
  to: string
  fullName?: string | null
  amountUsdt: number
  network: "trc20" | "bep20"
  walletAddress: string
  processedAt: string
  rejectionReason?: string | null
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

function networkLabel(network: "trc20" | "bep20"): string {
  return network === "trc20" ? "TRC20" : "BEP20"
}

function buildWithdrawalRejectedHtml(input: SendWithdrawalRejectedEmailInput): string {
  const userName = input.fullName?.trim() || "عميل Adstar"
  const safeName = escapeHtml(userName)
  const safeWalletAddress = escapeHtml(input.walletAddress)
  const safeProcessedAt = escapeHtml(new Date(input.processedAt).toLocaleString("ar-EG"))
  const safeReason = input.rejectionReason?.trim() ? escapeHtml(input.rejectionReason.trim()) : null

  return `
  <div dir="rtl" lang="ar" style="margin:0;padding:24px;background:#0A0A0F;font-family:Inter,Segoe UI,Tahoma,sans-serif;color:#EDEDED;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#13131A;border:1px solid #242432;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:28px 24px 10px 24px;text-align:right;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#9BA0B3;">Adstar</p>
          <h1 style="margin:0;font-size:24px;line-height:1.4;color:#F5C518;">تم رفض طلب السحب</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 24px 0 24px;text-align:right;">
          <p style="margin:0;font-size:15px;line-height:1.9;color:#EDEDED;">مرحبًا ${safeName}،</p>
          <p style="margin:10px 0 0 0;font-size:15px;line-height:1.9;color:#C9CCDA;">
            نعتذر، تم رفض طلب السحب الخاص بك. يمكنك مراجعة بيانات الطلب أو التواصل مع الدعم للمساعدة.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0F1017;border:1px solid #242432;border-radius:12px;">
            <tr>
              <td style="padding:14px 16px;border-bottom:1px solid #242432;font-size:14px;color:#9BA0B3;text-align:right;">المبلغ</td>
              <td style="padding:14px 16px;border-bottom:1px solid #242432;font-size:14px;color:#F5C518;font-weight:700;text-align:left;">${formatAmount(input.amountUsdt)} USDT</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;border-bottom:1px solid #242432;font-size:14px;color:#9BA0B3;text-align:right;">الشبكة</td>
              <td style="padding:14px 16px;border-bottom:1px solid #242432;font-size:14px;color:#EDEDED;font-weight:600;text-align:left;">${networkLabel(input.network)}</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;border-bottom:1px solid #242432;font-size:14px;color:#9BA0B3;text-align:right;">المحفظة</td>
              <td style="padding:14px 16px;border-bottom:1px solid #242432;font-size:13px;color:#C9CCDA;text-align:left;word-break:break-all;">${safeWalletAddress}</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;font-size:14px;color:#9BA0B3;text-align:right;">وقت المعالجة</td>
              <td style="padding:14px 16px;font-size:14px;color:#EDEDED;text-align:left;">${safeProcessedAt}</td>
            </tr>
            ${
              safeReason
                ? `<tr>
              <td style="padding:14px 16px;border-top:1px solid #242432;font-size:14px;color:#9BA0B3;text-align:right;">سبب الرفض</td>
              <td style="padding:14px 16px;border-top:1px solid #242432;font-size:14px;color:#EDEDED;text-align:left;">${safeReason}</td>
            </tr>`
                : ""
            }
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px 24px;text-align:right;">
          <p style="margin:0;font-size:13px;line-height:1.8;color:#9BA0B3;">
            يمكنك تقديم طلب جديد بعد التأكد من صحة معلومات المحفظة والمبلغ.
          </p>
        </td>
      </tr>
    </table>
  </div>`
}

export async function sendWithdrawalRejectedEmail(input: SendWithdrawalRejectedEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY is missing")
    return
  }

  const from = process.env.RESEND_FROM_EMAIL || "Adstar <no-reply@adstar-vi.com>"
  const subject = "تم رفض طلب السحب في Adstar"

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject,
      html: buildWithdrawalRejectedHtml(input),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend send failed (${response.status}): ${errorText}`)
  }
}
