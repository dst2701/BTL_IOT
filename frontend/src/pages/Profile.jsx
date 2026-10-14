import { FaFilePdf, FaGithub } from 'react-icons/fa'
import { SiFigma, SiPostman } from 'react-icons/si'
// ── Đặt ảnh avatar vào frontend/src/assets/ với tên avatar.jpg (hoặc .png)
// ── Sau đó bỏ comment dòng dưới và xoá dòng AVATAR_PLACEHOLDER
import avatarSrc from '../assets/avatar.png'
const AVATAR_PLACEHOLDER = avatarSrc

const INFO = {
  name: 'Đinh Sơn Tùng',
  studentId: 'B23DCCN898',
  className: 'D23CNPM01',
  major: 'Công nghệ thông tin',
  specialization: 'Công nghệ phần mềm',
  university: 'Học viện Công nghệ Bưu chính Viễn thông',
}

const LINKS = [
  {
    icon: <FaGithub />,
    label: 'GitHub',
    sub: 'github.com/dst2701',
    url: 'https://github.com/dst2701',
    accent: '#24292e',
    bg: '#f0f0f0',
  },
  {
    icon: <SiFigma />,
    label: 'Figma',
    sub: 'B23DCCN898 IOT Design',
    url: 'https://www.figma.com/design/obrQPKfPJZm0cjv2MDAvgh/B23DCCN898_IOT?node-id=2014-1391&t=6ogoJcT7lxBfbf3x-1',
    accent: '#f24e1e',
    bg: '#fff3f0',
  },
  {
    icon: <SiPostman />,
    label: 'Postman',
    sub: 'B23DCCN898 IoT API',
    url: 'https://www.postman.com/sontung2701-2195229/b23dccn898-btl-iot-api/collection/ag5fzuc/b23dccn898-iot-api?action=share&creator=57562119',
    accent: '#ff6c37',
    bg: '#fff5f0',
  },
  {
    icon: <FaFilePdf />,
    label: 'Report',
    // ── Thay null bằng URL file PDF khi có, ví dụ:
    // url: 'https://drive.google.com/file/d/YOUR_FILE_ID/view'
    sub: 'Báo cáo đồ án — sẽ cập nhật',
    url: null,
    accent: '#e11d48',
    bg: '#fff0f3',
  },
]

const initials = INFO.name
  .split(' ')
  .slice(-2)
  .map((w) => w[0])
  .join('')

function Profile() {
  return (
    <section className="profile-page">
      {/* ── Hero strip ── */}
      <div className="profile-hero">
        <div className="profile-hero-bg" />
        <div className="profile-hero-dots" />
      </div>

      {/* ── Main card ── */}
      <div className="profile-layout">
      <div className="profile-card">
        {/* Avatar */}
        <div className="profile-avatar-wrap">
          {AVATAR_PLACEHOLDER ? (
            <img
              src={AVATAR_PLACEHOLDER}
              alt={INFO.name}
              className="profile-avatar-img"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              <span>{initials}</span>
            </div>
          )}
          <div className="profile-avatar-badge">{INFO.studentId}</div>
        </div>

        {/* Info */}
        <div className="profile-info">
          <p className="profile-greeting">Student Profile</p>
          <h1 className="profile-name">{INFO.name}</h1>

          <div className="profile-meta">
            <div className="profile-meta-row">
              <span className="profile-meta-label">Student ID</span>
              <span className="profile-meta-value">{INFO.studentId}</span>
            </div>
            <div className="profile-meta-row">
              <span className="profile-meta-label">Class</span>
              <span className="profile-meta-value">{INFO.className}</span>
            </div>
            <div className="profile-meta-row">
              <span className="profile-meta-label">Major</span>
              <span className="profile-meta-value">{INFO.major}</span>
            </div>
            <div className="profile-meta-row">
              <span className="profile-meta-label">Specialization</span>
              <span className="profile-meta-value">{INFO.specialization}</span>
            </div>
            <div className="profile-meta-row">
              <span className="profile-meta-label">University</span>
              <span className="profile-meta-value">{INFO.university}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Links grid ── */}
      <aside className="profile-resources">
      <h2 className="profile-links-title">Links & Resources</h2>
      <div className="profile-links">
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.url ?? '#'}
            target={link.url ? '_blank' : '_self'}
            rel="noreferrer"
            className={`profile-link-card${!link.url ? ' profile-link-disabled' : ''}`}
            style={{ '--accent': link.accent, '--bg': link.bg }}
            onClick={!link.url ? (e) => e.preventDefault() : undefined}
          >
            <span className="profile-link-icon">{link.icon}</span>
            <div className="profile-link-text">
              <span className="profile-link-label">{link.label}</span>
              <span className="profile-link-sub">{link.sub}</span>
            </div>
            {!link.url && <span className="profile-link-soon">Coming soon</span>}
          </a>
        ))}
      </div>
      </aside>
      </div>
    </section>
  )
}

export default Profile
