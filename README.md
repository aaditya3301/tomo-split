# TOMO-LABS 🚀

**TOMO-LABS**

Smart on-chain payment splits via ENS, groups & cross-chain yield like a lottery.

![TOMO-LABS Hero](./src/assets/hero-background.jpg)

## 🌟 Features

### 🔗 **Web3 Integration**
- **Wallet Connection**: Seamless integration with 180+ wallets via Reown AppKit
- **Social Logins**: Google, Twitter, GitHub, Discord, Apple, Facebook
- **Multi-Chain Support**: Ethereum Mainnet, Arbitrum
- **ENS Resolution**: Real-time ENS name resolution using Alchemy API

### 💰 **Bill Splitting & Payment Rails**
- **Smart Bill Splitting**: Create and manage group expenses with equal or custom splits
- **Real-time Dues Tracking**: Comprehensive financial overview across all groups
- **Filecoin Storage**: Permanent storage of split data on IPFS via Lighthouse
- **Cross-device Sync**: Access your data from any device with wallet connection

### 🎨 **Modern UI/UX**
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Glass Morphism**: Beautiful frosted glass effects and gradients
- **Particle Background**: Dynamic animated background
- **Dark Theme**: Yellow and black color scheme with smooth animations
- **Real-time Updates**: Live status indicators and progress tracking

### 🏗️ **Uniswap v4 Hooks Integration**
- **Fee-to-Splitter Hook**: Automatic fee distribution among group members
- **Creator Code Hook**: Revenue sharing for content creators
- **Streaming Fees Hook**: Real-time payment streaming
- **Payment Split Hook**: Native AMM pool payment splitting

## 🛠️ Tech Stack

### **Frontend**
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Shadcn/ui** for component library
- **React Router DOM** for navigation
- **Lucide React** for icons

### **Web3 & Blockchain**
- **Wagmi** for Ethereum interactions
- **Reown AppKit** for wallet connections
- **Ethers.js** for contract interactions
- **Alchemy SDK** for ENS resolution
- **Lighthouse SDK** for Filecoin storage

### **Storage & APIs**
- **Filecoin/IPFS** via Lighthouse for decentralized storage
- **Alchemy API** for ENS resolution and RPC endpoints
- **LocalStorage** for caching and quick access

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Web3 wallet (MetaMask, WalletConnect, etc.)
- Alchemy API key
- Lighthouse API key
- Reown Project ID

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/tomo-labs.git
   cd tomo-labs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_PROJECT_ID=your_reown_project_id
   VITE_ALCHEMY_API_KEY=your_alchemy_api_key
   VITE_STORAGE_API_KEY=your_lighthouse_api_key
   ```

4. **Start the development server**
   ```bash
npm run dev
```

5. **Open your browser**
   Navigate to `http://localhost:8080`

## 📖 Usage Guide

### 🔐 **Getting Started**
1. **Connect Your Wallet**: Click "Try Now" and connect via social login or wallet
2. **Access Dashboard**: Once connected, you'll be redirected to the bill splitting dashboard
3. **Add Friends**: Use ENS names or wallet addresses to add friends to your groups

### 💸 **Creating Bill Splits**
1. **Add Friends**: Enter ENS names (e.g., `vitalik.eth`) or wallet addresses
2. **Create Groups**: Select friends and form groups for different activities
3. **Split Bills**: Click "Create Split" on any group to divide expenses
4. **Track Dues**: View detailed breakdown in your profile dropdown

### 📊 **Managing Finances**
- **Profile Overview**: Click your avatar to see total dues and group breakdowns
- **Storage Status**: Monitor Filecoin upload/sync status in the sidebar
- **Group Management**: View settled vs pending groups with color-coded indicators

## 🔧 Configuration

### **Environment Variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_PROJECT_ID` | Reown AppKit project ID for wallet connections | ✅ |
| `VITE_ALCHEMY_API_KEY` | Alchemy API key for ENS resolution and RPC | ✅ |
| `VITE_STORAGE_API_KEY` | Lighthouse API key for Filecoin storage | ✅ |

### **Getting API Keys**

1. **Reown Project ID**
   - Visit [Reown Dashboard](https://dashboard.reown.com)
   - Create a new project
   - Copy the Project ID

2. **Alchemy API Key**
   - Visit [Alchemy Dashboard](https://dashboard.alchemy.com)
   - Create a new app on Ethereum Mainnet
   - Copy the API key

3. **Lighthouse API Key**
   - Visit [Lighthouse Storage](https://lighthouse.storage)
   - Sign up and get your API key
   - Copy the API key

## 🏗️ Architecture

### **Component Structure**
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Shadcn/ui components
│   ├── FriendsSection.tsx
│   ├── ProfileDropdown.tsx
│   ├── SplitModal.tsx
│   └── StorageStatus.tsx
├── pages/               # Route components
│   ├── Index.tsx        # Landing page
│   ├── Dashboard.tsx    # Main dashboard
│   └── NotFound.tsx
├── services/            # API and blockchain services
│   ├── alchemyENSService.ts
│   ├── lighthouseService.ts
│   └── splitStorageService.ts
├── hooks/               # Custom React hooks
│   ├── useStorage.ts
│   └── use-mobile.tsx
├── layouts/             # Layout components
│   └── DashboardLayout.tsx
└── lib/                 # Utilities and configurations
    ├── wagmi.ts         # Web3 configuration
    └── utils.ts         # Helper functions
```

### **Data Flow**
1. **User Authentication**: Wallet connection via Reown AppKit
2. **ENS Resolution**: Real-time name resolution via Alchemy
3. **Local State**: React state management for UI interactions
4. **Filecoin Storage**: Permanent data storage via Lighthouse
5. **Cache Layer**: LocalStorage for quick access and offline support

## 🧪 Development

### **Available Scripts**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### **Code Style**
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React and TypeScript
- **Prettier**: Code formatting (if configured)
- **Tailwind**: Utility-first CSS approach

### **Testing**
```bash
npm run test        # Run tests
npm run test:watch  # Run tests in watch mode
npm run coverage    # Generate coverage report
```

## 🌐 Deployment

### **Build for Production**
```bash
npm run build
```

### **Deploy to Vercel**
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### **Deploy to Netlify**
1. Connect repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### **Development Guidelines**
- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure responsive design compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Uniswap Labs** for the v4 hooks architecture
- **Reown** for wallet connection infrastructure
- **Alchemy** for reliable Web3 APIs
- **Lighthouse** for decentralized storage
- **Shadcn/ui** for beautiful components
- **Tailwind CSS** for utility-first styling

## 📞 Support

- **Documentation**: [docs.tomo-labs.com](https://docs.tomo-labs.com)
- **Discord**: [Join our community](https://discord.gg/tomo-labs)
- **Twitter**: [@TomoLabs](https://twitter.com/TomoLabs)
- **Email**: support@tomo-labs.com

---

**Built with ❤️ by the TOMO-LABS team**

*Making Web3 social, one split at a time* 🌟