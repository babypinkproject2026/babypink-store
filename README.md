# 🌸 BabyPink Store - ร้านค้าออนไลน์เสื้อผ้าเด็ก (Baby & Kids E-Commerce)

เว็บไซต์ร้านค้าออนไลน์สำหรับจำหน่ายเสื้อผ้าเด็กอ่อนและเด็กเล็ก ออกแบบด้วยธีม **Dark Mode ตัดเส้นขอบเรืองแสงสีชมพู (Pink Neon Glow)** และรองรับการสลับเป็น **Light Mode โทนขาว-ชมพู** พัฒนาด้วยเทคโนโลยีพื้นฐานที่เข้าใจง่าย สะอาดตา (**HTML5, CSS3, Vanilla JavaScript**) พร้อมระบบชำระเงินด้วย **QR Code พร้อมเพย์ที่สามารถสแกนโอนจ่ายเงินได้จริง (มาตรฐาน EMVCo)**, ระบบสมาชิกเชื่อมต่อ **Supabase & Google Auth**, และพร้อมอัปโหลดขึ้น **Vercel** ทันที

---

## 🌟 จุดเด่นและฟีเจอร์สำคัญ (Key Features)

1. **🎨 ธีม Dark Mode & Light Mode เน้นสีชมพูเป็นหลัก:**
   - **Dark Mode (Default):** พื้นหลังดำหรูหรา กล่องรูปภาพสินค้าทุกบล็อกมีเส้นขอบและแสงเรืองสีชมพูสดใส (`--pink-border: #ff2a85` และ `box-shadow: 0 0 16px rgba(255, 42, 133, 0.4)`)
   - **Light Mode:** พื้นหลังโทนขาวละมุน คุมโทนสีชมพูหวานสดใส เหมาะกับร้านเสื้อผ้าเด็ก
   - มีปุ่มสลับธีมพร้อมบันทึกสถานะไว้ใน `localStorage`

2. **🛍️ สินค้าในระบบ 18 รายการ (รวมสินค้าทดสอบชำระเงิน 1 บาท):**
   - มีสินค้าพิเศษ **"เทสระบบชำระเงิน" ราคา 1.00 บาท** (ฟรีค่าจัดส่ง) สำหรับทดสอบสแกน QR โอนเงินจริงเข้าบัญชี 093-758-6699
   - ชุดหมีรอมเปอร์, บอดี้สูท, ชุดเซ็ตลินิน, เดรสเจ้าหญิงผ้าทูลล์, เอี๊ยมยีนส์วินเทจ, สเวตเตอร์ไหมพรม, ชุดนอนคอตตอน, ชุดว่ายน้ำกัน UV, ชุดจั๊มสูทฮู้ดหูกระต่าย ฯลฯ
   - รองรับการดูรายละเอียดแบบรวดเร็ว (Quick View Modal) เลือกไซส์และสีได้
   - ตัวกรองหมวดหมู่สินค้า (Category Pills), ระบบค้นหาแบบ Real-time, และการเรียงลำดับราคา/ความนิยม

3. **💸 ระบบชำระเงิน QR พร้อมเพย์ โอนจ่ายได้จริง (PromptPay Real QR):**
   - คำนวณรหัส QR ตามมาตรฐานสากล **EMVCo QR Code Specification** พร้อมคำนวณ Checksum **CRC16-CCITT**
   - วาด QR Code ลงบน HTML Canvas โดยตรง ไม่ต้องพึ่งพา Server ภายนอก ทำงานได้ 100% Offline
   - **บัญชีพร้อมเพย์ปลอดภัย (Fixed Merchant Account):** ล็อกเบอร์พร้อมเพย์รับเงินของร้านค้าไว้ที่เบอร์ `093-758-6699` กำหนดค่าผ่านระบบหลังบ้าน/ซอร์สโค้ด ไม่อนุญาตให้ลูกค้าแก้ไขเบอร์ผู้รับเงินที่หน้าเว็บ ป้องกันข้อผิดพลาดและความปลอดภัยในการรับชำระเงิน
   - มีระบบแนบสลิปโอนเงิน และหน้าสรุปออเดอร์พร้อมพิมพ์ใบเสร็จ

4. **🔒 ระบบความปลอดภัย & สมาชิก (Supabase & Google OAuth):**
   - เชื่อมต่อกับ **Supabase Client (`@supabase/supabase-js`)**
   - รองรับการล็อกอินผ่าน **Google OAuth**
   - **Smart Demo Mode:** หากยังไม่ได้ใส่ API Key ของ Supabase ระบบจะจำลอง Demo User ให้ทดสอบได้ทันทีอย่างราบรื่น

