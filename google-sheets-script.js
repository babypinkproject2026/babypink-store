/**
 * ============================================================================
 * Google Apps Script สำหรับร้าน BabyPink Store (เชื่อมต่อ Google Sheets 3 ระบบ)
 * 1. คำสั่งซื้อสินค้า (Orders)
 * 2. รีวิวความประทับใจจากลูกค้า (Customer Reviews)
 * 3. ข้อความติดต่อจากคุณพ่อคุณแม่ (Contact Messages)
 * ============================================================================
 * 
 * ⚠️ ทำไมเอาโค้ดใหม่ไปวางแล้ว "ไม่เห็นติด" หรือไม่มีอะไรเปลี่ยน?
 * ใน Google Apps Script การกด "บันทึก" (Ctrl+S) เพียงอย่างเดียว Web App จะ *ยังจำโค้ดเวอร์ชันเก่า* อยู่
 * คุณต้องทำการอัปเดตเวอร์ชันการเผยแพร่ด้วยตาม 3 ขั้นตอนง่ายๆ ด้านล่างนี้ครับ:
 * 
 * ----------------------------------------------------------------------------
 * 📌 วิธีทำให้โค้ดใหม่ "ติด" และใช้งานได้ 100% (ทำเพียง 1 นาที):
 * ----------------------------------------------------------------------------
 * 1. วางโค้ดทั้งหมดนี้แทนที่ใน Apps Script แล้วกดปุ่ม 💾 "บันทึก" (Ctrl + S)
 * 
 * 2. [สร้าง 3 แผ่นงานทันที]:
 *    - ที่เมนูด้านบน มองหาช่องดรอปดาวน์เลือกฟังก์ชัน แล้วเลือก "initialSetup"
 *    - กดปุ่ม "เรียกใช้" (Run)
 *    - (หากมีกล่องถามสิทธิ์ ให้กด "ตรวจสอบสิทธิ์" > เลือกอีเมล > ขั้นสูง > ไปที่... > อนุญาต)
 *    👉 ผลลัพธ์: แท็บ "คำสั่งซื้อ", "รีวิวลูกค้า", และ "ข้อความติดต่อ" จะถูกสร้างขึ้นในชีททันที!
 * 
 * 3. [อัปเดต Web App ให้ใช้โค้ดใหม่ - จุดสำคัญที่สุด]:
 *    - กดปุ่มสีน้ำเงินมุมขวาบน "ทำให้ใช้งานได้" (Deploy) > เลือก "จัดการการทำให้ใช้งานได้" (Manage deployments)
 *    - ตรงรายการ Web app ให้กดที่รูป ✏️ "แก้ไข" (Edit)
 *    - ตรงช่อง "เวอร์ชัน" (Version) ให้คลิกแล้วเลือก "เวอร์ชันใหม่" (New version)  <-- *จุดสำคัญที่สุด*
 *    - ตรวจสอบว่า "ผู้ที่มีสิทธิ์เข้าถึง" (Who has access) เป็น "ทุกคน" (Anyone)
 *    - กดปุ่ม "ทำให้ใช้งานได้" (Deploy) แล้วกด "เสร็จสิ้น"
 *    👉 ผลลัพธ์: เว็บไซต์จะเชื่อมต่อกับโค้ดใหม่ทันที โดยไม่ต้องเปลี่ยน Webhook URL เลยครับ!
 * ============================================================================
 */

// ชื่อแผ่นงานทั้ง 3 ระบบ
const SHEET_ORDERS = "คำสั่งซื้อ";
const SHEET_REVIEWS = "รีวิวลูกค้า";
const SHEET_CONTACT = "ข้อความติดต่อ";

// สถานะการจัดส่ง 4 สถานะตามขั้นตอนจริงของร้าน
const DELIVERY_STATUSES = [
  "รอตรวจสอบยอดเงิน",
  "จัดเตรียมสินค้า",
  "ส่งสินค้าให้ขนส่ง",
  "จัดส่งสำเร็จ"
];

// สถานะการติดต่อกลับ
const CONTACT_STATUSES = [
  "🟡 รอติดต่อกลับ",
  "🟢 ติดต่อแล้ว",
  "⚪ ปิดการติดต่อ"
];

