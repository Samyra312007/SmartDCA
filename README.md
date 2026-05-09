# SmartDCA - Smart Dollar-Cost Averaging on Solana

> **Conditional DCA Protocol**: Execute trades on specific market conditions, not just fixed schedules
> 
> 🚀 **Cross-Chain Funding** · 🎯 **Condition-Based Execution** · 🔊 **Voice Alerts** · ⚡ **Sub-Second Speed**

---

## 📋 Overview

SmartDCA is a next-generation decentralized dollar-cost averaging protocol built on Solana. Unlike traditional DCA tools that buy on fixed schedules, SmartDCA allows you to set specific market conditions that trigger your trades automatically.

**Key Innovation**: Instead of "buy $50 of SOL every Monday", you can set "buy $50 of SOL only when it drops 5% in 24 hours" or "buy $100 of JUP when RSI falls below 30".

---

## 🏗️ Architecture

```
User (Any Chain)
    │
    ▼
LI.FI Bridge ──── bridges USDC to Solana
    │
    ▼
Anchor Escrow PDA ◄──── Helius Webhook monitors price
    │                         │
    │              condition met?
    │                    YES ▼
    └──────────► Jupiter CPI (swap USDC → token)
                       │
                       ▼
              ElevenLabs voice alert
```

---

## ✨ Features

### 🎯 Smart Conditions
- **Price Drop**: Execute when token drops X% in 24h
- **RSI-Based**: Buy when RSI falls below threshold
- **Weekly Comparison**: Execute if price is below last week's price

### 🔒 Security
- **Non-Custodial**: Your funds remain in your control
- **Anchor Program**: Battle-tested Solana smart contract framework
- **PDA Escrow**: Program-derived account security

### ⚡ Performance
- **Sub-Second Execution**: Leverages Solana's 400ms block times
- **Jupiter Routing**: Best price execution across all liquidity
- **Atomic Operations**: Either succeeds completely or fails safely

### 🌐 Cross-Chain
- **Multi-Chain Support**: Deposit from Ethereum, Base, Polygon, etc.
- **LI.FI Integration**: Seamless cross-chain bridging
- **USDC Conversion**: Automatic token conversion on Solana

### 🎵 User Experience
- **Voice Alerts**: Natural ElevenLabs TTS notifications
- **Dashboard**: Real-time strategy monitoring
- **Web3 Integration**: Wallet connection with RainbowKit

---

## 🛠️ Tech Stack

### Frontend (Next.js)
- **Framework**: Next.js 16 with App Router
- **UI Components**: shadcn/ui + Tailwind CSS
- **Styling**: Custom gradient system with backdrop blur
- **State Management**: React Query for data fetching
- **Wallets**: RainbowKit + Solana wallet adapters

### Backend (Solana)
- **Framework**: Anchor 0.30.1
- **Language**: Rust (Edition 2021)
- **Program ID**: `4uH1ZvU29XFzRCEk4S7dNT29gUWMPU3gHaZQdhiacxhF` (Devnet)
- **Token Standard**: SPL Token (USDC)
- **Oracles**: Helius/Pyth price feeds

### External Integrations
- **DEX Aggregation**: Jupiter API
- **Cross-Chain**: LI.FI SDK
- **Voice Synthesis**: ElevenLabs
- **Database**: Supabase (for off-chain data)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Solana CLI
- Yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/smart-dca.git
cd smart-dca
```

2. **Install dependencies**
```bash
# Install frontend dependencies
npm install

# Install Rust/Anchor dependencies
cd smart-dca
yarn install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Fill in your API keys and wallet paths
```

4. **Configure Solana wallet**
```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

### Development

**Start the development server:**
```bash
npm run dev
```

