const fs = require('fs');
const path = require('path');
const XLSX = require('../client/node_modules/xlsx');

const sampleData = [
  { STT: 1, 'Họ và Tên': 'Nguyễn Văn An', 'Email Khách Hàng': 'an.nguyen@example.com', 'Ghi Chú': 'Khách hàng VIP' },
  { STT: 2, 'Họ và Tên': 'Trần Thị Bình', 'Email Khách Hàng': 'binh.tran@example.com', 'Ghi Chú': 'Thành viên mới' },
  { STT: 3, 'Họ và Tên': 'Lê Hoàng Cường', 'Email Khách Hàng': 'cuong.le@example.com', 'Ghi Chú': 'Khách hàng doanh nghiệp' }
];

const worksheet = XLSX.utils.json_to_sheet(sampleData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'KhachHang');

const targetDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const targetPath = path.join(targetDir, 'danh_sach_email_mau.xlsx');
XLSX.writeFile(workbook, targetPath);
console.log('✅ Created sample Excel file at:', targetPath);
