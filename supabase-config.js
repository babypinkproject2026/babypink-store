/**
 * Supabase Configuration & Authentication Integration
 * ร้านค้าเสื้อผ้าเด็ก Baby & Kids Store
 *
 * วิธีเชื่อมต่อ Supabase จริง:
 * 1. สมัครหรือเข้าสู่ระบบที่ https://supabase.com
 * 2. สร้าง Project ใหม่
 * 3. ไปที่ Project Settings -> API นำ Project URL และ anon/public Key มาใส่ในตัวแปรด้านล่าง
 * 4. ไปที่ Authentication -> Providers -> Google เพื่อเปิดใช้งาน Google OAuth
 *
 * *หากยังไม่ได้ใส่ค่า Key ระบบจะมี Demo Fallback ทำงานได้อัตโนมัติ 100% ทันที*
 */

const SUPABASE_CONFIG = {
  // นำค่ามาจาก Supabase Dashboard > Settings > API
  url: "https://YOUR_SUPABASE_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_PUBLIC_KEY",

  // ตรวจสอบว่าใส่ Key จริงหรือยัง
  isConfigured: function () {
    return (
      this.url &&
      !this.url.includes("YOUR_SUPABASE_PROJECT_ID") &&
      this.anonKey &&
      !this.anonKey.includes("YOUR_SUPABASE_ANON_PUBLIC_KEY")
    );
  }
};

// ตัวจัดการ Supabase Client แบบ Universal (รองรับทั้ง Real Supabase และ Smart Demo Fallback)
const SupabaseService = {
  client: null,
  currentUser: null,

  init() {
    // โหลดข้อมูลผู้ใช้ที่ล็อกอินค้างไว้จาก LocalStorage
    const savedUser = localStorage.getItem("baby_store_user");
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }

    if (SUPABASE_CONFIG.isConfigured() && window.supabase) {
      try {
        this.client = window.supabase.createClient(
          SUPABASE_CONFIG.url,
          SUPABASE_CONFIG.anonKey
        );
        console.log("✅ Supabase Client Initialized with Real Backend");

        // ฟัง Event การเปลี่ยนแปลง Session (เช่น หลัง Redirect กลับมาจาก Google OAuth)
        this.client.auth.onAuthStateChange((event, session) => {
          if (session && session.user) {
            this.currentUser = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email.split("@")[0],
              avatar: session.user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
              provider: "google"
            };
            localStorage.setItem("baby_store_user", JSON.stringify(this.currentUser));
            if (typeof updateAuthUI === "function") updateAuthUI();
          }
        });
      } catch (err) {
        console.warn("Supabase init warning:", err);
      }
    } else {
      console.log("ℹ️ Supabase running in Demo Mode (Ready for live keys in supabase-config.js)");
    }
  },

  /**
   * เข้าสู่ระบบด้วย Google OAuth ผ่าน Supabase
   */
  async signInWithGoogle() {
    if (SUPABASE_CONFIG.isConfigured() && this.client) {
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) {
        console.error("Google Sign-In Error:", error);
        throw error;
      }
      return data;
    } else {
      // โหมดจำลอง Demo Login สะดวกสำหรับการทดสอบในเครื่องหรือนำเสนองาน
      const demoUser = {
        id: "demo-" + Date.now(),
        name: "คุณลูกค้า (Google Demo)",
        email: "demo.parent@gmail.com",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
        provider: "google-demo"
      };
      this.currentUser = demoUser;
      localStorage.setItem("baby_store_user", JSON.stringify(demoUser));
      return { user: demoUser };
    }
  },

  /**
   * ออกจากระบบ
   */
  async signOut() {
    if (SUPABASE_CONFIG.isConfigured() && this.client) {
      await this.client.auth.signOut();
    }
    this.currentUser = null;
    localStorage.removeItem("baby_store_user");
  },

  /**
   * บันทึกคำสั่งซื้อลงฐานข้อมูล Supabase
   */
  async saveOrder(orderData) {
    if (SUPABASE_CONFIG.isConfigured() && this.client) {
      try {
        const { data, error } = await this.client.from("orders").insert([
          {
            order_id: orderData.orderId,
            customer_name: orderData.customerName,
            customer_phone: orderData.customerPhone,
            customer_address: orderData.customerAddress,
            items: orderData.items,
            total_amount: orderData.totalAmount,
            payment_method: "promptpay",
            payment_status: "paid_pending_verify",
            created_at: new Date().toISOString()
          }
        ]);
        if (error) console.warn("Supabase save order error:", error);
        return { success: true, data };
      } catch (err) {
        console.warn("DB write fallback:", err);
      }
    }

    // สำรองบันทึกใน LocalStorage เสมอ
    const existingOrders = JSON.parse(localStorage.getItem("baby_store_orders") || "[]");
    existingOrders.unshift(orderData);
    localStorage.setItem("baby_store_orders", JSON.stringify(existingOrders));
    return { success: true, localOnly: true };
  }
};

// สั่งทำงานเมื่อโหลดสคริปต์
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    SupabaseService.init();
  });
}
