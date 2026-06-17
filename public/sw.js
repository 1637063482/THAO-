const CACHE_NAME = 'family-expense-tracker-v4'; // 【重要】升级版本号为 v4，强制客户端拉取最新的 index.html
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 定义本次更新的日志内容，会显示在页面的更新弹窗中
const updateLog = `本次更新内容:
1. 【优化】移动端快记(FAB)的分类选项新增了专属 Emoji 图标，提升视觉辨识度。
2. 【优化】精简了快记菜单中的日期选项栏，移除了冗余的“(本月)”字符，界面更清爽。
3. 【优化】登录界面的邮箱和密码输入框现已支持“回车键(Enter)”自动跳转及快捷提交。
4. 【修复】彻底修复 PC 端和移动端“月度预算设置”输入框宽度不一致、撑破卡片的问题。
5. 【修复】修复了移动端屏幕较窄时，预算设置提示文字被挤压断行的问题。`;

// 安装阶段，强制跳过等待
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 监听从页面发来的主动接管消息
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// 激活阶段，激进地清理旧版本的缓存，并立即接管所有页面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('清理旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即接管所有客户端
  );

  // 尝试向所有受控的客户端发送更新记录消息
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_LOG',
        log: updateLog
      });
    });
  });
});

// 拦截网络请求：修改为【网络优先 (Network First)】策略
self.addEventListener('fetch', event => {
  // 只拦截同源的 GET 请求，放行 Firebase 的云端 API 数据请求
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // 策略：先尝试从网络获取最新资源
    fetch(event.request)
      .then(fetchResponse => {
        // 如果网络请求成功，克隆一份存入缓存，然后返回给页面
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      })
      .catch(() => {
        // 如果网络请求失败（离线状态），则降级回退到缓存中寻找
        return caches.match(event.request)
          .then(cacheResponse => {
            if (cacheResponse) {
              return cacheResponse;
            }
            // 离线且没有缓存时的最终回退
            return new Response('目前处于离线状态，且该资源未缓存。请连接网络后重试。', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});