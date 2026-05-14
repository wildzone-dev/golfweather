
export const onRequest = async (context: any) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Exact or partial match logic
  const path = pathname.replace(/\/$/, ""); // Remove trailing slash

  // Standard health check
  if (path === "/api/health") {
    return new Response(JSON.stringify({ status: "ok", provider: "cloudflare" }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  // Data.go.kr API Key
  const RAW_KEY = (((env as any).DATA_GO_KR_API_KEY as string) || "K6mx1Aw4HDj%2BBUkt%2BOQ%2FYXfJl%2FRF7gXMg3ku0tKBYRWYOT4tXFPPn25hGH0q6EeLpoFYHYns2w%2BFSY5DuuDjDA%3D%3D").trim();
  
  // Decoding check
  const decodedKey = (() => {
    try {
      return decodeURIComponent(RAW_KEY);
    } catch (e) {
      return RAW_KEY;
    }
  })();

  const fetchDataGoKr = async (baseUrl: string, params: Record<string, string>) => {
    const variations = [
      { key: RAW_KEY, manual: true, https: false, pName: 'serviceKey' }, 
      { key: decodedKey, manual: false, https: false, pName: 'serviceKey' }, 
      { key: RAW_KEY, manual: false, https: false, pName: 'serviceKey' }, 
      { key: RAW_KEY, manual: true, https: false, pName: 'ServiceKey' },
      { key: decodedKey, manual: true, https: false, pName: 'serviceKey' },
      { key: RAW_KEY, manual: true, https: true, pName: 'serviceKey' }
    ];

    let lastError = null;
    let lastStatus = 0;

    for (const variant of variations) {
      try {
        const apiBase = variant.https ? baseUrl.replace("http://", "https://") : baseUrl.replace("https://", "http://");
        let fetchUrl = "";
        
        const currentParams = { ...params };
        const commonHeaders = {
          'Accept': 'application/json, text/xml, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.data.go.kr/',
          'Cache-Control': 'no-cache'
        };

        if (variant.manual) {
          const queryParts = [`${variant.pName}=${variant.key}`];
          for (const [k, v] of Object.entries(currentParams)) {
             if (k.toLowerCase() === 'servicekey') continue;
             queryParts.push(`${k}=${encodeURIComponent(v)}`);
          }
          fetchUrl = `${apiBase}?${queryParts.join("&")}`;
        } else {
          const searchParams = new URLSearchParams();
          for (const [k, v] of Object.entries(currentParams)) {
            if (k.toLowerCase() === 'servicekey') continue;
            searchParams.append(k, v);
          }
          searchParams.append(variant.pName, variant.key);
          fetchUrl = `${apiBase}?${searchParams.toString()}`;
        }

        const response = await fetch(fetchUrl, { headers: commonHeaders });
        const text = await response.text();
        lastStatus = response.status;

        if (response.status === 429 || text.includes("LIMITED_NUMBER_OF_SERVICE_REQUESTS")) {
           throw new Error("QUOTA_EXCEEDED");
        }

        const isHtml = text.trim().startsWith('<!doctype') || text.trim().startsWith('<html');
        const isErrorInBody = isHtml || 
                             text.includes("<returnAuthMsg>HTTP_ERROR</returnAuthMsg>") || 
                             text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR") ||
                             text.includes("INVALID_REQUEST_PARAMETER_ERROR") ||
                             text.includes("Unauthorized") ||
                             text.includes("FORBIDDEN") ||
                             text.includes("API token") ||
                             text.includes("Access Denied") ||
                             (text.includes("<returnReasonCode>") && !['00', '0', 'OK', '1'].includes(text.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/)?.[1] || ''));

        const isHttpAuthError = response.status === 403 || response.status === 401;

        if (!isErrorInBody && !isHttpAuthError && text.trim().length > 5) {
          return { data: text, status: response.status };
        }
        
        lastError = isHtml ? "HTML_RETURNED" : (isErrorInBody ? "Logic/Auth Error" : `HTTP ${response.status}`);
      } catch (error: any) {
        if (error.message === "QUOTA_EXCEEDED") throw error;
        lastError = error.message;
      }
    }
    throw new Error(`All proxy attempts failed. Last status: ${lastStatus}. Error: ${lastError}`);
  };

  const sendJSON = (data: string) => {
    const trimmed = data.trim();
    const isActuallyJSON = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
    
    if (isActuallyJSON) {
      return new Response(data, { 
        headers: { "Content-Type": "application/json; charset=utf-8" } 
      });
    } else {
      return new Response(JSON.stringify({ 
        proxyError: true, 
        error: "NON_JSON_RETURNED", 
        debug: trimmed.substring(0, 100) 
      }), { 
        headers: { "Content-Type": "application/json; charset=utf-8" } 
      });
    }
  };

  // Routing
  try {
    if (path === "/api/proxy") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) return new Response(JSON.stringify({ error: "URL is required" }), { status: 400 });
      const response = await fetch(targetUrl);
      const data = await response.arrayBuffer();
      const contentType = response.headers.get("content-type");
      const headers = new Headers();
      if (contentType) headers.set("Content-Type", contentType);
      return new Response(data, { headers });
    }

    if (path === "/api/weather/current") {
      const { nx, ny, baseDate, baseTime } = Object.fromEntries(url.searchParams);
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst",
        { numOfRows: "1000", pageNo: "1", base_date: baseDate, base_time: baseTime, nx, ny, dataType: "JSON" }
      );
      return sendJSON(result.data);
    }

    if (path === "/api/weather/forecast") {
      const { nx, ny, baseDate, baseTime } = Object.fromEntries(url.searchParams);
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst",
        { numOfRows: "1000", pageNo: "1", base_date: baseDate, base_time: baseTime, nx, ny, dataType: "JSON" }
      );
      return sendJSON(result.data);
    }

    if (path === "/api/weather/air") {
      const { stationName } = Object.fromEntries(url.searchParams);
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty",
        { returnType: "json", numOfRows: "1", pageNo: "1", stationName, dataTerm: "DAILY", ver: "1.3" }
      );
      return sendJSON(result.data);
    }

    if (path === "/api/weather/air-forecast") {
      const { searchDate, informCode } = Object.fromEntries(url.searchParams);
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth",
        { returnType: "json", numOfRows: "100", pageNo: "1", searchDate, informCode }
      );
      return sendJSON(result.data);
    }

    if (path === "/api/weather/village-forecast") {
      const { nx, ny, baseDate, baseTime } = Object.fromEntries(url.searchParams);
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
        { numOfRows: "2000", pageNo: "1", base_date: baseDate, base_time: baseTime, nx, ny, dataType: "JSON" }
      );
      return sendJSON(result.data);
    }

    if (path === "/api/weather/version") {
      const { ftype, basedatetime } = Object.fromEntries(url.searchParams);
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getFcstVersion",
        { numOfRows: "1", pageNo: "1", ftype, basedatetime, dataType: "JSON" }
      );
      return sendJSON(result.data);
    }

    if (path === "/api/weather/sun") {
      const { locdate } = Object.fromEntries(url.searchParams);
      const lat = 37.3822;
      const lng = 127.8711;
      const dateStr = locdate ? `${locdate.substring(0, 4)}-${locdate.substring(4, 6)}-${locdate.substring(6, 8)}` : 'today';
      const response = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateStr}&formatted=0`);
      const data: any = await response.json();

      if (data.status === "OK") {
        const results = data.results;
        const toKST = (iso: string) => {
          const date = new Date(iso);
          const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
          return `${String(kstDate.getHours()).padStart(2, '0')}:${String(kstDate.getMinutes()).padStart(2, '0')}`;
        };
        return new Response(JSON.stringify({ sunrise: toKST(results.sunrise), sunset: toKST(results.sunset) }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      }
      return new Response(JSON.stringify({ sunrise: null, sunset: null }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
    }

    if (path === "/api/weather/uv") {
      const { areaNo, time } = Object.fromEntries(url.searchParams);
      const endpoints = [
        "http://apis.data.go.kr/1360000/LivingWthrIdxServiceV5/getUVIdxV5",
        "http://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV5",
        "http://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV4",
        "http://apis.data.go.kr/1360000/LivingWthrIdxService/getUVIdxV5"
      ];

      let lastUvError: any = null;
      for (const endpoint of endpoints) {
        try {
          const result = await fetchDataGoKr(endpoint, { areaNo: areaNo ?? "5113033000", time, dataType: "JSON" });
          return sendJSON(result.data);
        } catch (e: any) {
          lastUvError = e;
          continue;
        }
      }
      return new Response(JSON.stringify({ 
        proxyError: true, 
        error: (lastUvError?.message === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "UV_FETCH_FAILED"), 
        detail: lastUvError?.message 
      }), { headers: { "Content-Type": "application/json; charset=utf-8" }, status: 500 });
    }

    if (path === "/api/golf/green-speed") {
      const baseUrl = "https://oapi.hdc-resort.com/golfapi/V1/golfcommon/companies";
      const params = "addAttr=M&bsnsCode=11&langTypeCode=KOR&propertyNo=61&systemId=HDCWINGS";
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: {
          "accept": "*/*",
          "API-KEY": "$2a$12$8p714ufRLNQUMVktAkSPPu2vE/X9MPP65leur.VWurR7pIuir83Qu",
          "VENDOR_ID": "GOLFPRECHECKIN"
        }
      });
      const data = await response.text();
      return sendJSON(data);
    }

    return new Response(JSON.stringify({ error: "Endpoint not found", path: pathname }), { 
      status: 404, 
      headers: { "Content-Type": "application/json; charset=utf-8" } 
    });

  } catch (error: any) {
    if (error.message === "QUOTA_EXCEEDED") {
      return new Response(JSON.stringify({ proxyError: true, error: "QUOTA_EXCEEDED", detail: error.message }), { 
        status: 429, 
        headers: { "Content-Type": "application/json; charset=utf-8" } 
      });
    }
    return new Response(JSON.stringify({ 
      proxyError: true,
      error: "SERVER_ERROR", 
      detail: error.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json; charset=utf-8" } 
    });
  }
};
