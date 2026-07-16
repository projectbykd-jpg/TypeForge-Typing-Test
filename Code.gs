/**
 * ========================================
 * GOOGLE APPS SCRIPT - DAY GROUP PANEL
 * ========================================
 * Lottery Panel Management System
 * Version: 1.0
 * Created for Day-Group
 * 
 * Features:
 * - User Authentication
 * - Real-time Lottery Results Processing
 * - Multi-platform Delivery (Telegram, LinkTree, Panel-Z)
 * - Activity Logging
 * ========================================
 */

/**
 * Main entry point - serves the HTML UI
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('🤖 Day-Group PANEL')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ========== AUTHENTICATION & LOGGING ==========
 */

/**
 * Validate user login credentials
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Object} {success: boolean, user: string, message: string}
 */
function checkLogin(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Users");
  const userData = userSheet.getDataRange().getValues();
  
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] == username && userData[i][1] == password) {
      return { success: true, user: username };
    }
  }
  return { success: false, message: "Username atau Password Salah!" };
}

/**
 * Log user activities to individual sheets
 * @param {string} username - User who performed action
 * @param {string} action - Action name
 * @param {string} keterangan - Action description
 * @returns {boolean} Success status
 */
function logActivity(username, action, keterangan) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "History User ( " + username + " )";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Tanggal / Waktu", "Action", "Keterangan"]);
    sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#cfe2f3");
  }

  var waktuLokal = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
  sheet.appendRow([waktuLokal, action, keterangan]);
  sheet.autoResizeColumns(1, 3);
  return true;
}

/**
 * ========== TEXT PROCESSING ==========
 */

/**
 * Process raw text input and extract lottery results
 * @param {string} text - Raw result text
 * @returns {Object} Parsed result data
 */
function processText(text) {
  try {
    if (!text || text.length < 5) return createEmptyResponse();
    
    const marketMatch = text.match(/Pasaran\s+(.*)/i);
    const market = marketMatch ? marketMatch[1].trim() : 'UNKNOWN';
    const prize1 = ((text.match(/Prize\s*1[^0-9]*(\d{4})/i) || [])[1] || '');
    
    if (!prize1) return { market, status: 'SALAH', shio: '', twoDigit: '', output: '', prize1: '', prize2: '', prize3: '' };
    
    const prize2 = ((text.match(/Prize\s*2[^0-9]*(\d{4})/i) || [])[1] || '');
    const prize3 = ((text.match(/Prize\s*3[^0-9]*(\d{4})/i) || [])[1] || '');
    const twoDigit = Number(prize1.slice(-2));
    const shio = getShio(twoDigit);
    const shioInput = ((text.match(/Shio\s*:\s*([A-Z]+)/i) || [])[1] || '').toUpperCase();
    const status = shioInput ? (shioInput === shio ? 'BENAR' : 'SALAH') : 'BENAR';

    let output = text.trim();
    output = output.replace(/Prize\s*1\s*:/gi, 'Prize 1️⃣ :').replace(/Prize\s*2\s*:/gi, 'Prize 2️⃣ :').replace(/Prize\s*3\s*:/gi, 'Prize 3️⃣ :');
    if (/Shio\s*:/i.test(output)) { output = output.replace(/Shio\s*:.*$/im, 'Shio : ' + shio); } else { output += '\n\nShio : ' + shio; }
    output = output.replace(/Selamat kepada para pemenang jackpot\s*\.?/i, 'Selamat kepada para pemenang jackpot 🙏🏻');

    return { market, status, shio, twoDigit, output, prize1, prize2, prize3 };
  } catch (e) { return createEmptyResponse(); }
}

/**
 * Create empty/default response object
 * @returns {Object} Empty result data
 */
function createEmptyResponse() {
  return { market: 'UNKNOWN', status: 'SALAH', shio: '', twoDigit: '', output: '', prize1: '', prize2: '', prize3: '' };
}

/**
 * Get animal zodiac (Shio) from number
 * @param {number} num - Number to convert
 * @returns {string} Animal zodiac name
 */
