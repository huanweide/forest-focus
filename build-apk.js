// 阿梓的森林 APK 构建脚本
// 用 bubblewrap core 生成 TWA APK
const { TwaGenerator, AndroidSdkTools, JdkHelper, KeyTool, ConsoleColor } = require('@bubblewrap/core');
const path = require('path');
const fs = require('fs');

const jdkPath = 'C:/Users/Administrator/.bubblewrap/jdk/jdk-17.0.11+9';
const apkDir = path.join(__dirname, 'apk_build');
const outDir = path.join(__dirname, 'docs', 'download');

async function main() {
  console.log('🔧 阿梓的森林 APK 构建器');

  // Setup JDK
  process.env.JAVA_HOME = jdkPath;
  process.env.PATH = path.join(jdkPath, 'bin') + ';' + process.env.PATH;

  const jdkHelper = new JdkHelper(process.env, ConsoleColor);
  if (!(await jdkHelper.validate())) {
    console.error('❌ JDK 不可用');
    process.exit(1);
  }
  console.log('✅ JDK OK');

  // Create directories
  fs.rmSync(apkDir, { recursive: true, force: true });
  fs.mkdirSync(apkDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  // Generate TWA project
  const generator = new TwaGenerator();
  const config = {
    appVersion: '4.0.0',
    appVersionCode: 1,
    backgroundColor: '#E8F5E9',
    display: 'standalone',
    fallbackType: 'customtabs',
    features: {
      locationDelegation: { enabled: false },
      playBilling: { enabled: false },
    },
    host: 'huanweide.github.io',
    iconUrl: 'https://huanweide.github.io/forest-focus/src/images/azusa/icon-512.png',
    includeSourceCode: false,
    isMetaQuest: false,
    launcherName: '阿梓的森林',
    maskableIconUrl: 'https://huanweide.github.io/forest-focus/src/images/azusa/icon-512.png',
    monochromeIconUrl: 'https://huanweide.github.io/forest-focus/src/images/azusa/icon-192.png',
    name: '阿梓的森林',
    navigationColor: '#7C5CBF',
    navigationColorDark: '#5C3D8F',
    navigationDividerColor: '#7C5CBF',
    navigationDividerColorDark: '#5C3D8F',
    packageId: 'io.github.huanweide.forestfocus',
    shortName: '阿梓森林',
    splashScreenFadeOutDuration: 200,
    startUrl: 'https://huanweide.github.io/forest-focus/',
    themeColor: '#7C5CBF',
    themeColorDark: '#5C3D8F',
  };

  console.log('📦 生成 TWA 项目...');
  await generator.generateTwaProject(apkDir, config);
  console.log('✅ 项目生成完成');

  // Build APK
  console.log('🔨 构建 APK (需要 Android SDK, 如果没有会尝试自动安装)...');
  const androidSdkTools = await AndroidSdkTools.create(process.env, ConsoleColor);

  // Check if we have Android SDK
  const sdkPath = path.join(process.env.USERPROFILE || '~', 'Android', 'Sdk');
  if (fs.existsSync(sdkPath)) {
    console.log('📱 使用已有 Android SDK');
  } else {
    console.log('⚠️  Android SDK 未找到，尝试通过 bubblewrap 安装...');
    // Try installing via sdkmanager
    console.log('请手动运行: bubblewrap build 来进行完整构建');
    console.log('当前仅生成项目文件到: ' + apkDir);
  }

  console.log('\n📁 项目文件位置: ' + apkDir);
  console.log('📲 APK 将输出到: ' + outDir);
  console.log('\n✅ 项目初始化完成！下一步运行: bubblewrap build');
}

main().catch(e => {
  console.error('构建失败:', e.message);
  console.error(e.stack);
  process.exit(1);
});
