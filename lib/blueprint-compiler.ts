import type { BlueprintNode, ComponentBlueprint } from './blueprint-schema';

function propString(properties: Record<string, unknown>, key: string, fallback: string): string {
  const value = properties[key];
  return typeof value === 'string' ? value : fallback;
}

function propStringArray(properties: Record<string, unknown>, key: string, fallback: string[]): string[] {
  const value = properties[key];
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === 'string');
}

export function compileToWebApp(blueprint: ComponentBlueprint): string {
  const { meta, canvasTree } = blueprint;
  const isDark = meta.theme === 'dark';

  const renderComponent = (node: BlueprintNode, depth: number = 0): string => {
    const bg = isDark ? 'gray-900' : 'gray-50';
    const surface = isDark ? 'gray-800' : 'white';
    const surfaceAlt = isDark ? 'gray-700' : 'gray-100';
    const text = isDark ? 'white' : 'gray-900';

    const componentMap: Record<string, string> = {
      WorkspaceContainer: `<div className="min-h-screen bg-${bg} text-${text} p-4">`,
      DataMetricCard: `<div className="bg-${surface} rounded-lg p-4 shadow">
  <h3 className="text-sm font-medium text-gray-500">${propString(node.properties, 'title', 'Metric')}</h3>
  <p className="text-2xl font-bold">${propString(node.properties, 'value', '0')}</p>
</div>`,
      NavigationSidebar: `<nav className="w-64 bg-${surface} h-screen p-4">
  <ul className="space-y-2">
    <li><a href="#" className="block p-2 rounded hover:bg-gray-700">Dashboard</a></li>
    <li><a href="#" className="block p-2 rounded hover:bg-gray-700">Analytics</a></li>
    <li><a href="#" className="block p-2 rounded hover:bg-gray-700">Settings</a></li>
  </ul>
</nav>`,
      DataTable: `<div className="overflow-x-auto">
  <table className="min-w-full bg-${surface} rounded-lg">
    <thead className="bg-${surfaceAlt}">
      <tr>${propStringArray(node.properties, 'columns', ['Name', 'Status', 'Actions']).map((col) => `<th className="p-3 text-left">${col}</th>`).join('')}</tr>
    </thead>
    <tbody>
      <tr><td className="p-3" colSpan={3}>Loading data...</td></tr>
    </tbody>
  </table>
</div>`,
      FormBuilder: `<form className="space-y-3 bg-${surface} rounded-lg p-4">
  <input type="text" placeholder="Field 1" className="w-full p-2 border rounded" />
  <input type="text" placeholder="Field 2" className="w-full p-2 border rounded" />
  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Submit</button>
</form>`,
      ChartContainer: `<div className="h-64 bg-${surface} rounded-lg p-4">
  <canvas id="chart-${node.id}" className="w-full h-full"></canvas>
</div>`,
      PaymentButton: `<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
  ${propString(node.properties, 'label', 'Upgrade to Pro')}
</button>`,
      AuthForm: `<div className="max-w-md mx-auto p-6 bg-${surface} rounded-lg">
  <h2 className="text-2xl font-bold mb-4">${propString(node.properties, 'title', 'Sign In')}</h2>
  <input type="email" placeholder="Email" className="w-full p-2 mb-3 border rounded" />
  <input type="password" placeholder="Password" className="w-full p-2 mb-4 border rounded" />
  <button className="w-full p-2 bg-blue-600 text-white rounded">Sign In</button>
</div>`,
      GameCanvas: `<div id="game-container" className="w-full h-screen bg-black"></div>`,
      MapView: `<div id="map" className="w-full h-96 bg-gray-700 rounded-lg"></div>`,
      MediaUploader: `<input type="file" className="block w-full p-2 border rounded" accept="image/*" />`,
      AIAgentWidget: `<div className="fixed bottom-4 right-4 w-80 h-96 bg-${surface} rounded-lg shadow-xl overflow-hidden">
  <div className="p-3 bg-purple-600 text-white">AI Assistant</div>
  <div className="p-3 h-64 overflow-y-auto">
    <p className="text-gray-500">How can I help you today?</p>
  </div>
  <input type="text" placeholder="Type a message..." className="w-full p-2 border-t" />
</div>`,
    };

    const opening =
      componentMap[node.component] ||
      `<div className="p-4 border rounded">${node.component}</div>`;

    if (node.children && node.children.length > 0) {
      const children = node.children.map((c) => renderComponent(c, depth + 1)).join('\n');
      return `${opening}\n${children}\n${'  '.repeat(depth)}</div>`;
    }

    return opening;
  };

  const content = renderComponent(canvasTree.root);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title} - NiskBuild</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

export function compileToMobile(blueprint: ComponentBlueprint): string {
  const webCode = compileToWebApp(blueprint);

  return webCode.replace(
    '<head>',
    `<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#0B0F19">`
  );
}

export function generateCapacitorConfig(blueprint: ComponentBlueprint): object {
  return {
    appId: `com.niskbuild.${blueprint.applicationId}`,
    appName: blueprint.meta.title,
    webDir: 'dist',
    server: {
      androidScheme: 'https',
    },
    plugins: {
      SplashScreen: {
        launchShowDuration: 0,
      },
    },
  };
}

export function compileToGame(blueprint: ComponentBlueprint): string {
  return `import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    this.load.image('background', '/assets/background.png');
  }

  create() {
    this.add.text(400, 300, '${blueprint.meta.title}', {
      fontSize: '32px',
      fill: '#fff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(400, 350, 'Game generated by NiskBuild', {
      fontSize: '16px',
      fill: '#888',
    }).setOrigin(0.5);
  }

  update() {
    // Game loop
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  scene: MainScene,
  backgroundColor: '#0B0F19',
};

new Phaser.Game(config);`;
}

export function compileBlueprint(blueprint: ComponentBlueprint): {
  code: string;
  compiler: 'webapp' | 'mobile' | 'game';
} {
  switch (blueprint.targetPlatform) {
    case 'mobile':
    case 'ios':
    case 'android':
    case 'pwa':
      return { code: compileToMobile(blueprint), compiler: 'mobile' };
    case 'game':
      return { code: compileToGame(blueprint), compiler: 'game' };
    default:
      return { code: compileToWebApp(blueprint), compiler: 'webapp' };
  }
}
