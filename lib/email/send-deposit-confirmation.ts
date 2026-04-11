import "server-only"

type SendDepositConfirmationEmailInput = {
  to: string
  fullName?: string | null
  amountUsdt: number
  txHash: string
  network: "trc20" | "bep20"
  confirmedAt: string
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

function buildDepositConfirmationHtml(input: SendDepositConfirmationEmailInput): string {
  const userName = input.fullName?.trim() || "عميل Adstar"
  const safeName = escapeHtml(userName)
  const safeTxHash = escapeHtml(input.txHash)
  const safeConfirmedAt = escapeHtml(new Date(input.confirmedAt).toLocaleString("ar-EG"))

  return `
  <div dir="rtl" lang="ar" style="margin:0;padding:24px;background:#0A0A0F;font-family:Inter,Segoe UI,Tahoma,sans-serif;color:#EDEDED;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#13131A;border:1px solid #242432;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:28px 24px 10px 24px;text-align:right;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#9BA0B3;">Adstar</p>
          <h1 style="margin:0;font-size:24px;line-height:1.4;color:#F5C518;">تم تأكيد الإيداع بنجاح</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 24px 0 24px;text-align:right;">
          <p style="margin:0;font-size:15px;line-height:1.9;color:#EDEDED;">مرحبًا ${safeName}،</p>
          <p style="margin:10px 0 0 0;font-size:15px;line-height:1.9;color:#C9CCDA;">
            تم استلام إيداعك وإضافته إلى رصيد حسابك في Adstar.
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
              <td style="padding:14px 16px;border-bottom:1px solid #242432;font-size:14px;color:#9BA0B3;text-align:right;">رقم العملية</td>
              <td style="padding:14px 16px;border-bottom:1px solid #242432;font-size:13px;color:#C9CCDA;text-align:left;word-break:break-all;">${safeTxHash}</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;font-size:14px;color:#9BA0B3;text-align:right;">وقت التأكيد</td>
              <td style="padding:14px 16px;font-size:14px;color:#EDEDED;text-align:left;">${safeConfirmedAt}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px 24px;text-align:right;">
          <p style="margin:0;font-size:13px;line-height:1.8;color:#9BA0B3;">
            إذا لم تقم بهذه العملية، تواصل مع فريق الدعم فورًا.
          </p>
        </td>
      </tr>
    </table>
  </div>`
}

export async function sendDepositConfirmationEmail(input: SendDepositConfirmationEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("RESEND_API_KEY is missing")
    return
  }

  const from = process.env.RESEND_FROM_EMAIL || "Adstar <no-reply@adstar-vi.com>"
  const subject = "تم تأكيد إيداعك في Adstar"

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
      html: buildDepositConfirmationHtml(input),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend send failed (${response.status}): ${errorText}`)
  }
}
