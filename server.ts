import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple Proxy for KMA/AirKorea APIs to avoid CORS and Mixed Content issues
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      console.log(`Proxying request to: ${targetUrl}`);
      const response = await axios.get(targetUrl, { responseType: 'text' });
      
      const contentType = response.headers["content-type"];
      if (contentType && typeof contentType === 'string') {
        res.setHeader("Content-Type", contentType);
      }
      
      res.send(response.data);
    } catch (error: any) {
      console.error("Proxy error:", error.message);
      res.status(500).json({ proxyError: true, error: "PROXY_FAILED", detail: error.message });
    }
  });

  // Helper for Data.go.kr APIs to handle encoding issues and retries
  const fetchDataGoKr = async (baseUrl: string, params: Record<string, string>, timeout = 15000) => {
    const RAW_KEY = (process.env.DATA_GO_KR_API_KEY || "K6mx1Aw4HDj%2BBUkt%2BOQ%2FYXfJl%2FRF7gXMg3ku0tKBYRWYOT4tXFPPn25hGH0q6EeLpoFYHYns2w%2BFSY5DuuDjDA%3D%3D").trim();
    
    // Decoding check
    const decodedKey = (() => {
      try {
        return decodeURIComponent(RAW_KEY);
      } catch (e) {
        return RAW_KEY;
      }
    })();

    // Variations of building the request to handle Data.go.kr inconsistency
    // V1: Verbatim RAW_KEY manual URL (Encoded verbatim) - Most common fix
    // V2: Decoded key via Axios (Standard)
    // V3: RAW_KEY via Axios (Double encoded?)
    // V4: ServiceKey (Capitalized) manual URL
    // V5: decodedKey manual URL (Verbatim decoded)
    // V6: RAW_KEY manual HTTPS
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

    for (const [idx, variant] of variations.entries()) {
      try {
        const apiBase = variant.https ? baseUrl.replace("http://", "https://") : baseUrl.replace("https://", "http://");
        let response;
        
        const currentParams = { ...params };
        const commonHeaders = {
          'Accept': 'application/json, text/xml, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.data.go.kr/'
        };

        if (variant.manual) {
          const queryParts = [`${variant.pName}=${variant.key}`];
          for (const [k, v] of Object.entries(currentParams)) {
             if (k.toLowerCase() === 'servicekey') continue;
             queryParts.push(`${k}=${encodeURIComponent(v)}`);
          }
          const url = `${apiBase}?${queryParts.join("&")}`;
          console.log(`[PROXY] V${idx+1} Manual Attempt: ${apiBase.split('/').pop()} (Key: ${variant.key.substring(0, 10)}...)`);
          
          response = await axios.get(url, { 
            responseType: 'text', 
            timeout, 
            validateStatus: () => true,
            headers: commonHeaders
          });
        } else {
          console.log(`[PROXY] V${idx+1} Axios Attempt: ${apiBase.split('/').pop()} (Key: ${variant.key.substring(0, 10)}...)`);
          const axiosParams: Record<string, string> = { ...currentParams };
          delete axiosParams.serviceKey;
          delete axiosParams.ServiceKey;
          axiosParams[variant.pName] = variant.key;

          response = await axios.get(apiBase, {
            params: axiosParams,
            responseType: 'text',
            timeout,
            validateStatus: () => true,
            headers: commonHeaders
          });
        }

        const text = response.data || "";
        lastStatus = response.status;

        // Diagnostic logging for failures
        const hasErrorString = text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR") || 
                              text.includes("Unauthorized") || 
                              text.includes("FORBIDDEN") ||
                              text.includes("HTTP_ERROR") ||
                              text.includes("LIMITED_NUMBER_OF_SERVICE_REQUESTS");

        if (response.status !== 200 || hasErrorString) {
          const bodySnippet = text.substring(0, 150).replace(/\s+/g, ' ').trim();
          console.warn(`[PROXY] V${idx+1} Fail - Status: ${response.status}, Body Snippet: ${bodySnippet}`);
        }

        const isErrorInBody = text.includes("<returnAuthMsg>HTTP_ERROR</returnAuthMsg>") || 
                             text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR") ||
                             text.includes("INVALID_REQUEST_PARAMETER_ERROR") ||
                             text.includes("Unauthorized") ||
                             text.includes("FORBIDDEN") ||
                             text.includes("API token") ||
                             text.includes("Access Denied") ||
                             (text.includes("<returnReasonCode>") && !['00', '0', 'OK', '1'].includes(text.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/)?.[1] || ''));

        const isHttpAuthError = response.status === 403 || response.status === 401;

        // Success condition: No error in body, not a 403/401, and got some data
        if (!isErrorInBody && !isHttpAuthError && text.trim().length > 20) {
          console.info(`[PROXY] V${idx+1} Success for ${apiBase.split('/').pop()}`);
          return { data: text, status: response.status };
        }
        
        lastError = isErrorInBody ? "Logic/Auth Error" : `HTTP ${response.status}`;
        
        if (response.status === 429 || text.includes("LIMITED_NUMBER_OF_SERVICE_REQUESTS")) {
           throw new Error("QUOTA_EXCEEDED");
        }
      } catch (error: any) {
        if (error.message === "QUOTA_EXCEEDED") throw error;
        lastError = error.message;
        console.warn(`[PROXY] V${idx+1} Critical Exception: ${lastError}`);
      }
      // Brief pause before trying next variation
      await new Promise(r => setTimeout(r, 200));
    }

    throw new Error(`All proxy attempts failed. Last status: ${lastStatus}. Error: ${lastError}`);
  };

  // Dedicated Weather API Proxy
  app.get("/api/weather/current", async (req, res) => {
    const { nx, ny, baseDate, baseTime } = req.query;
    try {
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst",
        {
          numOfRows: "1000",
          pageNo: "1",
          base_date: baseDate as string,
          base_time: baseTime as string,
          nx: nx as string,
          ny: ny as string,
          dataType: "JSON"
        }
      );
      
      try {
        res.json(JSON.parse(result.data));
      } catch (e) {
        res.json({ proxyError: true, error: "KMA_NON_JSON", debug: result.data.substring(0, 100) });
      }
    } catch (error: any) {
      console.error("[PROXY] KMA Current Failed:", error.message);
      res.json({ proxyError: true, error: (error.message === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "KMA_FETCH_FAILED"), detail: error.message });
    }
  });

  app.get("/api/weather/forecast", async (req, res) => {
    const { nx, ny, baseDate, baseTime } = req.query;
    try {
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst",
        {
          numOfRows: "1000",
          pageNo: "1",
          base_date: baseDate as string,
          base_time: baseTime as string,
          nx: nx as string,
          ny: ny as string,
          dataType: "JSON"
        }
      );
      try {
        res.json(JSON.parse(result.data));
      } catch (e) {
        res.json({ proxyError: true, error: "KMA_FCST_NON_JSON", debug: result.data.substring(0, 100) });
      }
    } catch (error: any) {
      console.error("[PROXY] KMA Forecast Failed:", error.message);
      res.json({ proxyError: true, error: (error.message === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "KMA_FCST_FAILED"), detail: error.message });
    }
  });

  app.get("/api/weather/air", async (req, res) => {
    const { stationName } = req.query;
    try {
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty",
        {
          returnType: "json",
          numOfRows: "1",
          pageNo: "1",
          stationName: stationName as string,
          dataTerm: "DAILY",
          ver: "1.3"
        }
      );
      try {
        res.json(JSON.parse(result.data));
      } catch (e) {
        res.json({ proxyError: true, error: "AIR_KOREA_NON_JSON", debug: result.data.substring(0, 100) });
      }
    } catch (error: any) {
      console.error("[PROXY] AirKorea Failed:", error.message);
      res.json({ 
        proxyError: true, 
        error: (error.message === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "AIR_KOREA_FAILED"),
        detail: error.message
      });
    }
  });

  app.get("/api/weather/air-forecast", async (req, res) => {
    const { searchDate, informCode } = req.query;
    try {
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth",
        {
          returnType: "json",
          numOfRows: "100",
          pageNo: "1",
          searchDate: searchDate as string,
          informCode: informCode as string
        }
      );
      try {
        res.json(JSON.parse(result.data));
      } catch (e) {
        res.json({ proxyError: true, error: "AIR_KOREA_FCST_NON_JSON", debug: result.data.substring(0, 100) });
      }
    } catch (error: any) {
      console.error("[PROXY] AirKorea Forecast Failed:", error.message);
      res.json({ 
        proxyError: true, 
        error: (error.message === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "AIR_KOREA_FCST_FAILED"),
        detail: error.message
      });
    }
  });

  app.get("/api/weather/village-forecast", async (req, res) => {
    const { nx, ny, baseDate, baseTime } = req.query;
    try {
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
        {
          numOfRows: "2000",
          pageNo: "1",
          base_date: baseDate as string,
          base_time: baseTime as string,
          nx: nx as string,
          ny: ny as string,
          dataType: "JSON"
        },
        15000
      );
      try {
        res.json(JSON.parse(result.data));
      } catch (e) {
        res.json({ proxyError: true, error: "KMA_VILAGE_FCST_NON_JSON", debug: result.data.substring(0, 100) });
      }
    } catch (error: any) {
      console.error("[PROXY] KMA Village Failed:", error.message);
      res.json({ 
        proxyError: true, 
        error: (error.message === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "KMA_VILAGE_FCST_FAILED"),
        detail: error.message
      });
    }
  });

  app.get("/api/weather/version", async (req, res) => {
    const { ftype, basedatetime } = req.query;
    try {
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getFcstVersion",
        {
          numOfRows: "1",
          pageNo: "1",
          ftype: ftype as string,
          basedatetime: basedatetime as string,
          dataType: "JSON"
        }
      );
      try {
        res.json(JSON.parse(result.data));
      } catch (e) {
        res.json({ proxyError: true, error: "KMA_VERSION_NON_JSON", debug: result.data.substring(0, 100) });
      }
    } catch (error: any) {
      console.error("[PROXY] KMA Version Failed:", error.message);
      res.json({ 
        proxyError: true, 
        error: (error.message === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "KMA_VERSION_FAILED"),
        detail: error.message
      });
    }
  });

  app.get("/api/weather/sun", async (req, res) => {
    // Coordinates for Wonju Jijeong-myeon: 37.38, 127.87
    const lat = 37.3822;
    const lng = 127.8711;
    const { locdate } = req.query; // format: YYYYMMDD
    
    try {
      const dateStr = locdate ? `${(locdate as string).substring(0, 4)}-${(locdate as string).substring(4, 6)}-${(locdate as string).substring(6, 8)}` : 'today';
      const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateStr}&formatted=0`;
      
      const response = await fetch(url);
      const data = await response.json() as any;

      if (data.status === "OK") {
        const results = data.results;
        
        // Convert ISO strings (UTC) to KST (UTC+9)
        const toKST = (iso: string) => {
          const date = new Date(iso);
          // Add 9 hours for KST
          const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
          return `${String(kstDate.getHours()).padStart(2, '0')}:${String(kstDate.getMinutes()).padStart(2, '0')}`;
        };

        res.json({ 
          sunrise: toKST(results.sunrise), 
          sunset: toKST(results.sunset) 
        });
      } else {
        res.json({ sunrise: null, sunset: null });
      }
    } catch (error: any) {
      console.error("[PROXY] Sunrise-Sunset API Failed:", error.message);
      res.json({ sunrise: null, sunset: null });
    }
  });

  app.get("/api/weather/mid-land", async (req, res) => {
    const { regId, tmFc } = req.query;
    try {
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst",
        {
          numOfRows: "1",
          pageNo: "1",
          regId: regId as string,
          tmFc: tmFc as string,
          dataType: "JSON"
        },
        15000
      );
      try {
        res.json(JSON.parse(result.data));
      } catch (e) {
        res.json({ proxyError: true, error: "MID_LAND_NON_JSON", debug: result.data.substring(0, 100) });
      }
    } catch (error: any) {
      console.error("[PROXY] Mid Land Failed:", error.message);
      res.json({ proxyError: true, error: (error.message === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "MID_LAND_FAILED"), detail: error.message });
    }
  });

  app.get("/api/weather/mid-temp", async (req, res) => {
    const { regId, tmFc } = req.query;
    try {
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa",
        {
          numOfRows: "1",
          pageNo: "1",
          regId: regId as string,
          tmFc: tmFc as string,
          dataType: "JSON"
        },
        15000
      );
      try {
        res.json(JSON.parse(result.data));
      } catch (e) {
        res.json({ proxyError: true, error: "MID_TEMP_NON_JSON", debug: result.data.substring(0, 100) });
      }
    } catch (error: any) {
      console.error("[PROXY] Mid Temp Failed:", error.message);
      res.json({ proxyError: true, error: (error.message === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "MID_TEMP_FAILED"), detail: error.message });
    }
  });

  app.get("/api/weather/version", async (req, res) => {
    const { ftype, basedatetime } = req.query;
    try {
      const result = await fetchDataGoKr(
        "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getFcstVersion",
        {
          numOfRows: "1",
          pageNo: "1",
          ftype: ftype as string,
          basedatetime: basedatetime as string,
          dataType: "JSON"
        }
      );
      try {
        res.json(JSON.parse(result.data));
      } catch (e) {
         res.json({ proxyError: true, error: "KMA_VER_NON_JSON", debug: result.data.substring(0, 100) });
      }
    } catch (error: any) {
      res.json({ proxyError: true, error: (error.message === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "KMA_VER_FAILED"), detail: error.message });
    }
  });

  app.get("/api/weather/uv", async (req, res) => {
    const { areaNo, time } = req.query;
    // Try V5 first, then V4 if V5 fails with 404
    const endpoints = [
      "http://apis.data.go.kr/1360000/LivingWthrIdxServiceV5/getUVIdxV5",
      "http://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV5",
      "http://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV4",
      "http://apis.data.go.kr/1360000/LivingWthrIdxService/getUVIdxV5"
    ];

    let lastError: any = null;
    for (const url of endpoints) {
      try {
        console.log(`[PROXY] Trying UV Endpoint: ${url}`);
        const result = await fetchDataGoKr(
          url,
          {
            areaNo: (areaNo as string) ?? "5113033000",
            time: time as string,
            dataType: "JSON"
          }
        );

        const text = result.data.trim();
        const isActuallyJSON = (text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'));
        
        if (isActuallyJSON) {
          return res.json(JSON.parse(text));
        } else {
          console.warn(`[PROXY] UV Endpoint ${url} returned non-JSON: ${text.substring(0, 50)}`);
          lastError = new Error("NON_JSON_RETURNED");
          continue; // Try next endpoint
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`[PROXY] UV Endpoint ${url} Failed: ${error.message}`);
        // If it's a 404, we try the next one.
        // But our fetchDataGoKr throws an aggregated error.
        if (error.message.includes("404")) continue;
        break; // Other errors (quota, auth) shouldn't be retried with different endpoints
      }
    }
    
    console.error("[PROXY] All KMA UV Endpoints Failed.");
    res.json({ proxyError: true, error: "UV_FETCH_FAILED", detail: lastError?.message });
  });

  app.get("/api/golf/green-speed", async (req, res) => {
    try {
      const baseUrl = "https://oapi.hdc-resort.com/golfapi/V1/golfcommon/companies";
      const params = "addAttr=M&bsnsCode=11&langTypeCode=KOR&propertyNo=61&systemId=HDCWINGS";
      const url = `${baseUrl}?${params}`;
      
      const response = await axios.get(url, {
        headers: {
          "accept": "*/*",
          "API-KEY": "$2a$12$8p714ufRLNQUMVktAkSPPu2vE/X9MPP65leur.VWurR7pIuir83Qu",
          "VENDOR_ID": "GOLFPRECHECKIN"
        }
      });
      
      res.json(response.data);
    } catch (error: any) {
      console.error("[PROXY] Golf Green Speed Failed:", error.message);
      res.status(500).json({ error: "Failed to fetch green speed", detail: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
