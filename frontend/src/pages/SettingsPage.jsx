import { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import api from '../service/api'
import toast from 'react-hot-toast'

// ── OUTSIDE component — prevents remount on every keystroke ──
function Section({ title, desc, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
      <div className="mb-5 pb-4 border-b border-gray-50">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  )
}

function InputField({ label, type, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type || 'text'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  )
}

// ── Main component ──
function SettingsPage() {
  const { user } = useContext(AuthContext)

  const [nameForm, setNameForm] = useState({ name: user?.name || '' })
  const [savingName, setSavingName] = useState(false)

  const [passForm, setPassForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [savingPass, setSavingPass] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  // Curried handler — updates one field, no remount
  const handlePassChange = (field) => (e) =>
    setPassForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleNameUpdate = async (e) => {
    e.preventDefault()
    if (!nameForm.name.trim()) { toast.error('Name cannot be empty'); return }
    setSavingName(true)
    try {
      // Uncomment when backend /api/auth/update-profile is ready:
      // await api.put('/api/auth/update-profile', { name: nameForm.name })
      toast.success('Name updated!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed')
    } finally {
      setSavingName(false)
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()

    // Validation
    if (!passForm.current_password) {
      toast.error('Enter your current password'); return
    }
    if (passForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters'); return
    }
    if (passForm.new_password !== passForm.confirm_password) {
      toast.error('New passwords do not match'); return
    }
    if (passForm.current_password === passForm.new_password) {
      toast.error('New password must differ from current'); return
    }

    setSavingPass(true)
    try {
      // Exact field names the FastAPI backend expects
      await api.put('/api/auth/change-password', {
        current_password: passForm.current_password,
        new_password: passForm.new_password,
      })
      toast.success('Password updated!')
      setPassForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Password update failed')
    } finally {
      setSavingPass(false)
    }
  }

  const strengthLevel = passForm.new_password.length
  const strengthLabel = strengthLevel === 0 ? '' : strengthLevel < 6 ? 'Too short' : strengthLevel < 8 ? 'Weak' : strengthLevel < 12 ? 'Good' : 'Strong'
  const strengthColor = strengthLevel < 6 ? 'bg-red-400' : strengthLevel < 8 ? 'bg-amber-400' : strengthLevel < 12 ? 'bg-blue-400' : 'bg-green-400'

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <Section title="Profile" desc="Update your display name">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full mt-1 inline-block capitalize">
              {user?.role}
            </span>
          </div>
        </div>
        <form onSubmit={handleNameUpdate} className="space-y-4">
          <InputField
            label="Display Name"
            value={nameForm.name}
            onChange={(e) => setNameForm({ name: e.target.value })}
            placeholder="Your full name"
          />
          <button type="submit" disabled={savingName}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
            {savingName ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Section>

      {/* Password */}
      <Section title="Change Password" desc="Minimum 6 characters">
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <InputField
            label="Current Password"
            type={showPasswords ? 'text' : 'password'}
            value={passForm.current_password}
            onChange={handlePassChange('current_password')}
            placeholder="Enter current password"
          />
          <InputField
            label="New Password"
            type={showPasswords ? 'text' : 'password'}
            value={passForm.new_password}
            onChange={handlePassChange('new_password')}
            placeholder="Min 6 characters"
          />

          {/* Strength bar */}
          {passForm.new_password.length > 0 && (
            <div>
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                    passForm.new_password.length >= i * 3 ? strengthColor : 'bg-gray-200'
                  }`}/>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{strengthLabel}</p>
            </div>
          )}

          <InputField
            label="Confirm New Password"
            type={showPasswords ? 'text' : 'password'}
            value={passForm.confirm_password}
            onChange={handlePassChange('confirm_password')}
            placeholder="Repeat new password"
          />

          {/* Match status */}
          {passForm.confirm_password && (
            <p className={`text-xs font-medium ${
              passForm.new_password === passForm.confirm_password
                ? 'text-green-500' : 'text-red-400'
            }`}>
              {passForm.new_password === passForm.confirm_password ? '✓ Passwords match' : '✗ Does not match'}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={savingPass}
              className="px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
              {savingPass ? 'Updating...' : 'Update Password'}
            </button>
            <button type="button" onClick={() => setShowPasswords(p => !p)}
              className="text-sm text-gray-400 hover:text-gray-600">
              {showPasswords ? 'Hide' : 'Show'}
            </button>
          </div>
        </form>
      </Section>

      {/* Danger */}
      <Section title="Danger Zone" desc="Irreversible actions">
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
          <div>
            <p className="text-sm font-medium text-red-800">Delete Account</p>
            <p className="text-xs text-red-400 mt-0.5">Permanently removes your account</p>
          </div>
          <button onClick={() => toast.error('Coming in Phase 6')}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-100">
            Delete
          </button>
        </div>
      </Section>
    </div>
  )
}

export default SettingsPage