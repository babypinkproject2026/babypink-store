/**
 * PromptPay EMVCo QR Code Generator & QR Renderer
 * รองรับการสร้าง Dynamic QR Code มีจำนวนเงิน และ Static QR Code
 * สามารถสแกนและโอนเงินเข้าบัญชีจริงได้ผ่านแอปธนาคารไทยทุกแห่ง (K PLUS, SCB, Krungthai NEXT ฯลฯ)
 */

const PromptPay = {
  // ค่าเริ่มต้นสำหรับร้านค้า (กำหนดค่าผ่านโค้ดหรือระบบหลังบ้านเท่านั้น)
  defaultRecipient: "0937586699", // เบอร์โทรศัพท์พร้อมเพย์ร้านค้า
  defaultName: "Baby & Kids Store (พร้อมเพย์)",

  /**
   * จัดรูปแบบเบอร์โทรศัพท์หรือเลขบัตรประชาชน
   */
  formatTarget(target) {
    const cleaned = target.replace(/[^0-9]/g, "");
    if (cleaned.length === 10 && cleaned.startsWith("0")) {
      // เบอร์โทรศัพท์ 10 หลัก: 09x-xxx-xxxx -> 00669xxxxxxxx
      return {
        type: "mobile",
        formatted: "0066" + cleaned.substring(1),
        display: `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`
      };
    } else if (cleaned.length === 9) {
      // เบอร์โทรศัพท์ 9 หลัก
      return {
        type: "mobile",
        formatted: "0066" + cleaned,
        display: `0066-${cleaned}`
      };
    } else if (cleaned.length === 13) {
      // เลขประจำตัวประชาชน / นิติบุคคล 13 หลัก
      return {
        type: "id",
        formatted: cleaned,
        display: `${cleaned.substring(0, 1)}-${cleaned.substring(1, 5)}-${cleaned.substring(5, 10)}-${cleaned.substring(10, 12)}-${cleaned.substring(12)}`
      };
    } else if (cleaned.length === 15) {
      // e-Wallet ID 15 หลัก
      return {
        type: "ewallet",
        formatted: cleaned,
        display: cleaned
      };
    }
    return {
      type: "unknown",
      formatted: cleaned,
      display: cleaned
    };
  },

  /**
   * Helper สร้างแท็ก EMVCo TLV (Tag, Length, Value)
   */
  tag(id, value) {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
  },

  /**
   * คำนวณ CRC16-CCITT (0xFFFF, 0x1021) ตามมาตรฐาน EMVCo
   */
  crc16(data) {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  },

  /**
   * สร้าง PromptPay Payload ตามมาตรฐานสากล
   * @param {string} target - เบอร์มือถือ (09x...) หรือเลขบัตร ปชช. (13 หลัก)
   * @param {number|null} amount - จำนวนเงิน (บาท)
   * @returns {string} EMVCo QR Payload String
   */
  generatePayload(target, amount = null) {
    const info = this.formatTarget(target);
    const AID = "A000000677010111"; // Application Identifier for PromptPay

    // Merchant Account Information (Tag 29)
    let merchantData = this.tag("00", AID);
    if (info.type === "mobile") {
      merchantData += this.tag("01", info.formatted);
    } else if (info.type === "id") {
      merchantData += this.tag("02", info.formatted);
    } else if (info.type === "ewallet") {
      merchantData += this.tag("03", info.formatted);
    } else {
      merchantData += this.tag("01", info.formatted);
    }

    const tag29 = this.tag("29", merchantData);

    // Dynamic vs Static: 010212 = Dynamic (พร้อมยอดเงิน), 010211 = Static (กรอกยอดเอง)
    const hasAmount = typeof amount === "number" && amount > 0;
    const tag01 = this.tag("01", hasAmount ? "12" : "11");

    let payload =
      this.tag("00", "01") + // Payload Format Indicator
      tag01 +
      tag29 +
      this.tag("53", "764"); // Currency: THB (764)

    if (hasAmount) {
      const amountStr = Number(amount).toFixed(2);
      payload += this.tag("54", amountStr); // Transaction Amount
    }

    payload += this.tag("58", "TH"); // Country Code: Thailand
    payload += "6304"; // Tag 63: CRC + ความยาว 4 หลัก

    const checksum = this.crc16(payload);
    return payload + checksum;
  },

  /**
   * วาด QR Code ลงบน Canvas Element
   */
  renderQR(canvas, payload, options = {}) {
    const size = options.size || 260;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // ใช้โมดูล MiniQRCode ในตัวเพื่อวาดข้อมูล
    try {
      const qr = MiniQR.create(payload, MiniQR.ErrorCorrectionLevel.M);
      const modules = qr.getModules();
      const count = modules.length;
      const cellSize = size / (count + 4);
      const margin = cellSize * 2;

      // พื้นหลังสีขาวสำหรับให้สแกนง่าย
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // วาดเซลล์ QR สีเข้ม
      ctx.fillStyle = options.color || "#0a192f";
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (modules[r][c]) {
            ctx.fillRect(
              margin + c * cellSize,
              margin + r * cellSize,
              cellSize + 0.5,
              cellSize + 0.5
            );
          }
        }
      }
      return true;
    } catch (e) {
      console.error("MiniQR rendering error:", e);
      // Fallback: ใช้ QR API เสริมกรณีฉุกเฉิน
      const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => ctx.drawImage(img, 0, 0, size, size);
      img.src = fallbackUrl;
      return true;
    }
  }
};

