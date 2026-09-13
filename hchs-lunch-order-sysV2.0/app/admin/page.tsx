// app/admin/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const [announcement, setAnnouncement] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: set } = await supabase.from('settings').select('*').eq('id', 1).single()
    if (set) setAnnouncement(set.announcement)
    
    const { data: o } = await supabase.from('orders').select('*')
    if (o) setOrders(o)

    const { data: p } = await supabase.from('profiles').select('*')
    if (p) setProfiles(p)
  }

  const updateAnnouncement = async () => {
    await supabase.from('settings').update({ announcement }).eq('id', 1)
    alert('公告已更新')
  }

  const submitOrder = async () => {
    // 1. 鎖定主畫面
    await supabase.from('settings').update({ is_locked: true }).eq('id', 1)

    // 2. 每個有點餐的座號帳號扣除 85 元
    const uniqueSeats = Array.from(new Set(orders.map(o => o.seat_number)))
    for (const seat of uniqueSeats) {
       await supabase.rpc('deduct_balance', { target_seat_number: seat, amount: 85 })
    }

    // 3. 計算總數並複製到剪貼簿 (格式: 117 wA xB yC zD)
    let counts = { A: 0, B: 0, C: 0, D: 0 }
    orders.forEach(o => {
        if(o.type === 'A') counts.A += o.quantity
        if(o.type === 'B') counts.B += o.quantity
        if(o.type === 'C') counts.C += o.quantity
        if(o.type === 'D') counts.D += o.quantity
    })
    
    let copyText = '117'
    if(counts.A > 0) copyText += ` ${counts.A}A`
    if(counts.B > 0) copyText += ` ${counts.B}B`
    if(counts.C > 0) copyText += ` ${counts.C}C`
    if(counts.D > 0) copyText += ` ${counts.D}D`
    await navigator.clipboard.writeText(copyText)

    // 4. 匯出餘額 .txt 檔
    // 需重新抓取最新餘額
    const { data: latestProfiles } = await supabase.from('profiles').select('*')
    let txtContent = ''
    latestProfiles?.forEach(p => {
      txtContent += `${p.email} ${p.balance}\n`
    })
    
    const blob = new Blob([txtContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }).replace(/\//g, '')
    link.href = url
    link.download = `${today}.txt`
    link.click()

    alert('訂單送出完成：已鎖定、扣款、複製剪貼簿並下載餘額檔。')
  }

  // 格式化台北時間的工具
  const formatTaipeiTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">系統管理員後台</h1>
      
      <div className="mb-8 border p-4">
        <h2 className="text-xl mb-2">修改公告</h2>
        <input className="border p-2 w-full mb-2" value={announcement} onChange={e => setAnnouncement(e.target.value)} />
        <button onClick={updateAnnouncement} className="bg-blue-500 text-white p-2 rounded">更新公告</button>
      </div>

      <div className="mb-8 border p-4 bg-red-50">
        <h2 className="text-xl mb-2 text-red-700 font-bold">每日結單操作</h2>
        <button onClick={submitOrder} className="bg-red-600 text-white px-6 py-3 rounded font-bold shadow hover:bg-red-700">
          送出訂單 (鎖定、扣款、複製與下載)
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl mb-2">訂單列表 (台北時間)</h2>
        <table className="w-full text-left">
          <thead><tr><th>座號</th><th>餐點</th><th>數量</th><th>時間</th><th>操作</th></tr></thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.seat_number}</td>
                <td>{order.type}</td>
                <td>{order.quantity}</td>
                <td>{formatTaipeiTime(order.created_at)}</td>
                <td>
                  <button className="text-red-500">刪除(管理員任意刪)</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}