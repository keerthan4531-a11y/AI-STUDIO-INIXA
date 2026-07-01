import nodeFetch from 'node-fetch';

let proxyPool: string[] = [];
let currentProxyIndex = 0;
let lastProxyScrape = 0;
let cachedWorkingProxy: string | null = null;

export async function refreshProxyPool() {
  const now = Date.now();
  if (proxyPool.length > 0 && now - lastProxyScrape < 5 * 60 * 1000) {
    return; // Use cache if less than 5 mins old
  }

  try {
    console.log(
      "[ProxyPool] Fetching fresh working HTTP and SOCKS proxies from multiple sources...",
    );
    const newProxies = new Set<string>();

    // Source 1: ProxyScrape SOCKS5
    try {
      const psRes = await nodeFetch(
        "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=4000&country=all",
      );
      const psText = await psRes.text();
      psText
        .split("\n")
        .filter((l: string) => l.trim().length > 0)
        .forEach((p: string) => newProxies.add(`socks5://${p.trim()}`));
    } catch (e) {}

    // Source 2: ProxyScrape SOCKS4
    try {
      const psRes4 = await nodeFetch(
        "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=4000&country=all",
      );
      const psText4 = await psRes4.text();
      psText4
        .split("\n")
        .filter((l: string) => l.trim().length > 0)
        .forEach((p: string) => newProxies.add(`socks4://${p.trim()}`));
    } catch (e) {}

    // Source 3: ProxyScrape HTTP (High Quality)
    try {
      const psResH = await nodeFetch(
        "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=4000&country=all&ssl=yes&anonymity=anonymous,elite",
      );
      const psTextH = await psResH.text();
      psTextH
        .split("\n")
        .filter((l: string) => l.trim().length > 0)
        .forEach((p: string) => newProxies.add(`http://${p.trim()}`));
    } catch (e) {}

    // Source 4: Geonode API SOCKS & HTTP
    try {
      const geoRes = await nodeFetch(
        "https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&protocols=socks5%2Csocks4%2Chttp%2Chttps",
      );
      const geoData = await geoRes.json();
      if (geoData && geoData.data) {
        geoData.data
          .filter((p: any) => p.speed < 3000)
          .forEach((p: any) =>
            newProxies.add(`${p.protocols[0]}://${p.ip}:${p.port}`),
          );
      }
    } catch (e) {}

    if (newProxies.size > 0) {
      // Shuffle the set
      proxyPool = Array.from(newProxies).sort(() => 0.5 - Math.random());
      lastProxyScrape = now;
      currentProxyIndex = 0;
      console.log(
        `[ProxyPool] Successfully loaded ${proxyPool.length} fast proxies (Mixed SOCKS/HTTP).`,
      );
      return;
    }

    // Source 5: Fallback TheSpeedX SOCKS5
    const fallbackRes = await nodeFetch(
      "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt",
    );
    const fallbackText = await fallbackRes.text();
    const lines = fallbackText
      .split("\n")
      .filter((l: string) => l.trim().length > 0);
    const shuffled = lines.sort(() => 0.5 - Math.random()).slice(0, 100);
    shuffled.forEach((p: string) => newProxies.add(`socks5://${p.trim()}`));

    // Source 6: Fallback TheSpeedX HTTP
    try {
      const fallbackHRes = await nodeFetch(
        "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
      );
      const fallbackHText = await fallbackHRes.text();
      const hLines = fallbackHText
        .split("\n")
        .filter((l: string) => l.trim().length > 0);
      const hShuffled = hLines.sort(() => 0.5 - Math.random()).slice(0, 100);
      hShuffled.forEach((p: string) => newProxies.add(`http://${p.trim()}`));
    } catch (e) {}

    proxyPool = Array.from(newProxies).sort(() => 0.5 - Math.random());
    lastProxyScrape = now;
    currentProxyIndex = 0;
    console.log(
      `[ProxyPool] Fallback loaded ${proxyPool.length} Mixed proxies.`,
    );
  } catch (e) {
    console.error("[ProxyPool] Error fetching proxies:", e);
  }
}

export function getNextProxy(): string | null {
  if (proxyPool.length === 0) return null;
  const proxy = proxyPool[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxyPool.length;
  return proxy;
}

export function getCachedWorkingProxy(): string | null {
  return cachedWorkingProxy;
}

export function setCachedWorkingProxy(proxy: string | null) {
  cachedWorkingProxy = proxy;
}

export function getProxyPool(): string[] {
  return proxyPool;
}