// ระดับคะแนนดาวสำหรับรีวิว
const RATING_LIST = [
  "5 ดาว ⭐⭐⭐⭐⭐",
  "4 ดาว ⭐⭐⭐⭐",
  "3 ดาว ⭐⭐⭐",
  "2 ดาว ⭐⭐",
  "1 ดาว ⭐"
];

/**
 * ============================================================================
 * ฟังก์ชันสร้างและจัดรูปแบบแผ่นงานทั้ง 3 แท็บอัตโนมัติ (คลิกเดียวได้ครบทุกแท็บ)
 * ============================================================================
 */
function initialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. ตั้งค่าแผ่นงาน: คำสั่งซื้อ
  setupOrdersSheet(ss);

  // 2. ตั้งค่าแผ่นงาน: รีวิวลูกค้า
  setupReviewsSheet(ss);

  // 3. ตั้งค่าแผ่นงาน: ข้อความติดต่อ
  setupContactSheet(ss);

  Logger.log("✅ ตั้งค่าตาราง BabyPink Store ครบทั้ง 3 แผ่นงานเรียบร้อยแล้ว!");
}

/**
 * ตั้งค่าแผ่นงานคำสั่งซื้อ
 */
function setupOrdersSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ORDERS);
  }

  const headers = [
    "วันที่-เวลา",
    "รหัสคำสั่งซื้อ",
    "ชื่อลูกค้า",
    "เบอร์โทรศัพท์",
    "ที่อยู่จัดส่ง",
    "รายการสินค้าที่ซื้อ",
    "ยอดชำระสุทธิ (฿)",
    "ช่องทางชำระเงิน",
    "สถานะการจัดส่ง",
    "ลิงก์สลิปโอนเงิน"
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#ff4081"); // สีชมพูเอกลักษณ์ BabyPink
  headerRange.setFontColor("#ffffff");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 150); // วันที่
  sheet.setColumnWidth(2, 130); // Order ID
  sheet.setColumnWidth(3, 160); // ชื่อลูกค้า
  sheet.setColumnWidth(4, 130); // เบอร์โทร
  sheet.setColumnWidth(5, 260); // ที่อยู่
  sheet.setColumnWidth(6, 320); // รายการสินค้า
  sheet.setColumnWidth(7, 130); // ยอดชำระ
  sheet.setColumnWidth(8, 150); // ช่องทาง
  sheet.setColumnWidth(9, 160); // สถานะจัดส่ง (Dropdown)
  sheet.setColumnWidth(10, 160); // สลิป

  // Dropdown สถานะการจัดส่ง (คอลัมน์ I)
  const statusRange = sheet.getRange("I2:I5000");
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DELIVERY_STATUSES, true)
    .setAllowInvalid(false)
    .build();
  statusRange.setDataValidation(rule);

  sheet.getRange("A2:B5000").setHorizontalAlignment("center");
  sheet.getRange("D2:D5000").setHorizontalAlignment("center");
  sheet.getRange("G2:I5000").setHorizontalAlignment("center");
}

/**
 * ตั้งค่าแผ่นงานรีวิวลูกค้า
 */
function setupReviewsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_REVIEWS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_REVIEWS);
  }

  const headers = [
    "วันที่-เวลา",
    "ชื่อลูกค้า",
    "จังหวัด / พื้นที่",
    "คะแนนความพึงพอใจ",
    "สินค้าที่ซื้อ",
    "ข้อความรีวิว"
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#f472b6"); // ชมพูกุหลาบหวาน
  headerRange.setFontColor("#ffffff");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 160); // วันที่
  sheet.setColumnWidth(2, 160); // ชื่อลูกค้า
  sheet.setColumnWidth(3, 140); // จังหวัด
  sheet.setColumnWidth(4, 160); // คะแนนดาว
  sheet.setColumnWidth(5, 240); // สินค้า
  sheet.setColumnWidth(6, 400); // ข้อความรีวิว

  // Dropdown คะแนนดาว (คอลัมน์ D)
  const ratingRange = sheet.getRange("D2:D5000");
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(RATING_LIST, true)
    .setAllowInvalid(true)
    .build();
  ratingRange.setDataValidation(rule);

  sheet.getRange("A2:A5000").setHorizontalAlignment("center");
  sheet.getRange("C2:D5000").setHorizontalAlignment("center");
}

/**
 * ตั้งค่าแผ่นงานข้อความติดต่อ
 */
function setupContactSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_CONTACT);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CONTACT);
  }

  const headers = [
    "วันที่-เวลา",
    "ชื่อคุณพ่อ/คุณแม่",
    "เบอร์โทรศัพท์",
    "เรื่องที่สอบถาม",
    "รายละเอียดข้อความ",
    "สถานะการติดต่อ"
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#ec4899"); // ชมพูพีชพรีเมียม
  headerRange.setFontColor("#ffffff");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 160); // วันที่
  sheet.setColumnWidth(2, 180); // ชื่อผู้ติดต่อ
  sheet.setColumnWidth(3, 150); // เบอร์โทร
  sheet.setColumnWidth(4, 200); // เรื่อง
  sheet.setColumnWidth(5, 420); // ข้อความ
  sheet.setColumnWidth(6, 160); // สถานะติดต่อ (Dropdown)

  // Dropdown สถานะการติดต่อ (คอลัมน์ F)
  const statusRange = sheet.getRange("F2:F5000");
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONTACT_STATUSES, true)
    .setAllowInvalid(false)
    .build();
  statusRange.setDataValidation(rule);

  sheet.getRange("A2:A5000").setHorizontalAlignment("center");
  sheet.getRange("C2:C5000").setHorizontalAlignment("center");
  sheet.getRange("F2:F5000").setHorizontalAlignment("center");
}

/**
 * ============================================================================
 * ฟังก์ชันหลัก doPost(e): รับข้อมูลจากหน้าเว็บส่งเข้าชีทตามประเภท (Order / Review / Contact)
 * ============================================================================
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ถอดรหัสข้อมูล JSON หรือ Parameter ที่ส่งมาจากหน้าเว็บ
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    const action = String(data.action || data.type || "").toLowerCase();

    // ========================================================================
    // กรณีที่ 1: คำขอส่งรีวิวลูกค้า (Customer Reviews)
    // ========================================================================
    if (action === "review") {
      let reviewSheet = ss.getSheetByName(SHEET_REVIEWS);
      if (!reviewSheet) {
        setupReviewsSheet(ss);
        reviewSheet = ss.getSheetByName(SHEET_REVIEWS);
      }

      const rTimestamp = data.date || Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
      const rRating = String(data.rating || "5");
      const starMatch = rRating.match(/(\d+)/);
      const starCount = starMatch ? parseInt(starMatch[1], 10) : 5;
      const validStar = Math.min(Math.max(starCount, 1), 5);
      const formattedRating = `${validStar} ดาว ${"⭐".repeat(validStar)}`;

      reviewSheet.appendRow([
        rTimestamp,
        data.author || data.customerName || "-",
        data.location || "-",
        formattedRating,
        data.product || data.productName || "-",
        data.comment || "-"
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        type: "review",
        message: "บันทึกรีวิวลูกค้าเข้า Google Sheets เรียบร้อยแล้ว",
        row: reviewSheet.getLastRow()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================================
    // กรณีที่ 2: คำขอส่งข้อความติดต่อร้านค้า (Contact Messages)
    // ========================================================================
    if (action === "contact") {
      let contactSheet = ss.getSheetByName(SHEET_CONTACT);
      if (!contactSheet) {
        setupContactSheet(ss);
        contactSheet = ss.getSheetByName(SHEET_CONTACT);
      }

      const cTimestamp = data.date || Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");

      contactSheet.appendRow([
        cTimestamp,
        data.name || data.customerName || "-",
        data.phone || data.customerPhone || "-",
        data.topic || "สอบถามทั่วไป",
        data.message || data.comment || "-",
        "🟡 รอติดต่อกลับ"
      ]);

      // กำหนด Dropdown แถวล่าสุด
      const lastRow = contactSheet.getLastRow();
      const statusCell = contactSheet.getRange(lastRow, 6);
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONTACT_STATUSES, true)
        .setAllowInvalid(false)
        .build();
      statusCell.setDataValidation(rule);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        type: "contact",
        message: "บันทึกข้อความติดต่อเข้า Google Sheets เรียบร้อยแล้ว",
        row: lastRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================================
    // กรณีที่ 3: คำสั่งซื้อสินค้า (Orders - ค่าเริ่มต้น)
    // ========================================================================
    let orderSheet = ss.getSheetByName(SHEET_ORDERS);
    if (!orderSheet) {
      setupOrdersSheet(ss);
      orderSheet = ss.getSheetByName(SHEET_ORDERS);
    }

    // แปลงรายการสินค้า
    let itemsText = "";
    if (Array.isArray(data.items)) {
      itemsText = data.items.map(item => {
        const sizeInfo = item.size ? ` [ไซส์ ${item.size}]` : "";
        const colorInfo = item.color ? ` [สี ${item.color}]` : "";
        return `${item.name}${sizeInfo}${colorInfo} x${item.quantity || 1} (฿${(item.price * (item.quantity || 1)).toLocaleString()})`;
      }).join("\n");
    } else if (typeof data.items === "string") {
      itemsText = data.items;
    }

    const timestamp = data.date || Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    const orderId = data.orderId || ("ORD-" + Math.floor(100000 + Math.random() * 900000));
    const customerName = data.customerName || "-";
    const customerPhone = data.customerPhone || "-";
    const customerAddress = data.customerAddress || "-";
    const totalAmount = Number(data.totalAmount) || 0;
    const paymentMethod = data.paymentMethod || "พร้อมเพย์ 093-758-6699";
    const deliveryStatus = data.deliveryStatus || "รอตรวจสอบยอดเงิน";
    const slipUrl = data.slipUrl || (data.hasSlip ? "แนบหลักฐานสลิปแล้ว" : "-");

    orderSheet.appendRow([
      timestamp,
      orderId,
      customerName,
      customerPhone,
      customerAddress,
      itemsText,
      totalAmount,
      paymentMethod,
      deliveryStatus,
      slipUrl
    ]);

    // กำหนด Dropdown สถานะการจัดส่ง
    const lastRow = orderSheet.getLastRow();
    const statusCell = orderSheet.getRange(lastRow, 9);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(DELIVERY_STATUSES, true)
      .setAllowInvalid(false)
      .build();
    statusCell.setDataValidation(rule);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      type: "order",
      message: "บันทึกคำสั่งซื้อลง Google Sheets เรียบร้อยแล้ว",
      orderId: orderId,
      row: lastRow
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

/**
 * ฟังก์ชันตรวจสอบสถานะ Webhook (GET)
 */
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "BabyPink Store Multi-Sheet Integration",
    version: "2.2.0",
    supportedActions: ["order", "review", "contact"],
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================================================================
 * ฟังก์ชันทดสอบระบบ (กด Run ใน Apps Script เพื่อลองจำลองข้อมูลได้ทันที)
 * ============================================================================
 */
