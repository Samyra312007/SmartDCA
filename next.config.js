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

    // Silence ox/viem critical dependency warnings
    config.module.rules.push({
      test: /node_modules\/ox\/.*\.js$/,
      loader: 'string-replace-loader',
      options: {
        search: 'critical dependency',
        replace: '',
        flags: 'i'
      }
    });

    // Alternative way to silence specific warnings if the above doesn't work well
    config.ignoreWarnings = [
      { module: /node_modules\/ox/ },
      { module: /node_modules\/viem/ },
      { message: /Critical dependency: the request of a dependency is an expression/ }
    ];

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
    "@solana/spl-token",
    "@lifi/widget",
    "@lifi/sdk",
  ],
};

module.exports = nextConfig;