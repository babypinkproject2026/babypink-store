-- =========================================================================
-- SQL Schema สำหรับร้านค้าออนไลน์เสื้อผ้าเด็ก (Baby & Kids Online Store)
-- สามารถคัดลอกคำสั่งทั้งหมดนี้ไปวางใน Supabase Dashboard > SQL Editor แล้วกด RUN
-- =========================================================================

-- 1. สร้างตารางเก็บคำสั่งซื้อ (Orders Table)
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    items JSONB NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'promptpay',
    payment_status VARCHAR(50) DEFAULT 'paid_pending_verify',
    slip_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. เปิดใช้งาน Row Level Security (RLS) เพื่อความปลอดภัย
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- อนุญาตให้อ่านและสร้างออเดอร์ได้
CREATE POLICY "Allow public insert to orders" 
ON public.orders FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow authenticated read orders" 
ON public.orders FOR SELECT 
TO authenticated 
USING (true);

-- 3. ตารางสำหรับจัดเก็บรายการสินค้า (Products Table - ทางเลือกหากต้องการจัดการผ่านฐานข้อมูล)
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    category VARCHAR(50),
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    image_url TEXT,
    description TEXT,
    sizes TEXT[],
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read products" 
ON public.products FOR SELECT 
USING (true);