function getShio(num) {
  const map = {
    1:"KUDA",13:"KUDA",25:"KUDA",37:"KUDA",49:"KUDA",61:"KUDA",73:"KUDA",85:"KUDA",97:"KUDA",
    2:"ULAR",14:"ULAR",26:"ULAR",38:"ULAR",50:"ULAR",62:"ULAR",74:"ULAR",86:"ULAR",98:"ULAR",
    3:"NAGA",15:"NAGA",27:"NAGA",39:"NAGA",51:"NAGA",63:"NAGA",75:"NAGA",87:"NAGA",99:"NAGA",
    4:"KELINCI",16:"KELINCI",28:"KELINCI",40:"KELINCI",52:"KELINCI",64:"KELINCI",76:"KELINCI",88:"KELINCI",0:"KELINCI",
    5:"HARIMAU",17:"HARIMAU",29:"HARIMAU",41:"HARIMAU",53:"HARIMAU",65:"HARIMAU",77:"HARIMAU",89:"HARIMAU",
    6:"KERBAU",18:"KERBAU",30:"KERBAU",42:"KERBAU",54:"KERBAU",66:"KERBAU",78:"KERBAU",90:"KERBAU",
    7:"TIKUS",19:"TIKUS",31:"TIKUS",43:"TIKUS",55:"TIKUS",67:"TIKUS",79:"TIKUS",91:"TIKUS",
    8:"BABI",20:"BABI",32:"BABI",44:"BABI",56:"BABI",68:"BABI",80:"BABI",92:"BABI",
    9:"ANJING",21:"ANJING",33:"ANJING",45:"ANJING",57:"ANJING",69:"ANJING",81:"ANJING",93:"ANJING",
    10:"AYAM",22:"AYAM",34:"AYAM",46:"AYAM",58:"AYAM",70:"AYAM",82:"AYAM",94:"AYAM",
    11:"MONYET",23:"MONYET",35:"MONYET",47:"MONYET",59:"MONYET",71:"MONYET",83:"MONYET",95:"MONYET",
    12:"KAMBING",24:"KAMBING",36:"KAMBING",48:"KAMBING",60:"KAMBING",72:"KAMBING",84:"KAMBING",96:"KAMBING"
  };
  return map[num] || "UNKNOWN";
}

/**
 * ========== ACCOUNT MANAGEMENT ==========
 */

/**
 * Get social media account credentials by website name
 * @param {string} websiteName - Website/platform name
 * @returns {Object} Account credentials for all platforms
 */
function getAkunByWebsite(websiteName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Akun Sosmed");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (
      data[i][0] &&
      data[i][0].toString().toUpperCase() ===
      websiteName.toString().toUpperCase()
    ) {
      return {
        TELEGRAM: {
          TOKEN: data[i][1],
          CHAT_ID: data[i][2]
        },
        LINKTREE: {
          EMAIL: data[i][3],
          PASS: data[i][4]
        },
        PANELZ: {
          USERNAME: data[i][5],
          PASSWORD: data[i][6],
          USERNAME2: data[i][7],
          PASSWORD2: data[i][8],
          URL: data[i][9]
        }
      };
    }
  }
  return null;
}

/**
 * ========== MULTI-PLATFORM SENDING ==========
 */

/**
 * Send results to all configured platforms
 * @param {string} rawText - Raw result text
 * @param {string} username - User sending results
 * @returns {Object} Status from each platform
 */
function sendAllSystems(rawText, username) {
  Logger.log("USERNAME = " + username);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Users");
  const userData = userSheet.getDataRange().getValues();

  let websites = [];
  let telegramChecked = false;
  let linktreeChecked = false;
  let panelzChecked = false;

  // Get user data
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] === username) {
      websites = String(userData[i][2])
        .split(",")
        .map(x => x.trim())
        .filter(x => x);

      telegramChecked = userData[i][3] === true;
      linktreeChecked = userData[i][4] === true;
      panelzChecked = userData[i][5] === true;
      break;
    }
  }

  if (websites.length === 0) {
    return {
      telegram: "User tidak ditemukan",
      linktree: "-",
      panelz: "-"
    };
  }

  let telegramStatus = "Tidak Dicentang";
  let linktreeStatus = "Tidak Dicentang";
  let panelzStatus = "Tidak Dicentang";

  // Process all websites for this user
  for (const website of websites) {
    Logger.log("PROCESS WEBSITE = " + website);

    const acc = getAkunByWebsite(website);
    if (!acc) {
      Logger.log("Konfigurasi tidak ditemukan : " + website);
      continue;
    }

    if (telegramChecked) {
      telegramStatus = sendToTelegram(rawText, acc.TELEGRAM);
    }

    if (linktreeChecked) {
      linktreeStatus = sendToAWS(rawText, acc.LINKTREE);
    }

    if (panelzChecked) {
      panelzStatus = sendToPanelZ(rawText, acc.PANELZ);
    }
  }

  return {
    telegram: telegramStatus,
    linktree: linktreeStatus,
    panelz: panelzStatus
  };
}

