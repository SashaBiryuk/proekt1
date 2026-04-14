module.exports = {
  expo: {
    name: "ТрипПлан",
    slug: "tripplan",
    version: "1.10.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "tripplan",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#F8F9FB",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.replit.tripplan",
    },
    android: {
      package: "com.replit.tripplan",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#F8F9FB",
      },
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      [
        "expo-router",
        { origin: "https://replit.com/" },
      ],
      "expo-font",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    // Embedded at build time — available via Constants.expoConfig.extra
    extra: {
      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL || "https://bd.24planer.ru",
      supabaseAnonKey:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc1OTEzOTIwLCJleHAiOjE5MzM2MjEyMDB9.LNn6huG9ifp4RXnNZWkNnntamY7_BqVG31LeiaZqNJE",
      eas: {
        projectId: "1ba5a3d9-de5a-49b7-99dd-e0ebc2ceadd1",
      },
    },
  },
};