function testContact() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        action: "contact",
        name: "คุณแม่น้องฟ้าใส (ทดสอบ)",
        phone: "093-758-6699",
        topic: "สอบถามไซส์เสื้อผ้า",
        message: "น้องอายุ 5 เดือน น้ำหนัก 7 กิโล ใส่ไซส์ 3-6M หรือ 6-9M พอดีคะ?"
      })
    }
  };
  const result = doPost(fakeEvent);
  Logger.log("ผลการทดสอบส่งข้อความติดต่อ: " + result.getContent());
}

function testReview() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        action: "review",
        author: "คุณแม่น้องมิลิน (ทดสอบ)",
        location: "กรุงเทพฯ",
        rating: "5 ดาว",
        product: "ชุดรอมเปอร์หมีพาสเทล",
        comment: "ผ้านุ่มมากกก สีหวานน่ารัก ซักแล้วไม่ย้วยเลยค่ะ แนะนำเลย"
      })
    }
  };
  const result = doPost(fakeEvent);
  Logger.log("ผลการทดสอบส่งรีวิว: " + result.getContent());
}

function testOrder() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        action: "order",
        orderId: "TEST-" + Math.floor(1000 + Math.random() * 9000),
        customerName: "คุณพ่อน้องโปรด (ทดสอบ)",
        customerPhone: "089-999-9999",
        customerAddress: "99/1 ถนนรามอินทรา แขวงคันนายาว เขตคันนายาว กทม.",
        items: [
          { name: "ชุดรอมเปอร์ลายปักหมี", size: "3-6M", color: "ชมพู", quantity: 1, price: 350 }
        ],
        totalAmount: 350,
        paymentMethod: "พร้อมเพย์ 093-758-6699",
        deliveryStatus: "รอตรวจสอบยอดเงิน",
        slipUrl: "แนบหลักฐานสลิปแล้ว"
      })
    }
  };
  const result = doPost(fakeEvent);
  Logger.log("ผลการทดสอบส่งคำสั่งซื้อ: " + result.getContent());
}