/**
 * ========== TELEGRAM INTEGRATION ==========
 */

/**
 * Send formatted message to Telegram
 * @param {string} rawText - Raw result text
 * @param {Object} teleCfg - Telegram configuration
 * @returns {string} Status message
 */
function sendToTelegram(rawText, teleCfg) {
  try {
    const pasaran = rawText.match(/Pasaran\s+(.+)/i) || rawText.match(/Hasil Pengeluaran Pasaran\s+(.+)/i);
    const p1 = rawText.match(/Prize\s*1.*?(\d+)/i);
    const p2 = rawText.match(/Prize\s*2.*?(\d+)/i);
    const p3 = rawText.match(/Prize\s*3.*?(\d+)/i);
    const shio = rawText.match(/Shio\s*:\s*(.+)/i);

    const d = new Date();
    const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const bulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const formatWaktu = `Hari ${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;

    let msg = `Hasil Pengeluaran Pasaran ${pasaran ? pasaran[1].trim().toUpperCase() : "-"}\n`;
    msg += `${formatWaktu}\n\n`;
    if (p1) msg += `Prize 1️⃣ : ${p1[1]}\n`;
    if (p2) msg += `Prize 2️⃣ : ${p2[1]}\n`;
    if (p3) msg += `Prize 3️⃣ : ${p3[1]}\n`;
    if (shio) msg += `Shio : ${shio[1].trim().toUpperCase()}\n\n`;
    msg += "Selamat kepada para pemenang jackpot 🙏🏻";

    const url = `https://api.telegram.org/bot${teleCfg.TOKEN}/sendMessage`;
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      payload: {
        chat_id: String(teleCfg.CHAT_ID).trim(),
        text: msg
      },
      muteHttpExceptions: true
    });

    const body = response.getContentText();
    Logger.log("TELEGRAM RESPONSE = " + body);

    if (response.getResponseCode() !== 200) {
      return "Tele Error: " + body;
    }

    return "Terkirim";
  } catch (e) { return "Tele Error: " + e.message; }
}

/**
 * ========== AWS/LINKTREE INTEGRATION ==========
 */

/**
 * Login to AWS/LinkTree system
 * @param {Object} config - AWS login configuration
 * @returns {string} Session cookie or error message
 */
function loginAWS(config) {
  try {
    const response = UrlFetchApp.fetch(
      "http://ec2-13-250-131-148.ap-southeast-1.compute.amazonaws.com:8069/index",
      {
        method: "post",
        payload: {
          email: config.EMAIL,
          password: config.PASS
        },
        muteHttpExceptions: true,
        followRedirects: false
      }
    );

    Logger.log("EMAIL = " + config.EMAIL);
    Logger.log("LOGIN CODE = " + response.getResponseCode());

    const headers = response.getAllHeaders();
    Logger.log("LOGIN HEADERS = " + JSON.stringify(headers));

    let cookies = headers["Set-Cookie"] || headers["set-cookie"];

    if (!cookies) {
      return "Error: Cookie tidak ditemukan";
    }

    if (!Array.isArray(cookies)) {
      cookies = [cookies];
    }

    const sessionCookie = cookies
      .map(cookie => cookie.split(";")[0])
      .join("; ");

    Logger.log("SESSION COOKIE = " + sessionCookie);
    return sessionCookie;
  } catch (e) {
    return "Error: " + e.message;
  }
}

/**
 * Send result to AWS/LinkTree
 * @param {string} rawText - Raw result text
 * @param {Object} linktreeCfg - LinkTree configuration
 * @returns {string} Status message
 */
