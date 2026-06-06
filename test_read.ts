import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'

const IWAS_WALL_OBJECT_ID = '0x906c822b841111825fa5d829be1df9d0d7a9eb9d8b149047cf89be5df5fc40f4'

async function main() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') })
  const res = await client.getObject({
    id: IWAS_WALL_OBJECT_ID,
    options: { showContent: true }
  })
  console.log(JSON.stringify(res.data?.content, null, 2))
}

main().catch(console.error)
