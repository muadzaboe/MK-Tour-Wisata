'use client'
import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// 1. Komponen di dalam yang menggunakan useParams
function ManifestContent() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [data, setData] = useState([])

  async function load() {
    const { data: t } = await supabase.from('trips').select('*').eq('id', tripId).single()
    setTrip(t)
    const { data: b } = await supabase.from('bookings').select('*').eq('trip_id', tripId).order('nomor_kursi')
    setData(b || [])
  }

  useEffect(() => {
    load()
    const ch = supabase.channel('manifest-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `trip_id=eq.${tripId}` }, () => load()).subscribe()
    return () => supabase.removeChannel(ch)
  }, [tripId])

  async function toggle(row) {
    const baru = row.status === 'checked_in' ? 'booked' : 'checked_in'
    await supabase.from('bookings').update({ status: baru }).eq('id', row.id)
    load()
  }

  if (!trip) return <p className="p-6">Memuat...</p>

  return (
    <main className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h1 className="text-xl font-bold">Manifest — {trip.nama}</h1>
        <button onClick={() => window.print()} className="bg-black text-white px-3 py-1 rounded">Cetak</button>
      </div>
      <p className="text-sm text-gray-600 mb-3">{trip.rute} · {trip.tanggal}</p>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-1">Kursi</th>
            <th className="border p-1 text-left">Nama</th>
            <th className="border p-1">HP</th>
            <th className="border p-1">Hadir</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.id} className={r.status === 'checked_in' ? 'bg-green-50' : ''}>
              <td className="border p-1 text-center">{r.nomor_kursi}</td>
              <td className="border p-1">{r.nama_penumpang}</td>
              <td className="border p-1">{r.no_hp}</td>
              <td className="border p-1 text-center">
                <input type="checkbox" checked={r.status === 'checked_in'} onChange={() => toggle(r)} className="w-5 h-5 print:hidden" />
                <span className="hidden print:inline">{r.status === 'checked_in' ? '✓' : ''}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-sm">Total: {data.length} penumpang</p>
    </main>
  )
}

// 2. Komponen utama yang membungkus dengan Suspense
export default function ManifestPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center">Memuat manifest...</p>}>
      <ManifestContent />
    </Suspense>
  )
}