function sendToAWS(rawText, linktreeCfg) {
  try {
    const sessionCookie = loginAWS(linktreeCfg);

    if (typeof sessionCookie === "string" && sessionCookie.startsWith("Error:")) {
      return sessionCookie;
    }

    const pasaranMatch = rawText.match(/Pasaran\s+(.+)/i);
    const titleText = "Hasil Pengeluaran Pasaran " + (pasaranMatch ? pasaranMatch[1].trim() : "BULLSEYE");

    const p1 = rawText.match(/Prize 1\s*:\s*(\d+)/i);
    const p2 = rawText.match(/Prize 2\s*:\s*(\d+)/i);
    const p3 = rawText.match(/Prize 3\s*:\s*(\d+)/i);

    let msgArr = [];
    if (p1) msgArr.push("🅿️1️⃣ : " + p1[1]);
    if (p2) msgArr.push("🅿️2️⃣ : " + p2[1]);
    if (p3) msgArr.push("🅿️3️⃣ : " + p3[1]);

    const payload = {
      apikey: "bbd53ebb-ba2b-11ec-9377-f2937b475656",
      title: titleText,
      body: msgArr.join("  ")
    };

    Logger.log("SESSION = " + sessionCookie);
    Logger.log("PAYLOAD = " + JSON.stringify(payload));

    const response = UrlFetchApp.fetch(
      "http://ec2-13-250-131-148.ap-southeast-1.compute.amazonaws.com:8069/notif_send_post",
      {
        method: "post",
        headers: { Cookie: sessionCookie },
        payload: payload,
        muteHttpExceptions: true,
        followRedirects: false
      }
    );

    const code = response.getResponseCode();
    const responseBody = response.getContentText();

    Logger.log("POST CODE = " + code);
    Logger.log("POST BODY = " + responseBody);

    if (responseBody.indexOf("LinkTree System") > -1) {
      return "Session Login Gagal";
    }

    if (code === 200 || code === 302) {
      return "Terkirim";
    }

    return "Gagal (" + code + ")";
  } catch (e) {
    return "Error: " + e.message;
  }
}

/**
 * ========== PANEL-Z INTEGRATION ==========
 */

/**
 * Login to Panel-Z system
 * @param {Object} panelCfg - Panel-Z configuration
 * @returns {Object|string} Session data or error message
 */
function loginPanelZ(panelCfg) {
  try {
    const basicAuth =
      "Basic " +
      Utilities.base64Encode(
        panelCfg.USERNAME +
        ":" +
        panelCfg.PASSWORD
      );

    const response = UrlFetchApp.fetch(
      panelCfg.URL + "/assets/sys-tmbet/authentication.php",
      {
        method: "post",
        headers: { Authorization: basicAuth },
        payload: {
          username: panelCfg.USERNAME2,
          password: panelCfg.PASSWORD2
        },
        muteHttpExceptions: true,
        followRedirects: false
      }
    );

    const headers = response.getAllHeaders();
    let cookie = headers["Set-Cookie"] || headers["set-cookie"];

    if (!cookie) {
      return "Error: PHPSESSID tidak ditemukan";
    }

    if (Array.isArray(cookie)) {
      cookie = cookie[0];
    }

    const match = cookie.match(/PHPSESSID=[^;]+/);

    if (!match) {
      return "Error: Session gagal";
    }

    return {
      basicAuth: basicAuth,
      cookie: match[0]
    };
  } catch (e) {
    return "Error: " + e.message;
  }
}

/**
 * Get Panel-Z row ID for market
 * @param {Object} sessionData - Session information
 * @param {Object} panelCfg - Panel-Z configuration
 * @param {string} market - Market name
 * @returns {string|null} Row ID or null
 */
function getPanelRowAuto(sessionData, panelCfg, market) {
  try {
    const response = UrlFetchApp.fetch(
      panelCfg.URL + "/dashboard.php?hal=result",
      {
        headers: {
          Authorization: sessionData.basicAuth,
          Cookie: sessionData.cookie
        },
        muteHttpExceptions: true
      }
    );

    const html = response.getContentText();
    const marketKey = convertMarketToPanel(market);

    if (!marketKey) {
      return null;
    }

    const regex = new RegExp(
      marketKey + "[\\s\\S]{0,500}?" + "update-resultlotto\\.php\\?row=(\\d+)",
      "i"
    );

    const match = html.match(regex);
    return match ? match[1] : null;
  } catch (e) {
    Logger.log("ROW ERROR = " + e.message);
    return null;
  }
}

