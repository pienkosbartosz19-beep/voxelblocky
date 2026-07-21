/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    // Wyklucz pliki binarne (natywne addony, WASM) z bundlingu
    config.module.rules.push({
      test: /\.(node|wasm)$/,
      use: "ignore-loader",
    });

    // Ignoruj zależności natywne po stronie serwera
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "sharp": "commonjs sharp",
        "@xenova/transformers": "commonjs @xenova/transformers",
      });
    }

    return config;
  },
};

export default nextConfig;
