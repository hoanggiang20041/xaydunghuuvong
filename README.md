# Xây dựng hữu vọng - Hệ thống Quản lý Vận chuyển Công trình

Phần mềm quản lý xe ra/vào công trình, theo dõi khối lượng vật liệu vận chuyển.

## Tính năng chính

- 🚛 Ghi nhận xe vào/ra công trình (check-in/check-out)
- 📊 Dashboard thống kê realtime
- 📋 Quản lý chuyến xe, xe, tài xế, vật liệu, công trình
- 🔐 Phân quyền RBAC (5 vai trò)
- 📝 Nhật ký hệ thống (Audit Log)
- 📈 Báo cáo theo ngày/tháng/công trình

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL + Prisma 6
- **Auth**: Custom JWT + RBAC
- **Deploy**: Vercel + Neon PostgreSQL

## Deploy lên Vercel

### Bước 1: Push code lên GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/xaydunghuuvong.git
git push -u origin main
```

### Bước 2: Tạo database Neon (miễn phí)
1. Vào https://neon.tech → Đăng ký → Tạo project
2. Copy connection string (dạng: `postgresql://user:pass@host/dbname`)

### Bước 3: Deploy trên Vercel
1. Vào https://vercel.com → Import project từ GitHub
2. Thêm Environment Variables:
   - `DATABASE_URL` = connection string từ Neon
   - `JWT_SECRET` = chuỗi bí mật ít nhất 32 ký tự
   - `JWT_REFRESH_SECRET` = chuỗi bí mật khác
3. Deploy!

### Bước 4: Chạy migration
```bash
npx prisma migrate deploy
npx prisma db seed
```

## Tài khoản demo
- **superadmin** / Demo@123456
- **admin** / Demo@123456
- **gatestaff** / Demo@123456
