/**
 * ============================================================================
 * Google Apps Script สำหรับรับข้อมูลคำสั่งซื้อจากร้าน BabyPink Store เข้า Google Sheets
 * ============================================================================
 * 
 * วิธีการติดตั้ง (ทำเพียงครั้งเดียว ไม่ถึง 1 นาที):
 * 1. เปิด Google Sheets ขึ้นมา 1 ไฟล์ (เช่น ตั้งชื่อว่า "BabyPink - ฐานข้อมูลคำสั่งซื้อ")
 * 2. ไปที่เมนูด้านบน คลิก "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. ลบโค้ดเดิมออกทั้งหมด แล้วนำโค้ดในไฟล์นี้ไปวางแทน
 * 4. (ไม่บังคับ) กดเลือกฟังก์ชัน "initialSetup" ด้านบน แล้วกดปุ่ม "เรียกใช้" (Run) เพื่อสร้างหัวตารางและ Dropdown อัตโนมัติ
 * 5. กดปุ่มสีน้ำเงิน "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. ตรงรูปเฟืองเลือกประเภท: "เว็บแอป" (Web app)
 *    - คำอธิบาย: BabyPink Order Webhook
 *    - ดำเนินการในฐานะ: ตัวฉัน (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)  <-- *สำคัญมาก ต้องเลือก Anyone*
 * 7. กด "ทำให้ใช้งานได้" (Deploy) และคัดลอก "URL ของเว็บแอป" (Web App URL)
 * 8. นำ URL ที่ได้ มาวางในไฟล์ `app.js` ที่ตัวแปร GOOGLE_SHEETS_CONFIG.webhookUrl
 * ============================================================================
 */

// ชื่อแผ่นงาน (Sheet Tab Name)
const SHEET_NAME = "คำสั่งซื้อ";

// สถานะการจัดส่ง 3 สถานะตามที่กำหนด
const DELIVERY_STATUSES = [
  "จัดเตรียมสินค้า",
  "ส่งสินค้าให้ขนส่ง",
  "จัดส่งสำเร็จ"
];

/**
 * ฟังก์ชันสร้างหัวตารางและตั้งค่า Dropdown อัตโนมัติ
 * (สามารถกด Run ฟังก์ชันนี้ใน Apps Script ได้เลย)
 */
function initialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // 1. หัวตาราง
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

  // ตรึงแถวที่ 1
  sheet.setFrozenRows(1);

  // ตั้งความกว้างคอลัมน์ให้อ่านง่าย
  sheet.setColumnWidth(1, 150); // วันที่
  sheet.setColumnWidth(2, 130); // Order ID
  sheet.setColumnWidth(3, 160); // ชื่อลูกค้า
  sheet.setColumnWidth(4, 130); // เบอร์โทร
  sheet.setColumnWidth(5, 260); // ที่อยู่
  sheet.setColumnWidth(6, 300); // รายการสินค้า
  sheet.setColumnWidth(7, 130); // ยอดชำระ
  sheet.setColumnWidth(8, 140); // ช่องทาง
  sheet.setColumnWidth(9, 160); // สถานะจัดส่ง (Dropdown)
  sheet.setColumnWidth(10, 150); // สลิป

  // 2. ตั้งค่า Data Validation (Dropdown) สำหรับคอลัมน์ "สถานะการจัดส่ง" (คอลัมน์ที่ 9 / Column I)
  const statusRange = sheet.getRange("I2:I5000");
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DELIVERY_STATUSES, true)
    .setAllowInvalid(false)
    .build();
  statusRange.setDataValidation(rule);

  // จัดรูปแบบกึ่งกลาง
  sheet.getRange("A2:B5000").setHorizontalAlignment("center");
  sheet.getRange("D2:D5000").setHorizontalAlignment("center");
  sheet.getRange("G2:H5000").setHorizontalAlignment("center");
  sheet.getRange("I2:I5000").setHorizontalAlignment("center");

  Logger.log("✅ ตั้งค่าตาราง Google Sheets ของ BabyPink สำเร็จเรียบร้อย!");
}

/**
 * ฟังก์ชันรองรับคำขอ POST จากหน้าเว็บ BabyPink Store เมื่อลูกค้ากดยืนยันชำระเงิน
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      initialSetup();
      sheet = ss.getSheetByName(SHEET_NAME);
    }

    // รับข้อมูลคำสั่งซื้อ JSON จากหน้าเว็บ
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      data = e.parameter;
    }

    // แปลงรายการสินค้าให้อ่านง่าย เช่น "ชุดหมีรอมเปอร์ x1 (฿350), ชุดว่ายน้ำ x1 (฿490)"
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
    const deliveryStatus = data.deliveryStatus || "จัดเตรียมสินค้า"; // ค่าเริ่มต้น: จัดเตรียมสินค้า
    const slipUrl = data.slipUrl || (data.hasSlip ? "มีแนบสลิปโอนเงิน" : "-");

    // บันทึกลงแถวใหม่
    sheet.appendRow([
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

    // เพิ่ม Dropdown Validation ให้กับแถวล่าสุดที่เพิ่งเพิ่มเข้าไป
    const lastRow = sheet.getLastRow();
    const statusCell = sheet.getRange(lastRow, 9);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(DELIVERY_STATUSES, true)
      .setAllowInvalid(false)
      .build();
    statusCell.setDataValidation(rule);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
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
 * ฟังก์ชันรองรับคำขอ GET สำหรับตรวจสอบว่า Webhook ยังทำงานปกติ
 */
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "BabyPink Store Google Sheets Integration",
    version: "2.0.0",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
