import type { SuiJsonRpcClient as SuiClient } from '@mysten/sui/jsonRpc'
import { Transaction } from '@mysten/sui/transactions'
import { IWAS_PACKAGE_ID, IWAS_WALL_OBJECT_ID } from './contract'

export type MarkType = 'voice' | 'image' | 'text' | 'drawing'
export type EmotionCategory =
  | 'loneliness'
  | 'joy'
  | 'wonder'
  | 'loss'
  | 'rebellion'
  | 'hope'
  | 'love'

export interface Mark {
  blobId: string
  type: MarkType
  category: EmotionCategory
  timestamp: number
  walletAddress: string
  mimeType: string
  context?: string
  narrative?: string
  threadBlobId?: string
}

// Map the on-chain data back to the Mark interface.
// Since our simple contract doesn't store type/mimeType/context/narrative on-chain,
// we will provide defaults or infer them where possible.
function mapOnChainMark(data: any): Mark {
  return {
    blobId: data.blob_id,
    type: 'drawing', // Default fallback, or infer from blobId if needed
    category: data.emotion as EmotionCategory,
    timestamp: parseInt(data.timestamp, 10),
    walletAddress: data.wallet_address,
    mimeType: 'image/png', // Default
    narrative: 'A mark left in the permanence of now.',
  }
}

export async function getAllMarks(suiClient: SuiClient): Promise<Mark[]> {
  try {
    const res = await suiClient.getObject({
      id: IWAS_WALL_OBJECT_ID,
      options: { showContent: true }
    })
    
    const content = res.data?.content as any
    if (content && content.fields && content.fields.marks) {
      // The on-chain vector is an array of objects
      const rawMarks = content.fields.marks as any[]
      // Reverse to show newest first
      return rawMarks.map(m => mapOnChainMark(m.fields || m)).reverse()
    }
    return []
  } catch (err) {
    console.error("Failed to fetch marks from Sui:", err)
    return []
  }
}

export async function getMarksByWallet(suiClient: SuiClient, address: string): Promise<Mark[]> {
  const all = await getAllMarks(suiClient)
  return all.filter((m) => m.walletAddress === address)
}

export async function getMarkById(suiClient: SuiClient, blobId: string): Promise<Mark | undefined> {
  const all = await getAllMarks(suiClient)
  return all.find((m) => m.blobId === blobId)
}

// Builds the transaction block for adding a mark
export function buildAddMarkTx(
  blobId: string,
  emotion: string,
  timestamp: number
): Transaction {
  const tx = new Transaction()
  
  tx.moveCall({
    target: `${IWAS_PACKAGE_ID}::iwas::add_mark`,
    arguments: [
      tx.object(IWAS_WALL_OBJECT_ID),
      tx.pure.string(blobId),
      tx.pure.string(emotion),
      tx.pure.u64(timestamp)
    ]
  })
  
  return tx
}
