import type { DepositVerificationResult } from "./types"
import BigNumber from 'bignumber.js'




/** USDT contract on TRON mainnet */
const TRC20_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

/** Binance-Peg USDT contract on BSC mainnet */
const BEP20_USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955'

/** ERC-20 / BEP-20 Transfer(address,address,uint256) event topic */
const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

const MIN_DEPOSIT_USDT = 1

function parseDecimalAmount(rawValue: string, decimals: number): number | null {
  if (!/^\d+$/.test(rawValue)) return null
  try {
    const amount = new BigNumber(rawValue).div(new BigNumber(10).pow(decimals))
    return amount.isFinite() ? amount.toNumber() : null
  } catch {
    return null
  }
}

function parseHexAmount(rawHex: string, decimals: number): number | null {
  if (!/^0x[0-9a-fA-F]+$/.test(rawHex)) return null
  try {
    const amount = new BigNumber(rawHex.replace(/^0x/, ''), 16).div(
      new BigNumber(10).pow(decimals)
    )
    return amount.isFinite() ? amount.toNumber() : null
  } catch {
    return null
  }
}

// ─── TRC20 via TronGrid ───────────────────────────────────────────────────────

/**
 * Verifies a TRC20 USDT transfer to the admin wallet via TronGrid events API.
 *
 * TronGrid endpoint:
 *   GET https://api.trongrid.io/v1/transactions/{txHash}/events
 *
 * USDT on TRON uses 6 decimal places (sun = 1e6).
 */
export async function verifyTRC20Transaction(
  txHash: string,
  adminWallet: string
): Promise<DepositVerificationResult> {
  try {
    const normalizedAdminWallet = adminWallet.trim()

    const headers: Record<string, string> = { Accept: 'application/json' }
    const apiKey = process.env.TRONGRID_API_KEY
    if (apiKey) headers['TRON-PRO-API-KEY'] = apiKey

    const res = await fetch(
      `https://api.trongrid.io/v1/transactions/${encodeURIComponent(txHash)}/events`,
      { headers, cache: 'no-store' }
    )

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[TRC20] TronGrid HTTP error', res.status, text)
      return { success: false, error: 'فشل الاتصال بشبكة ترون. يرجى المحاولة لاحقاً' }
    }

    const json = await res.json()

    type TronEvent = {
      event_name: string
      contract_address: string
      result: { _from?: string; _to?: string; _value?: string }
    }

    const events: TronEvent[] = Array.isArray(json.data) ? json.data : []

    if (events.length === 0) {
      return {
        success: false,
        error: 'المعاملة لم تتم تأكيدها بعد على شبكة TRON. انتظر قليلاً وأعد المحاولة',
      }
    }

    // Find a Transfer event from the USDT contract directed to our admin wallet
    const transfer = events.find(
      (e) =>
        e.event_name === 'Transfer' &&
        e.contract_address === TRC20_USDT_CONTRACT &&
        e.result._to?.trim() === normalizedAdminWallet
    )

    if (!transfer) {
      return {
        success: false,
        error:
          'لم يتم العثور على تحويل USDT-TRC20 إلى عنوان المحفظة الصحيح في هذه المعاملة',
      }
    }

    // USDT on TRON: 6 decimals
    const rawValue = transfer.result._value ?? '0'
    const amount = parseDecimalAmount(rawValue, 6)

    if (amount === null || isNaN(amount) || amount < MIN_DEPOSIT_USDT) {
      return {
        success: false,
        error: `الحد الأدنى للإيداع هو ${MIN_DEPOSIT_USDT} USDT`,
      }
    }

    return { success: true, amount }
  } catch (err) {
    console.error('[TRC20] Verification error:', err)
    return { success: false, error: 'حدث خطأ أثناء التحقق من المعاملة. يرجى المحاولة مرة أخرى' }
  }
}

// ─── BEP20 via BSCScan ────────────────────────────────────────────────────────

/**
 * Verifies a BEP20 USDT transfer to the admin wallet via BSCScan proxy API.
 *
 * BSCScan endpoint (JSON-RPC proxy):
 *   GET https://api.bscscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=...
 *
 * Binance-Peg USDT on BSC uses 18 decimal places.
 *
 * We decode the ERC-20 Transfer log manually:
 *   topics[0] = Transfer event signature
 *   topics[2] = recipient address (zero-padded to 32 bytes)
 *   data      = uint256 amount (big-endian hex)
 */
export async function verifyBEP20Transaction(
  txHash: string,
  adminWallet: string
): Promise<DepositVerificationResult> {
  try {
    const apiKey = process.env.BSCSCAN_API_KEY ?? ''

    const url = new URL('https://api.bscscan.com/api')
    url.searchParams.set('module', 'proxy')
    url.searchParams.set('action', 'eth_getTransactionReceipt')
    url.searchParams.set('txhash', txHash)
    url.searchParams.set('apikey', apiKey)

    const res = await fetch(url.toString(), { cache: 'no-store' })

    if (!res.ok) {
      console.error('[BEP20] BSCScan HTTP error', res.status)
      return { success: false, error: 'فشل الاتصال بشبكة BSC. يرجى المحاولة لاحقاً' }
    }

    const json = await res.json()
    const receipt = json.result

    if (!receipt) {
      return {
        success: false,
        error: 'المعاملة لم تتم تأكيدها بعد على شبكة BSC. انتظر قليلاً وأعد المحاولة',
      }
    }

    if (receipt.status !== '0x1') {
      return { success: false, error: 'المعاملة فشلت على شبكة BSC' }
    }

    type EvmLog = {
      address: string
      topics: string[]
      data: string
    }

    const logs: EvmLog[] = Array.isArray(receipt.logs) ? receipt.logs : []

    // Pad admin wallet to 32-byte topic format
    const adminPadded =
      '0x000000000000000000000000' +
      adminWallet.toLowerCase().replace(/^0x/, '')

    const transferLog = logs.find(
      (log) =>
        log.address.toLowerCase() === BEP20_USDT_CONTRACT.toLowerCase() &&
        log.topics[0]?.toLowerCase() === ERC20_TRANSFER_TOPIC &&
        log.topics[2]?.toLowerCase() === adminPadded.toLowerCase()
    )

    if (!transferLog) {
      return {
        success: false,
        error:
          'لم يتم العثور على تحويل USDT-BEP20 إلى عنوان المحفظة الصحيح في هذه المعاملة',
      }
    }

    // Binance-Peg USDT on BSC: 18 decimals
    const amount = parseHexAmount(transferLog.data, 18)

    if (amount === null || isNaN(amount) || amount < MIN_DEPOSIT_USDT) {
      return {
        success: false,
        error: `الحد الأدنى للإيداع هو ${MIN_DEPOSIT_USDT} USDT`,
      }
    }

    return { success: true, amount }
  } catch (err) {
    console.error('[BEP20] Verification error:', err)
    return { success: false, error: 'حدث خطأ أثناء التحقق من المعاملة. يرجى المحاولة مرة أخرى' }
  }
}