/**
 * Convert market name to Panel-Z format
 * @param {string} market - Market name
 * @returns {string|null} Panel-Z market key
 */
function convertMarketToPanel(market) {
  const map = {
    "ATHENS":"athens",
    "AUSTRIA":"austria",
    "BAHRAIN":"bahrain",
    "BERLIN":"berlin",
    "BULLSEYE":"bullseye",
    "BUSAN":"busan",
    "CAIRO":"cairo",
    "CALIFORNIA":"california",
    "CAROLINADAY":"carolina-day",
    "CAROLINAEVE":"carolina-eve",
    "COLORADO":"colorado",
    "DALLAS":"dallas",
    "FLORIDAEVE":"florida-eve",
    "FLORIDAMID":"florida-mid",
    "HK SIANG":"hk-siang",
    "HONGKONG":"hongkong",
    "IDAHO":"idaho",
    "INDIA MORNING":"india-mor",
    "INDIA":"india-night",
    "KANSAS":"kansas",
    "KENTUCKYEVE":"kentucky-eve",
    "KENTUCKYMID":"kentucky-mid",
    "KHMER LOTTO":"khmer-lotto",
    "LAOS MALAM":"laos-malam",
    "LAOS SIANG":"laos-siang",
    "LISBON":"lisbon-mor",
    "LISBON NIGHT":"lisbon-night",
    "MALAYSIA":"malaysia",
    "NEW MEXICO":"mexico-day",
    "MEXICO":"mexico-night",
    "MICHIGAN":"michigan",
    "MONTANA":"montana",
    "NEBRASKA":"nebraska",
    "NEWYORKEVE":"newyork-eve",
    "NEWYORKMID":"newyork-mid",
    "NIPPON LOTTO":"nippon-lotto",
    "OHIO":"ohio",
    "OREGON12":"oregon12",
    "OREGON03":"oregon3",
    "OREGON06":"oregon6",
    "OREGON09":"oregon9",
    "OSAKA":"osaka",
    "PANAMA":"panama",
    "PARIS":"paris",
    "PARMA":"parma",
    "ROMA":"roma",
    "RUSIA":"rusia",
    "SAPPORO EVE":"sapporo-eve",
    "SAPPORO":"sapporo-mid",
    "SINGAPORE":"singapore",
    "SYDNEY":"sydney",
    "TAIPEI LOTTO":"taipei-lotto",
    "THAILAND":"thailand",
    "TIONGKOK 4D":"tiongkok-4D",
    "TURKEY":"turkey",
    "TOTOMACAU-13":"totomacau-13",
    "TOTOMACAU-16":"totomacau-16",
    "TOTOMACAU-19":"totomacau-19",
    "TOTOMACAU-22":"totomacau-22",
    "TOTOMACAU-23":"totomacau-23",
    "TOTOMACAU-00":"totomacau-00",
    "TOTOMACAU-15-5D":"totomacau-15-5d",
    "TOTOMACAU-21-5D":"totomacau-21-5d"
  };
  return map[market.toUpperCase()] || null;
}

/**
 * Send result to Panel-Z
 * @param {string} rawText - Raw result text
 * @param {Object} panelCfg - Panel-Z configuration
 * @returns {string} Status message
 */
