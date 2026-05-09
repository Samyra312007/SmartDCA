/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence Turbopack error when webpack config is present
  turbopack: {},

  webpack: (config, { isServer, webpack }) => {

    // Solana/Anchor browser fixes
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs:            false,
      path:          false,
      crypto:        false,
      stream:        false,
      os:            false,
      net:           false,
      tls:           false,
      child_process: false,
      readline:      false,
      zlib:          false,
      http:          false,
      https:         false,
      url:           false,
      assert:        false,
      buffer:        require.resolve("buffer/"),
    };

    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
      })
    );

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers:           true,
    };

    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        "@solana/web3.js",
        "@coral-xyz/anchor",
      ];
    }

    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key:   "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key:   "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },

  transpilePackages: [
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
    "@solana/wallet-adapter-wallets",
    "@lifi/widget",
    "@lifi/sdk",
  ],
};

module.exports = nextConfig;