**Open [http://localhost:3000](http://localhost:3000)** to see the landing page.

**Start the Anchor program:**
```bash
cd smart-dca
anchor localnet
```

---

## 📁 Project Structure

```
SmartDCA/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── create/            # Strategy creation page
│   │   ├── dashboard/         # User dashboard
│   │   └── strategy/          # Strategy management
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/           # Layout components
│   │   └── voice/           # Voice alert components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions
│   └── types/               # TypeScript definitions
├── smart-dca/               # Anchor program
│   ├── programs/
│   │   └── smart-dca/       # Rust program source
│   ├── tests/               # Program tests
│   └ migrations/           # Database migrations
├── components.json         # shadcn/ui configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── package.json           # Project dependencies
```

---

## 🧪 Testing

### Frontend Tests
```bash
npm run test          # Run Jest tests
npm run test:watch    # Run tests in watch mode
```

### Anchor Program Tests
```bash
cd smart-dca
anchor test           # Run all program tests
anchor test -- --grep "initialize"  # Run specific tests
```

### Integration Tests
```bash
npm run test:integration  # End-to-end testing
```

---

## 🚢 Deployment

### Frontend (Vercel)
```bash
npm run build
npm run start
```

### Solana Program
```bash
# Deploy to Devnet
anchor deploy --provider.cluster devnet

# Deploy to Mainnet (when ready)
anchor deploy --provider.cluster mainnet-beta
```

### Environment Variables
Create a `.env.local` file with:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key

# LI.FI
LIFI_API_KEY=your_lifi_api_key

# Jupiter
JUPITER_API_URL=https://quote-api.jup.ag/v6
```

---

## 🔌 API Endpoints

### REST API (`/api/*`)
- `POST /api/strategies` - Create new strategy
- `GET /api/strategies` - Get user strategies
- `PUT /api/strategies/:id` - Update strategy
- `DELETE /api/strategies/:id` - Delete strategy
- `GET /api/strategies/:id/history` - Get trade history

### GraphQL (Optional)
Available at `/api/graphql` for complex queries.

---

## 📊 Smart Contract API

### Instructions

#### `initialize(condition: StrategyCondition)`
Creates a new escrow account and stores the DCA strategy.

**Accounts Required:**
- `owner` (signer)
- `escrow_account` (PDA, init)
- `usdc_token_account`
- `token_program`
- `system_program`
- `rent`

#### `deposit(amount: u64)`
Transfers USDC from owner to escrow.

#### `execute_trade(proof: ConditionProof)`
Executes trade when condition is met.

#### `set_active(is_active: bool)`
Pauses or resumes strategy.

### Account Structures

```typescript
interface EscrowAccount {
  owner: PublicKey;
  usdc_token_account: PublicKey;
  total_deposited: u64;
  balance: u64;
  condition: StrategyCondition;
  last_executed_at: i64;
  execution_count: u64;
  is_active: bool;
  bump: u8;
}

interface StrategyCondition {
  condition_type: ConditionType;
  threshold_bps: u64;
  trade_amount_usdc: u64;
  output_mint: PublicKey;
  min_output_amount: u64;
}
```

---

## 🎨 UI/UX Features

### Design System
- **Color Palette**: Solana purple and green gradients
- **Typography**: Modern font with proper hierarchy
- **Animations**: Smooth transitions and micro-interactions
- **Responsive**: Mobile-first design approach

### Voice Alert System
- **ElevenLabs Integration**: Natural-speech synthesis
- **Custom Voice Profiles**: Configurable alert voices
- **Real-time Notifications**: Immediate trade execution feedback

### Dashboard Features
- **Strategy Overview**: Active/paused strategies status
- **Performance Analytics**: ROI and execution metrics
- **Trade History**: Complete audit trail
- **Condition Builder**: Visual strategy creation

---

## 🔒 Security Considerations

### Smart Contract Security
- **Formal Verification**: Critical functions verified
- **Access Control**: Owner-only operations
- **Reentrancy Protection**: Solidity-style guards
- **Overflow Protection**: Rust type safety

### Frontend Security
- **Input Validation**: Client and server-side validation
- **XSS Protection**: React's built-in protections
- **CSRF Protection**: Next.js security features
- **Secure Storage**: Encrypted wallet management

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Style
- **Rust**: Follow Rust official style
- **TypeScript**: Use ESLint configuration
- **CSS**: Follow Tailwind conventions

---

## 📈 Roadmap

### Q2 2026
- [ ] Mainnet deployment
- [ ] Mobile app (React Native)
- [ ] Advanced condition types
- [ ] Strategy templates

### Q3 2026
- [ ] Mobile notifications
- [ ] Advanced analytics
- [ ] Multi-strategy management
- [ ] Social features

### Q4 2026
- [ ] Institutional features
- [ ] API for third-party integrations
- [ ] Advanced trading conditions
- [ ] Portfolio management tools

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Solana](https://solana.com/) for the fast blockchain
- [Anchor](https://anchor-lang.com/) for the excellent framework
- [Jupiter](https://jup.ag/) for the DEX aggregation
- [RainbowKit](https://www.rainbowkit.com/) for the wallet integration
- [ElevenLabs](https://elevenlabs.io/) for the voice synthesis