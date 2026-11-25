'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function DaftarTrip() {
  const [trips, setTrips] = useState<any[]>([])

  useEffect(() => {
    async function getTrips() {
      const { data, error } = await supabase.from('trips').select('*').order('tanggal')
      if (error) {
        console.error("Error ambil data:", error)
      } else {
        console.log("Data berhasil diambil:", data)
        setTrips(data || [])
      }
    }
    getTrips()
  }, [])

  return (
    <main className="max-w-md mx-auto p-4 mt-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Pilih Perjalanan</h1>
      {trips.length === 0 && <p className="text-center text-gray-500">Memuat data atau data kosong...</p>}
      {trips.map(t => (
        <Link key={t.id} href={`/pesan/${t.id}`}
          className="block border rounded-lg p-4 mb-3 shadow-sm hover:bg-blue-50 transition">
          <p className="font-semibold text-lg">{t.nama}</p>
          <p className="text-sm text-gray-600">{t.rute} · {t.tanggal}</p>
        </Link>
      ))}
    </main>
  )
}