/**
 * Embedded Mini QR Code Generator (Compact Pure JavaScript QR Matrix Engine)
 * ทำงานได้ 100% Offline ไม่ต้องพึ่ง Server ภายนอก
 */
const MiniQR = (function () {
  const ECL = { L: 1, M: 0, Q: 3, H: 2 };

  function QRPolynomial(num, shift) {
    if (num.length === undefined) throw new Error(num.length + "/" + shift);
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[offset + i];
  }
  QRPolynomial.prototype = {
    get: function (index) { return this.num[index]; },
    getLength: function () { return this.num.length; },
    multiply: function (e) {
      const num = new Array(this.getLength() + e.getLength() - 1);
      for (let i = 0; i < this.getLength(); i++) {
        for (let j = 0; j < e.getLength(); j++) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
        }
      }
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) return this;
      const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
      const num = new Array(this.getLength());
      for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
      for (let i = 0; i < e.getLength(); i++) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
      }
      return new QRPolynomial(num, 0).mod(e);
    }
  };

  const QRMath = {
    glog: function (n) {
      if (n < 1) throw new Error("glog(" + n + ")");
      return QRMath.LOG_TABLE[n];
    },
    gexp: function (n) {
      while (n < 0) n += 255;
      while (n >= 255) n -= 255;
      return QRMath.EXP_TABLE[n];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
  };
  for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i++) {
    QRMath.EXP_TABLE[i] =
      QRMath.EXP_TABLE[i - 4] ^
      QRMath.EXP_TABLE[i - 5] ^
      QRMath.EXP_TABLE[i - 6] ^
      QRMath.EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  QRBitBuffer.prototype = {
    get: function (index) {
      const bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
    },
    put: function (num, length) {
      for (let i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) === 1);
      }
    },
    putBit: function (bit) {
      const bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
      this.length++;
    }
  };

  const QRRSBlock = {
    RS_BLOCK_TABLE: [
      [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
      [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
      [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
      [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
      [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
      [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
      [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
      [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
      [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
      [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]
    ],
    getRSBlocks: function (typeNumber, errorCorrectionLevel) {
      const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectionLevel);
      if (!rsBlock) throw new Error("bad rs block @ typeNumber:" + typeNumber);
      const length = rsBlock.length / 3;
      const list = [];
      for (let i = 0; i < length; i++) {
        const count = rsBlock[i * 3 + 0];
        const totalCount = rsBlock[i * 3 + 1];
        const dataCount = rsBlock[i * 3 + 2];
        for (let j = 0; j < count; j++) {
          list.push({ totalCount: totalCount, dataCount: dataCount });
        }
      }
      return list;
    },
    getRsBlockTable: function (typeNumber, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECL.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
        case ECL.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
        case ECL.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
        case ECL.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
        default: return undefined;
      }
    }
  };

  function QRCodeModel(typeNumber, errorCorrectionLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectionLevel = errorCorrectionLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }
  QRCodeModel.prototype = {
    addData: function (data) {
      this.dataList.push(data);
      this.dataCache = null;
    },
    isDark: function (row, col) {
      if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
        throw new Error(row + "," + col);
      }
      return this.modules[row][col];
    },
    getModuleCount: function () { return this.moduleCount; },
    getModules: function () { return this.modules; },
    make: function () {
      if (this.typeNumber < 1) {
        let typeNumber = 1;
        for (; typeNumber < 40; typeNumber++) {
          const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectionLevel);
          let totalDataCount = 0;
          for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
          const buffer = new QRBitBuffer();
          for (let i = 0; i < this.dataList.length; i++) {
            const data = this.dataList[i];
            buffer.put(4, 4); // 8-bit byte mode
            buffer.put(data.length, typeNumber < 10 ? 8 : 16);
            for (let j = 0; j < data.length; j++) buffer.put(data.charCodeAt(j), 8);
          }
          if (buffer.length <= totalDataCount * 8) break;
        }
        this.typeNumber = typeNumber;
      }
      this.makeImpl(false, this.getBestMaskPattern());
    },
    makeImpl: function (test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (let row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (let col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      if (this.typeNumber >= 7) this.setupTypeNumber(test);
      if (this.dataCache == null) {
        this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectionLevel, this.dataList);
      }
      this.mapData(this.dataCache, maskPattern);
    },
    setupPositionProbePattern: function (row, col) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if (
            (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
            (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
            (2 <= r && r <= 4 && 2 <= c && c <= 4)
          ) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    getBestMaskPattern: function () {
      let minLostPoint = 0;
      let pattern = 0;
      for (let i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        const lostPoint = QRUtil.getLostPoint(this);
        if (i === 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }
      return pattern;
    },
    setupTimingPattern: function () {
      for (let r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] !== null) continue;
        this.modules[r][6] = r % 2 === 0;
      }
      for (let c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] !== null) continue;
        this.modules[6][c] = c % 2 === 0;
      }
    },
    setupPositionAdjustPattern: function () {
      const pos = QRUtil.getPatternPosition(this.typeNumber);
      for (let i = 0; i < pos.length; i++) {
        for (let j = 0; j < pos.length; j++) {
          const row = pos[i];
          const col = pos[j];
          if (this.modules[row][col] !== null) continue;
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
                this.modules[row + r][col + c] = true;
              } else {
                this.modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    },
    setupTypeNumber: function (test) {
      const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
      for (let i = 0; i < 18; i++) {
        const mod = !test && ((bits >> i) & 1) === 1;
        this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
        this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    },
    setupTypeInfo: function (test, maskPattern) {
      const data = (this.errorCorrectionLevel << 3) | maskPattern;
      const bits = QRUtil.getBCHTypeInfo(data);
      for (let i = 0; i < 15; i++) {
        const mod = !test && ((bits >> i) & 1) === 1;
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;

        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },
    mapData: function (data, maskPattern) {
      let inc = -1;
      let row = this.moduleCount - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      const maskFunc = QRUtil.getMaskFunction(maskPattern);
      for (let col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (this.modules[row][col - c] === null) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
              }
              const mask = maskFunc(row, col - c);
              if (mask) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
  };

  QRCodeModel.createData = function (typeNumber, errorCorrectionLevel, dataList) {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
    const buffer = new QRBitBuffer();
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(4, 4); // 8-bit byte mode
      buffer.put(data.length, typeNumber < 10 ? 8 : 16);
      for (let j = 0; j < data.length; j++) buffer.put(data.charCodeAt(j), 8);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    if (buffer.length > totalDataCount * 8) {
      throw new Error("code length overflow. (" + buffer.length + ">" + totalDataCount * 8 + ")");
    }
    if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.length % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }
    return QRCodeModel.createBytes(buffer, rsBlocks);
  };

  QRCodeModel.createBytes = function (buffer, rsBlocks) {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
    const data = new Array(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) data[index++] = dcdata[r][i];
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) data[index++] = ecdata[r][i];
      }
    }
    return data;
  };

  const QRUtil = {
    PATTERN_POSITION_TABLE: [
      [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
      [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54]
    ],
    getPatternPosition: function (typeNumber) {
      return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
    },
    getMaskFunction: function (maskPattern) {
      switch (maskPattern) {
        case 0: return (i, j) => (i + j) % 2 === 0;
        case 1: return (i) => i % 2 === 0;
        case 2: return (i, j) => j % 3 === 0;
        case 3: return (i, j) => (i + j) % 3 === 0;
        case 4: return (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case 5: return (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0;
        case 6: return (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
        case 7: return (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
        default: throw new Error("bad maskPattern:" + maskPattern);
      }
    },
    getErrorCorrectPolynomial: function (errorCorrectLength) {
      let a = new QRPolynomial([1], 0);
      for (let i = 0; i < errorCorrectLength; i++) {
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      }
      return a;
    },
    getBCHTypeInfo: function (data) {
      let d = data << 10;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(1335) >= 0) {
        d ^= 1335 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(1335));
      }
      return ((data << 10) | d) ^ 21522;
    },
    getBCHTypeNumber: function (data) {
      let d = data << 12;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(7973) >= 0) {
        d ^= 7973 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(7973));
      }
      return (data << 12) | d;
    },
    getBCHDigit: function (data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    },
    getLostPoint: function (qrCode) {
      const moduleCount = qrCode.getModuleCount();
      let lostPoint = 0;
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          let sameCount = 0;
          const dark = qrCode.isDark(row, col);
          for (let r = -1; r <= 1; r++) {
            if (row + r < 0 || moduleCount <= row + r) continue;
            for (let c = -1; c <= 1; c++) {
              if (col + c < 0 || moduleCount <= col + c) continue;
              if (r === 0 && c === 0) continue;
              if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
            }
          }
          if (sameCount > 5) lostPoint += 3 + sameCount - 5;
        }
      }
      return lostPoint;
    }
  };

  return {
    ErrorCorrectionLevel: ECL,
    create: function (data, errorCorrectionLevel) {
      const model = new QRCodeModel(0, errorCorrectionLevel || ECL.M);
      model.addData(data);
      model.make();
      return model;
    }
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PromptPay };
}
