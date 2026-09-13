// app/page.tsx (節錄核心邏輯)
'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import OrderForm from '@/components/OrderForm'
import OrderTable from '@/components/OrderTable'

export default function Home() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [settings, setSettings] = useState({ announcement: '', is_locked: false })

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(profileData)
      }
      
      const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 1).single()
      if (settingsData) setSettings(settingsData)
    }
    fetchUser()
  }, [])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button onClick={handleGoogleLogin} className="bg-blue-500 text-white p-3 rounded">使用 Google 帳號登入</button>
      </div>
    )
  }

  return (
    <main className="container mx-auto p-4">
      <div className="bg-yellow-100 p-4 mb-4 rounded text-yellow-800">
        📢 公告：{settings.announcement}
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <p>目前登入：{user.email}</p>
          <p className="font-bold">您的餘額：{profile?.balance} 元</p>
          {profile?.balance < 85 && <p className="text-red-500">餘額不足扣款一次，請找管理員加值！</p>}
          {profile?.balance >= 85 && profile?.balance < 170 && <p className="text-orange-500">提醒：您的存款即將不足扣兩次囉！</p>}
        </div>
      </div>

      {settings.is_locked ? (
        <div className="bg-red-200 text-red-800 p-4 text-center font-bold rounded">
          訂單已送出，無法繼續點餐
        </div>
      ) : (
        <OrderForm userId={user.id} />
      )}

      {/* 傳遞 userId 給 OrderTable，用來隱藏非本人的刪除/修改按鈕 */}
      <OrderTable currentUserId={user.id} /> 
    </main>
  )
}