function sendToPanelZ(rawText, panelCfg) {
  try {
    Logger.log("=== PANEL Z START ===");
    Logger.log("RAWTEXT = " + rawText);

    if (!rawText) {
      return "rawText kosong atau undefined";
    }

    const marketMatch = rawText.match(/Pasaran\s+(.+)/i) || rawText.match(/Hasil Pengeluaran Pasaran\s+(.+)/i);
    const prize1Match = rawText.match(/Prize\s*1\s*[:\-]?\s*(\d+)/i);

    if (!marketMatch) {
      return "Pasaran tidak ditemukan";
    }

    if (!prize1Match) {
      return "Prize 1 tidak ditemukan";
    }

    const market = marketMatch[1].trim().toUpperCase();
    const prize1 = prize1Match[1];

    const sessionCookie = loginPanelZ(panelCfg);

    if (typeof sessionCookie === "string" && sessionCookie.startsWith("Error:")) {
      return sessionCookie;
    }

    const rowId = getPanelRowAuto(sessionCookie, panelCfg, market);

    if (!rowId) {
      return "Row tidak ditemukan : " + market;
    }

    Logger.log("MARKET = " + market);
    Logger.log("ROW ID = " + rowId);
    Logger.log("PRIZE1 = " + prize1);
    Logger.log("AUTH = " + sessionCookie.basicAuth);
    Logger.log("COOKIE = " + sessionCookie.cookie);

    const response = UrlFetchApp.fetch(
      panelCfg.URL + "/config/update-resultlotto.php?row=" + rowId,
      {
        method: "post",
        headers: {
          Authorization: sessionCookie.basicAuth,
          Cookie: sessionCookie.cookie
        },
        payload: { updangka: prize1 },
        muteHttpExceptions: true,
        followRedirects: false
      }
    );

    const code = response.getResponseCode();
    const body = response.getContentText();

    Logger.log("PANEL CODE = " + code);
    Logger.log("PANEL BODY = " + body);

    if (code === 200 || code === 302) {
      return "Terkirim";
    }

    return "Gagal (" + code + ")";
  } catch (e) {
    Logger.log("PANEL Z ERROR = " + e);
    return "Error: " + e.message;
  }
}

/**
 * Send Totomacau result to Panel-Z
 * @param {string} market - Market name
 * @param {string} angka - Number result
 * @param {string} username - User sending result
 * @returns {string} Status message
 */
function sendTotomacauToPanelZ(market, angka, username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Users");
  const userData = userSheet.getDataRange().getValues();

  let websites = [];

  for(let i = 1; i < userData.length; i++) {
    if(userData[i][0] == username) {
      websites = String(userData[i][2])
        .split(",")
        .map(x => x.trim());
      break;
    }
  }

  let lastResult = "";

  for(const website of websites) {
    const acc = getAkunByWebsite(website);
    if(!acc) continue;

    lastResult = sendCustomPanelZ(market, angka, acc.PANELZ);
  }

  return lastResult || "Website tidak ditemukan";
}

/**
 * Send custom data to Panel-Z
 * @param {string} market - Market name
 * @param {string} angka - Number result
 * @param {Object} panelCfg - Panel-Z configuration
 * @returns {string} Status message
 */
function sendCustomPanelZ(market, angka, panelCfg) {
  try {
    const session = loginPanelZ(panelCfg);

    if(typeof session === "string") {
      return session;
    }

    const rowId = getPanelRowAuto(session, panelCfg, market);

    if(!rowId) {
      return "Row tidak ditemukan";
    }

    Logger.log("=== CUSTOM PANEL ===");
    Logger.log("MARKET = " + market);
    Logger.log("ANGKA = " + angka);
    Logger.log("ROW ID = " + rowId);
    
    const response = UrlFetchApp.fetch(
      panelCfg.URL + "/config/update-resultlotto.php?row=" + rowId,
      {
        method:"post",
        headers:{
          Authorization: session.basicAuth,
          Cookie: session.cookie
        },
        payload:{ updangka: angka },
        muteHttpExceptions:true
      }
    );

    const code = response.getResponseCode();
    const body = response.getContentText();

    Logger.log("CUSTOM PANEL CODE = " + code);
    Logger.log("CUSTOM PANEL BODY = " + body);

    if(code == 200 || code == 302) {
      return "Berhasil dikirim";
    }

    return "Gagal (" + code + ")";
  } catch(e) {
    return "Error : " + e.message;
  }
}

/**
 * Send Totomacau to Panel-Z only
 * @param {string} market - Market name
 * @param {string} angka - Number result
 * @param {string} currentUser - Current user
 * @returns {Object} Status object
 */
function sendToPanelZOnly(market, angka, currentUser) {
  const result = sendTotomacauToPanelZ(market, angka, currentUser);

  return {
    success: result.indexOf("Berhasil") > -1,
    message: result
  };
}