5. **🚀 พร้อม Deploy ขึ้น Vercel ทันที:**
   - มีไฟล์ `vercel.json` ตั้งค่า Cache และ Security Headers เรียบร้อยแล้ว
   - สามารถ Deploy ผ่าน Vercel CLI, Git Push หรือลากโฟลเดอร์ขึ้นเว็บ Vercel ได้เลย

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
P-nus_sell-baby-shirt/
├── index.html               # หน้าแรก Storefront แสดง Top 3 สินค้าขายดี และข้อมูลร้านค้า
├── shop.html                # แคตตาล็อกสินค้าทั้งหมด 18 รายการ พร้อมตัวกรองและค้นหา
├── contact.html             # ข้อมูลหน้าร้านจริง แฟชั่นไอส์แลนด์ ชั้น 2 โซน Grand Station โทร 093-758-6699
├── feedback.html            # รีวิวจากคุณพ่อคุณแม่ 5 ท่าน พร้อมแบบฟอร์มส่งรีวิว
├── style.css                # CSS Variables สไตล์ Dark/Light Mode, นีออนพิงค์ และ Responsive
├── app.js                   # ตรรกะการทำงาน ตะกร้าสินค้า PromptPay QR และ Google Sheets Sync
├── products.js              # ฐานข้อมูลสินค้า 18 รายการ (รวมสินค้าทดสอบระบบ 1 บาท)
├── promptpay.js             # ตัวคำนวณ EMVCo PromptPay QR Code + Embedded QR Engine
├── google-sheets-script.js  # โค้ด Google Apps Script สำหรับรับออเดอร์เข้า Google Sheets
├── supabase-config.js       # การตั้งค่าเชื่อมต่อ Supabase & Google Auth
├── supabase-schema.sql      # สคริปต์ SQL สำหรับสร้างตารางใน Supabase
├── vercel.json              # ไฟล์ Config สำหรับ Deploy บน Vercel
├── README.md                # คู่มือการใช้งานโปรเจกต์
└── assets/
    └── images/              # ไฟล์รูปภาพสินค้าในระบบและ SVG จำลอง
```

---

## 📊 วิธีเชื่อมต่อ Google Sheets สำหรับเก็บออเดอร์ (1 นาที):
1. สร้าง Google Sheets เปล่า 1 ไฟล์
2. ไปที่ **ส่วนขยาย (Extensions) > Apps Script**
3. คัดลอกโค้ดทั้งหมดในไฟล์ `google-sheets-script.js` ไปวางแทนที่
4. กดเลือกฟังก์ชัน `initialSetup` แล้วกด **เรียกใช้ (Run)** เพื่อสร้างหัวตารางและ Dropdown สถานะการจัดส่ง 3 สถานะ:
   - 🟡 `จัดเตรียมสินค้า`
   - 🔵 `ส่งสินค้าให้ขนส่ง`
   - 🟢 `จัดส่งสำเร็จ`
5. กดปุ่ม **ทำให้ใช้งานได้ (Deploy) > การทำให้ใช้งานได้รายการใหม่ (New deployment)**
   - ประเภท: เว็บแอป (Web app)
   - ผู้มีสิทธิ์เข้าถึง: **ทุกคน (Anyone)**
6. คัดลอก Web App URL ที่ได้ มาวางใน `app.js` ตรง `GOOGLE_SHEETS_CONFIG.webhookUrl`
7. เมื่อลูกค้ากดชำระเงิน ข้อมูลคำสั่งซื้อจะถูกบันทึกเข้า Google Sheets โดยอัตโนมัติทันที!

---

## 🚀 วิธีการเปิดใช้งานในเครื่อง (Local Testing)

1. เปิดโฟลเดอร์โปรเจกต์ขึ้นมา
2. ดับเบิลคลิกเปิดไฟล์ `index.html` บนเว็บเบราว์เซอร์ใดก็ได้ (Chrome, Edge, Firefox, Safari)
3. ทดลองคลิกสลับโหมด **Dark Mode / Light Mode** ที่มุมบนขวา
4. เลือกดู **Top 3 สินค้าขายดี** ในหน้าแรก หรือคลิก **"สินค้าทั้งหมด"** เพื่อไปหน้า `shop.html`
5. ทดลองสั่งซื้อสินค้า **"เทสระบบชำระเงิน" ราคา 1 บาท** (ส่งฟรี 0 บาท)
6. หน้าจอจะสร้าง QR Code พร้อมเพย์ยอด 1.00 บาท โอนเข้าบัญชี **`093-758-6699`**
7. สแกนโอนเงินจริง แนบสลิป และกดยืนยันคำสั่งซื้อเพื่อบันทึกข้อมูลเข้า Google Sheets และ Supabase ทันที

---

## 🔗 วิธีการเชื่อมต่อ Supabase จริง & Google Login

1. สมัครใช้งานที่ [https://supabase.com](https://supabase.com) แล้วสร้าง Project ใหม่
2. ไปที่ **SQL Editor** ใน Supabase นำโค้ดจากไฟล์ `supabase-schema.sql` ไปวางแล้วกด **RUN**
3. ไปที่ **Project Settings -> API** นำค่า:
   - `Project URL`
   - `anon / public API key`
4. เปิดไฟล์ `supabase-config.js` แล้วนำค่าทั้งสองมาวางแทนที่:
   ```javascript
   const SUPABASE_CONFIG = {
     url: "https://xxxxxx.supabase.co",
     anonKey: "eyJhbGciOiJIUzI1NiIsIn...",
     ...
   };
   ```
5. เพื่อเปิดใช้ Google OAuth:
   - ไปที่ **Authentication -> Providers -> Google** ใน Supabase
   - นำ Client ID และ Client Secret จาก Google Cloud Console มากรอก

---

## ☁️ วิธีการอัปโหลดขึ้น Vercel (Deploy to Vercel)

### วิธีที่ 1: ผ่านหน้าเว็บ Vercel (ง่ายที่สุด)
1. นำโฟลเดอร์นี้อัปโหลดขึ้น GitHub Repository ของคุณ
2. เข้าสู่ระบบ [https://vercel.com](https://vercel.com)
3. กดปุ่ม **"Add New Project"** เลือก Repository ที่เพิ่งสร้าง
4. กด **Deploy** เว็บไซต์จะออนไลน์ทันทีภายใน 30 วินาที!

### วิธีที่ 2: ผ่าน Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## 🧸 โค้ดส่วนลดสำหรับทดสอบระบบ
- `BABYPINK10` : รับส่วนลด 10%
- `BABYFREE` : รับส่วนลด 15%
