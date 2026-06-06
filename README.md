# iwas

A wall where people leave marks. You write a text or draw a picture, and it gets stored permanently on the Walrus network.

### links

- [Demo video](#)
- [Live site (iwas.app)](https://iwas.app)
- [Hackathon submission](#)

### how it works

Walrus stores the marks as permanent data blobs. Every time a mark is left, IWAS AI reads it to understand the emotion behind it. MemWal remembers these emotions across sessions. The Wall pulls everything together into a collective canvas. A Sui smart contract indexes every mark globally so strangers can see each other's marks.

### stack

React / TypeScript / Sui / Walrus / MemWal / Claude API

### setup

```env
VITE_CLAUDE_API_KEY=
VITE_MEMWAL_PRIVATE_KEY=
VITE_MEMWAL_ACCOUNT_ID=
```

get your MemWal credentials at app.memwal.com and your Claude API key at console.anthropic.com

### smart contract

Package ID: `0x8b57253b50238fb0be14172a2f5ffefaab22f43518b70008a347a7d1e447da52`  
Wall Object ID: `0x906c822b841111825fa5d829be1df9d0d7a9eb9d8b149047cf89be5df5fc40f4`

### how we used the stack

**Walrus:** every mark is stored as a blob on Walrus testnet. the blobId is the mark's permanent identity. nothing gets deleted.

**MemWal:** after IWAS AI reads a mark, the emotion and narrative get written to MemWal. this makes the memory cross-device and permanent. even if you clear your browser, the wall remembers.

**IWAS AI:** Claude reads every mark and returns one emotion out of seven and one poetic sentence. the output gets committed to MemWal alongside the blob. nothing is mocked.

**Sui:** a Move smart contract indexes every mark on-chain. the wallet signs a transaction on every upload. the wall is global.

### run locally

```bash
npm install
npm run dev
```

### why it exists

Most of the internet is built for scrolling and forgetting. We wanted to make a place where you leave a piece of yourself and walk away. It is an experiment in digital permanence. Decentralized storage doesn't have to feel like a database. It can feel like a cave wall.
